import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  EvaluationRun,
  CaseResult,
  CaseEvaluationStatus,
  RetrievalMetrics,
  RetrievedChunk,
} from '../../common/types';
import { DatasetsService } from '../datasets/datasets.service';
import { AiPlatformClient } from '../integrations/ai-platform.client';
import { ModelRegressionClient } from '../integrations/model-regression.client';
import { NotificationClient } from '../integrations/notification.client';
import { MetricsCalculator } from '../../common/utils/metrics-calculator';
import { RunEvaluationDto } from './dto/run-evaluation.dto';

@Injectable()
export class EvaluationsService {
  private readonly logger = new Logger(EvaluationsService.name);
  private readonly runs: Map<string, EvaluationRun> = new Map();

  constructor(
    private readonly datasetsService: DatasetsService,
    private readonly aiPlatformClient: AiPlatformClient,
    private readonly modelRegressionClient: ModelRegressionClient,
    private readonly notificationClient: NotificationClient,
  ) {}

  async findAll(tenantId: string): Promise<EvaluationRun[]> {
    return Array.from(this.runs.values())
      .filter((r) => r.tenantId === tenantId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  async findOne(tenantId: string, runId: string): Promise<EvaluationRun> {
    const run = this.runs.get(runId);
    if (!run || run.tenantId !== tenantId) {
      throw new NotFoundException(
        `Evaluation run "${runId}" not found for tenant "${tenantId}".`,
      );
    }
    return run;
  }

  async runSuite(
    tenantId: string,
    dto: RunEvaluationDto,
  ): Promise<EvaluationRun> {
    const dataset = await this.datasetsService.findOne(tenantId, dto.datasetId);
    const runId = `run_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const now = new Date().toISOString();

    this.logger.log(
      `Starting evaluation run ${runId} for dataset "${dataset.name}" (${dataset.testCases.length} cases)`,
    );

    const caseResults: CaseResult[] = [];
    const topK = dto.topK || 5;
    const minScore = dto.minScore || 0.5;

    let totalPassed = 0;
    let totalFailed = 0;
    let totalInsufficient = 0;
    let totalEmpty = 0;
    let totalErrors = 0;

    let executionModeUsed:
      'SHARED_AI_PLATFORM' | 'LOCAL_DETERMINISTIC_ADAPTER' =
      'LOCAL_DETERMINISTIC_ADAPTER';

    for (const testCase of dataset.testCases) {
      const caseStart = Date.now();
      try {
        // 1. Retrieval execution
        const retrieval = await this.aiPlatformClient.queryRag({
          tenantId,
          query: testCase.query,
          topK,
          minScore,
        });

        if (retrieval.source === 'AI_PLATFORM') {
          executionModeUsed = 'SHARED_AI_PLATFORM';
        }

        // 2. Mark retrieved chunks for ground-truth match if labels exist
        const labeledRelevantSet = new Set(
          (testCase.relevantChunkIds || testCase.relevantDocumentIds || []).map(
            (id) => id.trim().toLowerCase(),
          ),
        );

        const markedChunks: RetrievedChunk[] = retrieval.chunks.map((chunk) => {
          const match =
            labeledRelevantSet.has(
              (chunk.chunkId || '').trim().toLowerCase(),
            ) ||
            labeledRelevantSet.has(
              (chunk.documentId || '').trim().toLowerCase(),
            );
          return {
            ...chunk,
            isRelevantGroundTruth: match,
          };
        });

        // 3. Retrieval metrics calculation (strictly guarded!)
        const retrievalMetrics = MetricsCalculator.calculateRetrievalMetrics(
          testCase,
          markedChunks,
          topK,
        );

        // 4. Generation & evaluation judge
        const judge = await this.aiPlatformClient.evaluateWithJudge({
          tenantId,
          question: testCase.query,
          expectedAnswer: testCase.expectedAnswer,
        });

        const generationMetrics = MetricsCalculator.buildGenerationMetrics(
          testCase,
          judge.generatedAnswer,
          markedChunks,
          retrieval.citations,
          judge.method === 'LLM_JUDGE_AI_PLATFORM'
            ? {
                groundedness: judge.groundedness,
                answerRelevance: judge.answerRelevance,
              }
            : undefined,
        );

        // 5. Determine distinct status
        let caseStatus: CaseEvaluationStatus = 'PASS';
        let failureReason: string | null = null;

        if (markedChunks.length === 0) {
          caseStatus = 'EMPTY_RETRIEVAL';
          failureReason = 'No chunks retrieved above similarity threshold';
          totalEmpty += 1;
        } else if (generationMetrics.groundednessScore < 0.35) {
          caseStatus = 'INSUFFICIENT_EVIDENCE';
          failureReason =
            'Retrieved context does not contain sufficient grounded evidence for expected answer';
          totalInsufficient += 1;
        } else if (
          retrievalMetrics.labelsAvailable &&
          retrievalMetrics.recallAtK !== null &&
          retrievalMetrics.recallAtK === 0
        ) {
          caseStatus = 'FAIL';
          failureReason = 'Zero relevant ground-truth chunks retrieved in topK';
          totalFailed += 1;
        } else if (generationMetrics.answerRelevanceScore < 0.5) {
          caseStatus = 'FAIL';
          failureReason =
            'Generated answer deviates substantially from expected answer';
          totalFailed += 1;
        } else {
          caseStatus = 'PASS';
          totalPassed += 1;
        }

        const latencyMs = Date.now() - caseStart;

        caseResults.push({
          caseId: testCase.caseId,
          query: testCase.query,
          expectedAnswer: testCase.expectedAnswer,
          generatedAnswer: judge.generatedAnswer,
          retrievedChunks: markedChunks,
          citations: retrieval.citations,
          status: caseStatus,
          metrics: {
            retrieval: retrievalMetrics,
            generation: generationMetrics,
          },
          latencyMs,
          failureReason,
        });
      } catch (err: any) {
        this.logger.error(
          `Error evaluating test case ${testCase.caseId}: ${err.message}`,
        );
        totalErrors += 1;
        caseResults.push({
          caseId: testCase.caseId,
          query: testCase.query,
          expectedAnswer: testCase.expectedAnswer,
          generatedAnswer: null,
          retrievedChunks: [],
          citations: [],
          status: 'ERROR',
          metrics: {
            retrieval: {
              recallAtK: null,
              precisionAtK: null,
              mrr: null,
              ndcgAtK: null,
              labelsAvailable: false,
              labelsNote: 'Case execution failed due to an error',
            },
            generation: {
              citationCoverage: 0,
              groundednessScore: 0,
              answerRelevanceScore: 0,
              evaluationMethod: 'HEURISTIC_OVERLAP',
            },
          },
          latencyMs: Date.now() - caseStart,
          failureReason: `Execution error: ${err.message}`,
        });
      }
    }

    // Calculate aggregated metrics
    const summaryRetrieval = this.aggregateRetrievalMetrics(caseResults);
    const summaryGeneration = this.aggregateGenerationMetrics(caseResults);

    const latencies = caseResults.map((c) => c.latencyMs).sort((a, b) => a - b);
    const averageMs =
      latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0;
    const p95Idx = Math.floor(latencies.length * 0.95);
    const p95Ms = latencies[p95Idx] || averageMs;

    // Build baseline or comparison
    let baselineRun: EvaluationRun | null = null;
    if (dto.baselineRunId) {
      try {
        baselineRun = await this.findOne(tenantId, dto.baselineRunId);
      } catch {
        this.logger.warn(
          `Baseline run ${dto.baselineRunId} not found for regression comparison`,
        );
      }
    }

    const evaluationRun: EvaluationRun = {
      runId,
      name: `${dataset.name} — ${dto.candidateLabel}`,
      tenantId,
      datasetId: dataset.datasetId,
      datasetVersion: dataset.version,
      datasetSnapshotHash: dataset.snapshotHash,
      isBaseline: !!dto.setAsBaseline,
      baselineRunId: dto.baselineRunId,
      configuration: {
        candidateLabel: dto.candidateLabel,
        retrievalMethod: dto.retrievalMethod || 'HYBRID',
        topK,
        minScore,
        chunkingStrategy: 'semantic_512_overlap_64',
        embeddingModel: 'text-embedding-004',
      },
      executionMode: executionModeUsed,
      status:
        totalErrors > 0 && totalPassed === 0
          ? 'FAILED'
          : totalErrors > 0
            ? 'PARTIAL'
            : 'COMPLETED',
      summaryMetrics: {
        retrieval: summaryRetrieval,
        generation: summaryGeneration,
        latency: {
          averageMs,
          p95Ms,
        },
        counts: {
          total: caseResults.length,
          passed: totalPassed,
          failed: totalFailed,
          insufficientEvidence: totalInsufficient,
          emptyRetrieval: totalEmpty,
          errors: totalErrors,
        },
      },
      caseResults,
      createdAt: now,
      completedAt: new Date().toISOString(),
    };

    // Regression check against baseline if provided
    if (baselineRun) {
      const regressionDecision = await this.modelRegressionClient.compareRuns(
        evaluationRun,
        baselineRun,
      );

      evaluationRun.regressionCheck = {
        status: regressionDecision.status,
        summary: regressionDecision.summary,
        deltas: regressionDecision.deltas,
      };

      if (regressionDecision.status === 'FAIL') {
        await this.notificationClient.sendAlert(
          `RAG Regression Detected in Run ${runId}`,
          `Evaluation run "${evaluationRun.name}" regressed against baseline "${baselineRun.name}". ${regressionDecision.summary}`,
          'CRITICAL',
          {
            runId,
            candidate: evaluationRun.runId,
            baseline: baselineRun.runId,
          },
        );
      }
    }

    this.runs.set(runId, evaluationRun);
    return evaluationRun;
  }

  seedRun(run: EvaluationRun): void {
    this.runs.set(run.runId, run);
  }

  private aggregateRetrievalMetrics(results: CaseResult[]): RetrievalMetrics {
    const labeledCases = results.filter(
      (c) => c.metrics.retrieval.labelsAvailable,
    );
    if (labeledCases.length === 0) {
      return {
        recallAtK: null,
        precisionAtK: null,
        mrr: null,
        ndcgAtK: null,
        labelsAvailable: false,
        labelsNote:
          'None of the test cases in this run provided chunk/document ground truth relevance labels.',
      };
    }

    const avg = (fn: (c: CaseResult) => number | null): number => {
      const vals = labeledCases.map(fn).filter((v): v is number => v !== null);
      if (vals.length === 0) return 0;
      const sum = vals.reduce((a, b) => a + b, 0);
      return Math.round((sum / vals.length) * 10000) / 10000;
    };

    return {
      recallAtK: avg((c) => c.metrics.retrieval.recallAtK),
      precisionAtK: avg((c) => c.metrics.retrieval.precisionAtK),
      mrr: avg((c) => c.metrics.retrieval.mrr),
      ndcgAtK: avg((c) => c.metrics.retrieval.ndcgAtK),
      labelsAvailable: true,
    };
  }

  private aggregateGenerationMetrics(results: CaseResult[]) {
    if (results.length === 0) {
      return {
        citationCoverage: 0,
        groundednessScore: 0,
        answerRelevanceScore: 0,
      };
    }

    const avg = (fn: (c: CaseResult) => number): number => {
      const sum = results.reduce((acc, c) => acc + fn(c), 0);
      return Math.round((sum / results.length) * 10000) / 10000;
    };

    return {
      citationCoverage: avg((c) => c.metrics.generation.citationCoverage),
      groundednessScore: avg((c) => c.metrics.generation.groundednessScore),
      answerRelevanceScore: avg(
        (c) => c.metrics.generation.answerRelevanceScore,
      ),
    };
  }
}
