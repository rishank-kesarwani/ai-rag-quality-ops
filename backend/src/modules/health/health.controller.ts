import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AiPlatformClient } from '../integrations/ai-platform.client';
import { ModelRegressionClient } from '../integrations/model-regression.client';
import { NotificationClient } from '../integrations/notification.client';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly aiPlatformClient: AiPlatformClient,
    private readonly modelRegressionClient: ModelRegressionClient,
    private readonly notificationClient: NotificationClient,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Liveness probe (Render / Kubernetes)' })
  getLiveness() {
    return {
      status: 'ok',
      service: 'ai-rag-quality-ops-backend',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe validating external service connections',
  })
  async getReadiness() {
    const [aiHealth, regressionHealth, notificationHealth] = await Promise.all([
      this.aiPlatformClient.checkHealth(),
      this.modelRegressionClient.checkHealth(),
      this.notificationClient.checkHealth(),
    ]);

    return {
      status: 'ok',
      service: 'ai-rag-quality-ops-backend',
      dependencies: {
        aiPlatform: {
          configured: this.aiPlatformClient.isConfigured(),
          status: aiHealth.status,
          latencyMs: aiHealth.latencyMs,
          url: this.configService.get('aiPlatform.url') || 'unconfigured',
        },
        modelRegressionService: {
          configured: this.modelRegressionClient.isConfigured(),
          status: regressionHealth.status,
          latencyMs: regressionHealth.latencyMs,
          url: this.configService.get('modelRegression.url') || 'unconfigured',
        },
        notificationService: {
          configured: this.notificationClient.isConfigured(),
          status: notificationHealth.status,
          latencyMs: notificationHealth.latencyMs,
          url:
            this.configService.get('notificationService.url') || 'unconfigured',
        },
      },
      timestamp: new Date().toISOString(),
    };
  }
}
