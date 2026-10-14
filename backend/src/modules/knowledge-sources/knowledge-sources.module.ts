import { Module } from '@nestjs/common';
import { KnowledgeSourcesController } from './knowledge-sources.controller';
import { KnowledgeSourcesService } from './knowledge-sources.service';
import { DatasetsModule } from '../datasets/datasets.module';

@Module({
  imports: [DatasetsModule],
  controllers: [KnowledgeSourcesController],
  providers: [KnowledgeSourcesService],
  exports: [KnowledgeSourcesService],
})
export class KnowledgeSourcesModule {}
