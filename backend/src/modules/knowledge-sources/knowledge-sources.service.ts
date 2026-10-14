import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { KnowledgeSource, FreshnessStatus } from '../../common/types';
import { DatasetsService } from '../datasets/datasets.service';
import { NotificationClient } from '../integrations/notification.client';
import { SsrfValidator } from '../../common/utils/ssrf-validator';
import {
  CreateKnowledgeSourceDto,
  CheckFreshnessDto,
} from './dto/create-source.dto';

@Injectable()
export class KnowledgeSourcesService {
  private readonly logger = new Logger(KnowledgeSourcesService.name);
  private readonly sources: Map<string, KnowledgeSource> = new Map();
  private readonly allowedDomains: string[];
  private readonly maxDocSizeBytes: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly datasetsService: DatasetsService,
    private readonly notificationClient: NotificationClient,
  ) {
    this.allowedDomains = this.configService.get<string[]>(
      'safety.allowedDomains',
      [],
    );
    this.maxDocSizeBytes = this.configService.get<number>(
      'safety.maxDocSizeBytes',
      5242880,
    );
  }

  async findAll(tenantId: string): Promise<KnowledgeSource[]> {
    const list = Array.from(this.sources.values()).filter(
      (s) => s.tenantId === tenantId,
    );
    // Enrich with dynamic dependent cases
    for (const source of list) {
      await this.enrichDependentCases(tenantId, source);
    }
    return list;
  }

  async findOne(tenantId: string, sourceId: string): Promise<KnowledgeSource> {
    const source = this.sources.get(sourceId);
    if (!source || source.tenantId !== tenantId) {
      throw new NotFoundException(
        `Knowledge source "${sourceId}" not found for tenant "${tenantId}".`,
      );
    }
    await this.enrichDependentCases(tenantId, source);
    return source;
  }

  async create(
    tenantId: string,
    dto: CreateKnowledgeSourceDto,
  ): Promise<KnowledgeSource> {
    // 1. SSRF & Safety Validation
    if (dto.sourceType === 'URL') {
      SsrfValidator.validateUrl(
        dto.uri,
        this.allowedDomains.length > 0 ? this.allowedDomains : undefined,
      );
    }

    if (
      dto.contentSnippet &&
      Buffer.byteLength(dto.contentSnippet, 'utf8') > this.maxDocSizeBytes
    ) {
      throw new BadRequestException(
        `Document size exceeds maximum allowable limit of ${this.maxDocSizeBytes} bytes.`,
      );
    }

    const sourceId = `src_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const now = new Date().toISOString();
    const content =
      dto.contentSnippet || `Document content for ${dto.name} (${dto.uri})`;
    const contentHash = crypto
      .createHash('sha256')
      .update(content)
      .digest('hex');

    const source: KnowledgeSource = {
      sourceId,
      name: dto.name,
      tenantId,
      sourceType: dto.sourceType,
      uri: dto.uri,
      version: dto.version || 1,
      contentHash,
      lastCheckedAt: now,
      lastModifiedAt: now,
      freshnessStatus: 'FRESH',
      staleThresholdHours: dto.staleThresholdHours || 168,
      dependentCasesCount: 0,
      dependentCases: [],
      contentSnippet: content.slice(0, 500),
    };

    await this.enrichDependentCases(tenantId, source);
    this.sources.set(sourceId, source);
    this.logger.log(
      `Created knowledge source ${sourceId} (${dto.name}) for tenant ${tenantId}`,
    );
    return source;
  }

  async checkFreshness(
    tenantId: string,
    sourceId: string,
    dto?: CheckFreshnessDto,
  ): Promise<KnowledgeSource> {
    const source = await this.findOne(tenantId, sourceId);
    const now = new Date();
    source.lastCheckedAt = now.toISOString();

    const lastMod = new Date(source.lastModifiedAt).getTime();
    const hoursSinceMod = (now.getTime() - lastMod) / (1000 * 60 * 60);

    let status: FreshnessStatus = 'FRESH';

    // 1. Check for content drift if new content provided
    if (dto?.newContent) {
      const newHash = crypto
        .createHash('sha256')
        .update(dto.newContent)
        .digest('hex');
      if (newHash !== source.contentHash) {
        status = 'CONTENT_DRIFT_DETECTED';
        source.contentHash = newHash;
        source.version += 1;
        source.lastModifiedAt = now.toISOString();
        source.contentSnippet = dto.newContent.slice(0, 500);
      }
    }

    // 2. Check time-based staleness threshold
    if (status !== 'CONTENT_DRIFT_DETECTED') {
      if (hoursSinceMod > source.staleThresholdHours * 2) {
        status = 'EXPIRED';
      } else if (hoursSinceMod > source.staleThresholdHours) {
        status = 'STALE_WARNING';
      }
    }

    source.freshnessStatus = status;

    if (
      status === 'STALE_WARNING' ||
      status === 'CONTENT_DRIFT_DETECTED' ||
      status === 'EXPIRED'
    ) {
      await this.notificationClient.sendAlert(
        `Knowledge Source Staleness Alert: ${source.name}`,
        `Source "${source.name}" (${source.sourceId}) is flagged as ${status}. ${source.dependentCasesCount} benchmark cases may be impacted.`,
        status === 'EXPIRED' ? 'CRITICAL' : 'BULK',
        { sourceId, status, dependentCasesCount: source.dependentCasesCount },
      );
    }

    return source;
  }

  async checkAllFreshness(
    tenantId: string,
  ): Promise<{ checkedCount: number; staleCount: number; driftCount: number }> {
    const list = await this.findAll(tenantId);
    let staleCount = 0;
    let driftCount = 0;

    for (const source of list) {
      await this.checkFreshness(tenantId, source.sourceId);
      if (
        source.freshnessStatus === 'STALE_WARNING' ||
        source.freshnessStatus === 'EXPIRED'
      ) {
        staleCount += 1;
      } else if (source.freshnessStatus === 'CONTENT_DRIFT_DETECTED') {
        driftCount += 1;
      }
    }

    return {
      checkedCount: list.length,
      staleCount,
      driftCount,
    };
  }

  async delete(
    tenantId: string,
    sourceId: string,
  ): Promise<{ success: boolean; sourceId: string; message: string }> {
    const source = await this.findOne(tenantId, sourceId);
    this.sources.delete(source.sourceId);
    return {
      success: true,
      sourceId,
      message: `Knowledge source "${source.name}" deleted according to retention policy.`,
    };
  }

  seedSource(source: KnowledgeSource): void {
    this.sources.set(source.sourceId, source);
  }

  private async enrichDependentCases(
    tenantId: string,
    source: KnowledgeSource,
  ): Promise<void> {
    const datasets = await this.datasetsService.findAll(tenantId);
    const dependentCases: Array<{
      datasetId: string;
      datasetVersion: string;
      caseId: string;
      query: string;
    }> = [];

    const matchTerms = [
      source.sourceId.toLowerCase(),
      source.name.toLowerCase(),
      source.uri.toLowerCase(),
    ];

    for (const ds of datasets) {
      for (const tc of ds.testCases) {
        const references = [
          ...(tc.relevantDocumentIds || []),
          ...(tc.relevantChunkIds || []),
          ...(tc.expectedCitations?.map(
            (c) => c.documentId || c.source || '',
          ) || []),
        ].map((r) => r.toLowerCase());

        const isDependent = matchTerms.some((term) =>
          references.some((ref) => ref.includes(term) || term.includes(ref)),
        );

        if (isDependent) {
          dependentCases.push({
            datasetId: ds.datasetId,
            datasetVersion: ds.version,
            caseId: tc.caseId,
            query: tc.query,
          });
        }
      }
    }

    source.dependentCases = dependentCases;
    source.dependentCasesCount = dependentCases.length;
  }
}
