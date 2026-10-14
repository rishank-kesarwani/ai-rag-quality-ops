import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { EvaluationRun } from '../../common/types';

export interface RegressionCheckResult {
  status: 'PASS' | 'WARN' | 'FAIL' | 'SKIPPED';
  runId?: string;
  summary: string;
  deltas: Record<
    string,
    {
      candidate: number | null;
      baseline: number | null;
      delta: number | null;
      pass: boolean;
    }
  >;
  source: 'MODEL_REGRESSION_SERVICE' | 'LOCAL_DETERMINISTIC_ENGINE';
}

@Injectable()
export class ModelRegressionClient {
  private readonly logger = new Logger(ModelRegressionClient.name);
  private readonly client: AxiosInstance;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService
      .get<string>('modelRegression.url', '')
      .replace(/\/$/, '');
    this.apiKey = this.configService.get<string>('modelRegression.apiKey', '');
    this.timeoutMs = this.configService.get<number>(
      'modelRegression.timeoutMs',
      8000,
    );

    this.client = axios.create({
      baseURL: this.baseUrl || 'http://localhost:4002',
      timeout: this.timeoutMs,
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { 'x-api-key': this.apiKey } : {}),
      },
    });
  }

  isConfigured(): boolean {
    return !!this.baseUrl;
  }

  async checkHealth(): Promise<{
    status: string;
    latencyMs: number;
    error?: string;
  }> {
    if (!this.baseUrl) {
      return { status: 'UNCONFIGURED', latencyMs: 0 };
    }
    const start = Date.now();
    try {
      const res = await this.client.get('/health', { timeout: 3000 });
      return {
        status: res.status === 200 ? 'UP' : 'DEGRADED',
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        status: 'DOWN',
        latencyMs: Date.now() - start,
        error: err.message,
      };
    }
  }

  /**
   * Evaluates if candidate evaluation run has regressed compared to the baseline.
   * Leverages shared Model Regression Detection service if configured, or deterministic engine locally.
   */
  async compareRuns(
    candidate: EvaluationRun,
    baseline: EvaluationRun | null,
  ): Promise<RegressionCheckResult> {
    if (!baseline) {
      return {
        status: 'SKIPPED',
        summary: 'No historical baseline run provided for comparison.',
        deltas: {},
        source: 'LOCAL_DETERMINISTIC_ENGINE',
      };
    }

    if (this.baseUrl) {
      try {
        this.logger.log(
          `Invoking shared Model Regression Detection service for run ${candidate.runId} vs ${baseline.runId}`,
        );

        const res = await this.client.post('/api/v1/regression/check', {
          project: 'ai-rag-quality-ops',
          version: candidate.datasetVersion,
          datasetId: candidate.datasetId,
          model: candidate.configuration.embeddingModel || 'hybrid-retrieval',
          baselineId: baseline.runId,
          metrics: [
            'recall_at_k',
            'precision_at_k',
            'groundedness',
            'citation_coverage',
          ],
        });

        const data = res.data?.data || res.data;
        if (data && data.status) {
          return {
            status: data.status,
            runId: data.runId,
            summary: `Shared Regression Service decision: ${data.status} (${data.summary?.passed ?? 0} passed, ${data.summary?.failed ?? 0} failed)`,
            deltas: this.computeDeltas(candidate, baseline),
            source: 'MODEL_REGRESSION_SERVICE',
          };
        }
      } catch (err: any) {
        this.logger.warn(
          `Shared Model Regression check failed (${err.message}). Using local deterministic regression comparator.`,
        );
      }
    }

    return this.evaluateLocalRegression(candidate, baseline);
  }

  /**
   * Deterministic regression evaluator:
   * Flags regressions if key retrieval or groundedness metrics drop by more than 5%.
   */
  private evaluateLocalRegression(
    candidate: EvaluationRun,
    baseline: EvaluationRun,
  ): RegressionCheckResult {
    const deltas = this.computeDeltas(candidate, baseline);
    let failedCount = 0;
    let warningCount = 0;

    for (const item of Object.values(deltas)) {
      if (item.delta !== null && item.delta < -0.05) {
        failedCount += 1;
        item.pass = false;
      } else if (item.delta !== null && item.delta < -0.02) {
        warningCount += 1;
      }
    }

    let status: 'PASS' | 'WARN' | 'FAIL' = 'PASS';
    if (failedCount > 0) {
      status = 'FAIL';
    } else if (warningCount > 0) {
      status = 'WARN';
    }

    return {
      status,
      summary: `Local Regression Decision: ${status}. ${failedCount} critical metric regressions detected against baseline ${baseline.runId}.`,
      deltas,
      source: 'LOCAL_DETERMINISTIC_ENGINE',
    };
  }

  private computeDeltas(
    candidate: EvaluationRun,
    baseline: EvaluationRun,
  ): Record<
    string,
    {
      candidate: number | null;
      baseline: number | null;
      delta: number | null;
      pass: boolean;
    }
  > {
    const metrics: Array<{
      key: string;
      cVal: number | null;
      bVal: number | null;
    }> = [
      {
        key: 'recallAtK',
        cVal: candidate.summaryMetrics.retrieval.recallAtK,
        bVal: baseline.summaryMetrics.retrieval.recallAtK,
      },
      {
        key: 'precisionAtK',
        cVal: candidate.summaryMetrics.retrieval.precisionAtK,
        bVal: baseline.summaryMetrics.retrieval.precisionAtK,
      },
      {
        key: 'mrr',
        cVal: candidate.summaryMetrics.retrieval.mrr,
        bVal: baseline.summaryMetrics.retrieval.mrr,
      },
      {
        key: 'groundednessScore',
        cVal: candidate.summaryMetrics.generation.groundednessScore,
        bVal: baseline.summaryMetrics.generation.groundednessScore,
      },
      {
        key: 'citationCoverage',
        cVal: candidate.summaryMetrics.generation.citationCoverage,
        bVal: baseline.summaryMetrics.generation.citationCoverage,
      },
    ];

    const deltas: Record<
      string,
      {
        candidate: number | null;
        baseline: number | null;
        delta: number | null;
        pass: boolean;
      }
    > = {};

    for (const m of metrics) {
      if (m.cVal !== null && m.bVal !== null) {
        const delta = Math.round((m.cVal - m.bVal) * 10000) / 10000;
        deltas[m.key] = {
          candidate: m.cVal,
          baseline: m.bVal,
          delta,
          pass: delta >= -0.05,
        };
      } else {
        deltas[m.key] = {
          candidate: m.cVal,
          baseline: m.bVal,
          delta: null,
          pass: true,
        };
      }
    }

    return deltas;
  }
}
