import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { KnowledgeSourcesService } from './knowledge-sources.service';
import {
  CreateKnowledgeSourceDto,
  CheckFreshnessDto,
} from './dto/create-source.dto';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';

@ApiTags('Knowledge Sources & Freshness')
@ApiHeader({
  name: 'x-tenant-id',
  description: 'Tenant workspace identifier',
  required: false,
})
@UseGuards(TenantGuard)
@Controller('sources')
export class KnowledgeSourcesController {
  constructor(private readonly sourcesService: KnowledgeSourcesService) {}

  @Get()
  @ApiOperation({
    summary: 'List all monitored knowledge sources and their freshness status',
  })
  @ApiResponse({ status: 200, description: 'Knowledge sources returned' })
  async findAll(@TenantId() tenantId: string) {
    const list = await this.sourcesService.findAll(tenantId);
    return {
      success: true,
      data: list,
      count: list.length,
      tenantId,
    };
  }

  @Get(':sourceId')
  @ApiOperation({
    summary: 'Get details, hash, and affected evaluation cases for a source',
  })
  @ApiResponse({ status: 200, description: 'Source details returned' })
  @ApiResponse({ status: 404, description: 'Source not found' })
  async findOne(
    @TenantId() tenantId: string,
    @Param('sourceId') sourceId: string,
  ) {
    const source = await this.sourcesService.findOne(tenantId, sourceId);
    return {
      success: true,
      data: source,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new knowledge source with SSRF validation',
  })
  @ApiResponse({ status: 201, description: 'Source registered' })
  async create(
    @TenantId() tenantId: string,
    @Body() dto: CreateKnowledgeSourceDto,
  ) {
    const source = await this.sourcesService.create(tenantId, dto);
    return {
      success: true,
      data: source,
    };
  }

  @Post('check-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Run freshness and drift evaluation across all sources',
  })
  @ApiResponse({ status: 200, description: 'Batch freshness check complete' })
  async checkAll(@TenantId() tenantId: string) {
    const result = await this.sourcesService.checkAllFreshness(tenantId);
    return {
      success: true,
      data: result,
    };
  }

  @Post(':sourceId/check-freshness')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trigger freshness and content drift check for a single source',
  })
  @ApiResponse({ status: 200, description: 'Freshness evaluated' })
  async checkOne(
    @TenantId() tenantId: string,
    @Param('sourceId') sourceId: string,
    @Body() dto: CheckFreshnessDto,
  ) {
    const source = await this.sourcesService.checkFreshness(
      tenantId,
      sourceId,
      dto,
    );
    return {
      success: true,
      data: source,
    };
  }

  @Delete(':sourceId')
  @ApiOperation({ summary: 'Delete source according to retention policy' })
  @ApiResponse({ status: 200, description: 'Source deleted' })
  async delete(
    @TenantId() tenantId: string,
    @Param('sourceId') sourceId: string,
  ) {
    const res = await this.sourcesService.delete(tenantId, sourceId);
    return {
      success: true,
      data: res,
    };
  }
}
