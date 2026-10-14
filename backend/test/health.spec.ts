import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '../src/modules/health/health.controller';
import { AppController } from '../src/app.controller';
import { ConfigService } from '@nestjs/config';
import { AiPlatformClient } from '../src/modules/integrations/ai-platform.client';
import { ModelRegressionClient } from '../src/modules/integrations/model-regression.client';
import { NotificationClient } from '../src/modules/integrations/notification.client';

describe('Health & Root Routing', () => {
  let healthController: HealthController;
  let appController: AppController;

  const mockAiPlatformClient = {
    isConfigured: jest.fn().mockReturnValue(true),
    checkHealth: jest.fn().mockResolvedValue({ status: 'UP', latencyMs: 25 }),
  };

  const mockModelRegressionClient = {
    isConfigured: jest.fn().mockReturnValue(false),
    checkHealth: jest
      .fn()
      .mockResolvedValue({ status: 'UNCONFIGURED', latencyMs: 0 }),
  };

  const mockNotificationClient = {
    isConfigured: jest.fn().mockReturnValue(true),
    checkHealth: jest.fn().mockResolvedValue({ status: 'UP', latencyMs: 15 }),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'aiPlatform.url') return 'http://localhost:5000';
      if (key === 'modelRegression.url') return '';
      if (key === 'notificationService.url') return 'http://localhost:3001';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController, AppController],
      providers: [
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AiPlatformClient, useValue: mockAiPlatformClient },
        { provide: ModelRegressionClient, useValue: mockModelRegressionClient },
        { provide: NotificationClient, useValue: mockNotificationClient },
      ],
    }).compile();

    healthController = module.get<HealthController>(HealthController);
    appController = module.get<AppController>(AppController);
  });

  it('should return operational root service metadata on GET /', () => {
    const root = appController.getRoot();
    expect(root).toBeDefined();
    expect(root.status).toBe('operational');
    expect(root.service).toBe('ai-rag-quality-ops-backend');
    expect(root.apiPrefix).toBe('/api/v1');
    expect(root.healthUrl).toBe('/health');
  });

  it('should return liveness ok on GET /health', () => {
    const liveness = healthController.getLiveness();
    expect(liveness.status).toBe('ok');
    expect(liveness.service).toBe('ai-rag-quality-ops-backend');
    expect(typeof liveness.uptime).toBe('number');
  });

  it('should return readiness probe validating external dependencies on GET /health/ready', async () => {
    const readiness = await healthController.getReadiness();
    expect(readiness.status).toBe('ok');
    expect(readiness.dependencies.aiPlatform.status).toBe('UP');
    expect(readiness.dependencies.modelRegressionService.status).toBe(
      'UNCONFIGURED',
    );
    expect(readiness.dependencies.notificationService.status).toBe('UP');
  });
});
