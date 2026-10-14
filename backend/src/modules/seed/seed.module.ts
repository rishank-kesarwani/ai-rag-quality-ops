import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';
import { DatasetsModule } from '../datasets/datasets.module';
import { EvaluationsModule } from '../evaluations/evaluations.module';
import { KnowledgeSourcesModule } from '../knowledge-sources/knowledge-sources.module';
import { ProposalsModule } from '../proposals/proposals.module';

@Module({
  imports: [
    DatasetsModule,
    EvaluationsModule,
    KnowledgeSourcesModule,
    ProposalsModule,
  ],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
