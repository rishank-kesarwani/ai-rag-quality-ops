import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { EvaluationsService } from './evaluations.service';
import { RunEvaluationDto } from './dto/run-evaluation.dto';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';

@ApiTags('Evaluations')
@ApiHeader({
  name: 'x-tenant-id',
  description: 'Tenant workspace identifier',
  required: false,
})
@UseGuards(TenantGuard)
@Controller('evaluations')
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @Get()
  @ApiOperation({ summary: 'List all evaluation runs for the tenant' })
  @ApiResponse({
    status: 200,
    description: 'Evaluation runs retrieved successfully',
  })
  async findAll(@TenantId() tenantId: string) {
    const runs = await this.evaluationsService.findAll(tenantId);
    return {
      success: true,
      data: runs,
      count: runs.length,
      tenantId,
    };
  }

  @Get(':runId')
  @ApiOperation({
    summary: 'Get details, evidence, and metrics for a specific evaluation run',
  })
  @ApiResponse({ status: 200, description: 'Evaluation run details returned' })
  @ApiResponse({ status: 404, description: 'Evaluation run not found' })
  async findOne(@TenantId() tenantId: string, @Param('runId') runId: string) {
    const run = await this.evaluationsService.findOne(tenantId, runId);
    return {
      success: true,
      data: run,
    };
  }

  @Post('run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute an automated benchmark evaluation suite' })
  @ApiResponse({
    status: 200,
    description: 'Evaluation suite completed and metrics calculated',
  })
  async runSuite(@TenantId() tenantId: string, @Body() dto: RunEvaluationDto) {
    const run = await this.evaluationsService.runSuite(tenantId, dto);
    return {
      success: true,
      data: run,
    };
  }
}
