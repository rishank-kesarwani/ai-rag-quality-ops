import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';

import { AppController } from './app.controller';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { HealthModule } from './modules/health/health.module';
import { DatasetsModule } from './modules/datasets/datasets.module';
import { EvaluationsModule } from './modules/evaluations/evaluations.module';
import { KnowledgeSourcesModule } from './modules/knowledge-sources/knowledge-sources.module';
import { ProposalsModule } from './modules/proposals/proposals.module';
import { SeedModule } from './modules/seed/seed.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('throttle.ttl', 60) * 1000,
          limit: configService.get<number>('throttle.limit', 120),
        },
      ],
      inject: [ConfigService],
    }),
    IntegrationsModule,
    HealthModule,
    DatasetsModule,
    EvaluationsModule,
    KnowledgeSourcesModule,
    ProposalsModule,
    SeedModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
