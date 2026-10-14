import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Root')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Platform root metadata endpoint' })
  getRoot() {
    return {
      service: 'ai-rag-quality-ops-backend',
      description:
        'Production-grade platform for RAG evaluation, retrieval benchmarking, citation verification, stale knowledge detection, and reviewed documentation operations.',
      version: '1.0.0',
      status: 'operational',
      apiPrefix: '/api/v1',
      docsUrl: '/api/docs',
      healthUrl: '/health',
      timestamp: new Date().toISOString(),
    };
  }
}
