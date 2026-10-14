import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiPlatformClient } from '../src/modules/integrations/ai-platform.client';
import { ModelRegressionClient } from '../src/modules/integrations/model-regression.client';
import { NotificationClient } from '../src/modules/integrations/notification.client';
import { EvaluationRun } from '../src/common/types';

describe('Integrations & Timeout Resilience', () => {
  let aiPlatformClient: AiPlatformClient;
  let regressionClient: ModelRegressionClient;
  let notificationClient: NotificationClient;

  const mockConfigService = {
    get: jest.fn((key: string, defaultVal: any) => {
      if (key === 'aiPlatform.url') return ''; // unconfigured to test deterministic fallback
      if (key === 'aiPlatform.timeoutMs') return 2000;
      if (key === 'modelRegression.url') return '';
      if (key === 'modelRegression.timeoutMs') return 2000;
      if (key === 'notificationService.url') return '';
      if (key === 'notificationService.timeoutMs') return 2000;
      return defaultVal;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiPlatformClient,
        ModelRegressionClient,
        NotificationClient,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    aiPlatformClient = module.get<AiPlatformClient>(AiPlatformClient);
    regressionClient = module.get<ModelRegressionClient>(ModelRegressionClient);
    notificationClient = module.get<NotificationClient>(NotificationClient);
  });

  it('should fall back to deterministic simulated retrieval chunks with proper labeling when AI platform is offline', async () => {
    const res = await aiPlatformClient.queryRag({
      tenantId: 'tenant-default',
      query: 'What is the refund turnaround time?',
      topK: 3,
      minScore: 0.5,
    });

    expect(res).toBeDefined();
    expect(res.source).toBe('LOCAL_DETERMINISTIC_ADAPTER');
    expect(res.chunks.length).toBeGreaterThan(0);
    expect(res.citations.length).toBeGreaterThan(0);
    expect(res.contextText).toContain('refund');
  });

  it('should evaluate regression delta locally when shared model regression service is offline', async () => {
    const baselineRun: EvaluationRun = {
      runId: 'b_1',
      name: 'Baseline Run',
      tenantId: 'tenant-default',
      datasetId: 'ds_1',
      datasetVersion: '1.0.0',
      datasetSnapshotHash: 'hash1',
      isBaseline: true,
      configuration: {
        candidateLabel: 'Baseline',
        retrievalMethod: 'DENSE',
        topK: 5,
        minScore: 0.5,
      },
      executionMode: 'LOCAL_DETERMINISTIC_ADAPTER',
      status: 'COMPLETED',
      summaryMetrics: {
        retrieval: {
          recallAtK: 0.95,
          precisionAtK: 0.8,
          mrr: 0.9,
          ndcgAtK: 0.92,
          labelsAvailable: true,
        },
        generation: {
          citationCoverage: 0.9,
          groundednessScore: 0.88,
          answerRelevanceScore: 0.85,
        },
        latency: { averageMs: 120, p95Ms: 150 },
        counts: {
          total: 10,
          passed: 9,
          failed: 1,
          insufficientEvidence: 0,
          emptyRetrieval: 0,
          errors: 0,
        },
      },
      caseResults: [],
      createdAt: new Date().toISOString(),
    };

    const regressedCandidate: EvaluationRun = {
      ...baselineRun,
      runId: 'c_regressed',
      summaryMetrics: {
        ...baselineRun.summaryMetrics,
        retrieval: {
          ...baselineRun.summaryMetrics.retrieval,
          recallAtK: 0.7, // Dropped 25% > 5% threshold
        },
      },
    };

    const decision = await regressionClient.compareRuns(
      regressedCandidate,
      baselineRun,
    );

    expect(decision).toBeDefined();
    expect(decision.status).toBe('FAIL');
    expect(decision.source).toBe('LOCAL_DETERMINISTIC_ENGINE');
    expect(decision.deltas.recallAtK.pass).toBe(false);
    expect(decision.deltas.recallAtK.delta).toBeCloseTo(-0.25, 2);
  });

  it('should safely catch notification errors and not crash server when notification service is unreachable', async () => {
    const res = await notificationClient.sendAlert(
      'Test Alert',
      'This is a test alert message',
      'BULK',
    );

    expect(res).toBeDefined();
    expect(res.sent).toBe(true); // Handled gracefully in mock mode
  });
});
