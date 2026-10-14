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
import { DatasetsService } from './datasets.service';
import {
  CreateDatasetDto,
  CreateVersionDto,
  TestCaseDto,
} from './dto/create-dataset.dto';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';

@ApiTags('Datasets')
@ApiHeader({
  name: 'x-tenant-id',
  description: 'Tenant workspace identifier (defaults to tenant-default)',
  required: false,
})
@UseGuards(TenantGuard)
@Controller('datasets')
export class DatasetsController {
  constructor(private readonly datasetsService: DatasetsService) {}

  @Get()
  @ApiOperation({ summary: 'List all benchmark datasets for tenant' })
  @ApiResponse({ status: 200, description: 'Datasets retrieved successfully' })
  async findAll(@TenantId() tenantId: string) {
    const list = await this.datasetsService.findAll(tenantId);
    return {
      success: true,
      data: list,
      count: list.length,
      tenantId,
    };
  }

  @Get(':datasetId')
  @ApiOperation({ summary: 'Get a specific benchmark dataset by ID' })
  @ApiResponse({ status: 200, description: 'Dataset details returned' })
  @ApiResponse({ status: 404, description: 'Dataset not found' })
  async findOne(
    @TenantId() tenantId: string,
    @Param('datasetId') datasetId: string,
  ) {
    const dataset = await this.datasetsService.findOne(tenantId, datasetId);
    return {
      success: true,
      data: dataset,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new benchmark dataset' })
  @ApiResponse({ status: 201, description: 'Dataset created successfully' })
  async create(@TenantId() tenantId: string, @Body() dto: CreateDatasetDto) {
    const dataset = await this.datasetsService.create(tenantId, dto);
    return {
      success: true,
      data: dataset,
    };
  }

  @Post(':datasetId/cases')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new test case to an existing dataset' })
  @ApiResponse({ status: 201, description: 'Test case added successfully' })
  async addTestCase(
    @TenantId() tenantId: string,
    @Param('datasetId') datasetId: string,
    @Body() dto: TestCaseDto,
  ) {
    const testCase = await this.datasetsService.addTestCase(
      tenantId,
      datasetId,
      dto,
    );
    return {
      success: true,
      data: testCase,
    };
  }

  @Post(':datasetId/versions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new versioned benchmark snapshot' })
  @ApiResponse({ status: 201, description: 'New version snapshot created' })
  async createVersion(
    @TenantId() tenantId: string,
    @Param('datasetId') datasetId: string,
    @Body() dto: CreateVersionDto,
  ) {
    const versioned = await this.datasetsService.createNewVersion(
      tenantId,
      datasetId,
      dto,
    );
    return {
      success: true,
      data: versioned,
    };
  }

  @Delete(':datasetId')
  @ApiOperation({ summary: 'Delete a dataset' })
  @ApiResponse({ status: 200, description: 'Dataset deleted' })
  async delete(
    @TenantId() tenantId: string,
    @Param('datasetId') datasetId: string,
  ) {
    const res = await this.datasetsService.delete(tenantId, datasetId);
    return {
      success: true,
      data: res,
    };
  }
}
