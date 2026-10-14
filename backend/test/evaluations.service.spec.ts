import { Test, TestingModule } from '@nestjs/testing';
import { EvaluationsService } from '../src/modules/evaluations/evaluations.service';
import { DatasetsService } from '../src/modules/datasets/datasets.service';
import { AiPlatformClient } from '../src/modules/integrations/ai-platform.client';
import { ModelRegressionClient } from '../src/modules/integrations/model-regression.client';
import { NotificationClient } from '../src/modules/integrations/notification.client';

describe('EvaluationsService', () => {
  let service: EvaluationsService;
  let datasetsService: DatasetsService;

  const mockAiPlatformClient = {
    isConfigured: jest.fn().mockReturnValue(true),
    queryRag: jest.fn().mockResolvedValue({
      contextText:
        'Credit card refunds are processed within 3 to 5 business days.',
      citations: [
        {
          documentId: 'doc-refund-policy-v2',
          chunkId: 'doc-refund-policy-v2#chunk-01',
          score: 0.95,
        },
      ],
      chunks: [
        {
          chunkId: 'doc-refund-policy-v2#chunk-01',
          documentId: 'doc-refund-policy-v2',
          source: 'docs/billing/refunds.md',
          title: 'Customer Refund & Cancellation Terms (v2.1)',
          text: 'Credit card refunds are processed within 3 to 5 business days following formal authorization.',
          score: 0.95,
        },
      ],
      totalRetrieved: 1,
      source: 'AI_PLATFORM',
    }),
    evaluateWithJudge: jest.fn().mockResolvedValue({
      groundedness: 0.95,
      answerRelevance: 0.92,
      generatedAnswer:
        'Credit card refunds are processed within 3 to 5 business days.',
      method: 'LLM_JUDGE_AI_PLATFORM',
    }),
  };

  const mockRegressionClient = {
    compareRuns: jest.fn().mockResolvedValue({
      status: 'PASS',
      summary: 'Candidate performance within tolerances.',
      deltas: {},
      source: 'LOCAL_DETERMINISTIC_ENGINE',
    }),
  };

  const mockNotificationClient = {
    sendAlert: jest.fn().mockResolvedValue({ sent: true }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvaluationsService,
        DatasetsService,
        { provide: AiPlatformClient, useValue: mockAiPlatformClient },
        { provide: ModelRegressionClient, useValue: mockRegressionClient },
        { provide: NotificationClient, useValue: mockNotificationClient },
      ],
    }).compile();

    service = module.get<EvaluationsService>(EvaluationsService);
    datasetsService = module.get<DatasetsService>(DatasetsService);
  });

  it('should execute evaluation run and compute both retrieval and generation metrics', async () => {
    const dataset = await datasetsService.create('tenant-test', {
      name: 'Test Evaluation Benchmark',
      description: 'Testing evaluation suite execution',
      isSynthetic: true,
      testCases: [
        {
          caseId: 'tc_1',
          query: 'What is the refund turnaround time?',
          expectedAnswer:
            'Credit card refunds are processed within 3 to 5 business days.',
          relevantDocumentIds: ['doc-refund-policy-v2'],
          relevantChunkIds: ['doc-refund-policy-v2#chunk-01'],
          hasRelevanceLabels: true,
        },
      ],
    });

    const run = await service.runSuite('tenant-test', {
      datasetId: dataset.datasetId,
      candidateLabel: 'Candidate Run v1',
      retrievalMethod: 'HYBRID',
      topK: 5,
      minScore: 0.5,
    });

    expect(run).toBeDefined();
    expect(run.status).toBe('COMPLETED');
    expect(run.caseResults.length).toBe(1);
    expect(run.caseResults[0].status).toBe('PASS');
    expect(run.summaryMetrics.retrieval.recallAtK).toBe(1.0);
    expect(
      run.summaryMetrics.generation.groundednessScore,
    ).toBeGreaterThanOrEqual(0.9);
  });

  it('should mark case status as EMPTY_RETRIEVAL when no chunks pass threshold', async () => {
    mockAiPlatformClient.queryRag.mockResolvedValueOnce({
      contextText: '',
      citations: [],
      chunks: [],
      totalRetrieved: 0,
      source: 'AI_PLATFORM',
    });

    const dataset = await datasetsService.create('tenant-test', {
      name: 'Empty Test Benchmark',
      description: 'Testing empty retrieval state',
      isSynthetic: true,
      testCases: [
        {
          caseId: 'tc_empty',
          query: 'Unindexed question with no matches in corpus?',
          expectedAnswer: 'Unknown answer',
          hasRelevanceLabels: true,
        },
      ],
    });

    const run = await service.runSuite('tenant-test', {
      datasetId: dataset.datasetId,
      candidateLabel: 'Candidate Empty Check',
    });

    expect(run.caseResults[0].status).toBe('EMPTY_RETRIEVAL');
    expect(run.summaryMetrics.counts.emptyRetrieval).toBe(1);
  });
});
