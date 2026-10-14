import { Module, Global } from '@nestjs/common';
import { AiPlatformClient } from './ai-platform.client';
import { ModelRegressionClient } from './model-regression.client';
import { NotificationClient } from './notification.client';

@Global()
@Module({
  providers: [AiPlatformClient, ModelRegressionClient, NotificationClient],
  exports: [AiPlatformClient, ModelRegressionClient, NotificationClient],
})
export class IntegrationsModule {}
