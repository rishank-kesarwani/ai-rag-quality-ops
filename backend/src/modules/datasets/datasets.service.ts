import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { Dataset, TestCase } from '../../common/types';
import {
  CreateDatasetDto,
  CreateVersionDto,
  TestCaseDto,
} from './dto/create-dataset.dto';

@Injectable()
export class DatasetsService {
  private readonly logger = new Logger(DatasetsService.name);
  private readonly datasets: Map<string, Dataset> = new Map();

  async findAll(tenantId: string): Promise<Dataset[]> {
    return Array.from(this.datasets.values()).filter(
      (d) => d.tenantId === tenantId,
    );
  }

  async findOne(tenantId: string, datasetId: string): Promise<Dataset> {
    const dataset = this.datasets.get(datasetId);
    if (!dataset || dataset.tenantId !== tenantId) {
      throw new NotFoundException(
        `Dataset with identifier "${datasetId}" not found for tenant "${tenantId}".`,
      );
    }
    return dataset;
  }

  async create(tenantId: string, dto: CreateDatasetDto): Promise<Dataset> {
    const datasetId = `ds_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const version = dto.version || '1.0.0';

    const testCases: TestCase[] = (dto.testCases || []).map((tc, idx) => ({
      caseId: tc.caseId || `tc_${datasetId}_${idx + 1}`,
      query: tc.query,
      expectedAnswer: tc.expectedAnswer,
      relevantDocumentIds: tc.relevantDocumentIds || [],
      relevantChunkIds: tc.relevantChunkIds || [],
      expectedCitations: tc.expectedCitations || [],
      hasRelevanceLabels: !!tc.hasRelevanceLabels,
      tags: tc.tags || [],
    }));

    const now = new Date().toISOString();
    const snapshotHash = this.computeSnapshotHash(testCases);

    const dataset: Dataset = {
      datasetId,
      name: dto.name,
      description: dto.description,
      tenantId,
      version,
      isSynthetic: !!dto.isSynthetic,
      isImmutable: false,
      snapshotHash,
      testCases,
      tags: dto.tags || [],
      createdAt: now,
      updatedAt: now,
    };

    this.datasets.set(datasetId, dataset);
    this.logger.log(
      `Created dataset ${datasetId} (v${version}) for tenant ${tenantId}`,
    );
    return dataset;
  }

  async addTestCase(
    tenantId: string,
    datasetId: string,
    dto: TestCaseDto,
  ): Promise<TestCase> {
    const dataset = await this.findOne(tenantId, datasetId);
    if (dataset.isImmutable) {
      throw new BadRequestException(
        `Dataset "${datasetId}" is marked as an immutable snapshot. Fork a new version to add test cases.`,
      );
    }

    const caseId =
      dto.caseId || `tc_${datasetId}_${dataset.testCases.length + 1}`;
    const testCase: TestCase = {
      caseId,
      query: dto.query,
      expectedAnswer: dto.expectedAnswer,
      relevantDocumentIds: dto.relevantDocumentIds || [],
      relevantChunkIds: dto.relevantChunkIds || [],
      expectedCitations: dto.expectedCitations || [],
      hasRelevanceLabels: !!dto.hasRelevanceLabels,
      tags: dto.tags || [],
    };

    dataset.testCases.push(testCase);
    dataset.snapshotHash = this.computeSnapshotHash(dataset.testCases);
    dataset.updatedAt = new Date().toISOString();

    return testCase;
  }

  async createNewVersion(
    tenantId: string,
    datasetId: string,
    dto: CreateVersionDto,
  ): Promise<Dataset> {
    const original = await this.findOne(tenantId, datasetId);

    // Freeze current original if requested or keep as versioned record
    original.isImmutable = true;

    const newDatasetId = `ds_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const now = new Date().toISOString();
    const clonedCases = JSON.parse(JSON.stringify(original.testCases));
    const snapshotHash = this.computeSnapshotHash(clonedCases);

    const newVersionDataset: Dataset = {
      datasetId: newDatasetId,
      name: `${original.name} (v${dto.version})`,
      description: dto.description || original.description,
      tenantId,
      version: dto.version,
      isSynthetic: original.isSynthetic,
      isImmutable: false,
      snapshotHash,
      testCases: clonedCases,
      tags: [...original.tags, `v${dto.version}`],
      createdAt: now,
      updatedAt: now,
    };

    this.datasets.set(newDatasetId, newVersionDataset);
    return newVersionDataset;
  }

  async delete(
    tenantId: string,
    datasetId: string,
  ): Promise<{ success: boolean; datasetId: string }> {
    const dataset = await this.findOne(tenantId, datasetId);
    this.datasets.delete(dataset.datasetId);
    return { success: true, datasetId };
  }

  /**
   * Internal seeding helper to register built-in demo datasets
   */
  seedDataset(dataset: Dataset): void {
    dataset.snapshotHash = this.computeSnapshotHash(dataset.testCases);
    this.datasets.set(dataset.datasetId, dataset);
  }

  private computeSnapshotHash(cases: TestCase[]): string {
    const raw = JSON.stringify(
      cases.map((c) => ({
        q: c.query,
        a: c.expectedAnswer,
        r: c.relevantChunkIds || c.relevantDocumentIds,
      })),
    );
    return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
  }
}
