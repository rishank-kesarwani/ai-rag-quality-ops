import { Test, TestingModule } from '@nestjs/testing';
import { DatasetsService } from '../src/modules/datasets/datasets.service';
import { KnowledgeSourcesService } from '../src/modules/knowledge-sources/knowledge-sources.service';
import { ProposalsService } from '../src/modules/proposals/proposals.service';
import { NotificationClient } from '../src/modules/integrations/notification.client';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';

describe('Tenant Isolation Verification', () => {
  let datasetsService: DatasetsService;
  let sourcesService: KnowledgeSourcesService;
  let proposalsService: ProposalsService;

  const mockNotificationClient = {
    sendAlert: jest.fn().mockResolvedValue({ sent: true }),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultVal: any) => defaultVal),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatasetsService,
        KnowledgeSourcesService,
        ProposalsService,
        { provide: NotificationClient, useValue: mockNotificationClient },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    datasetsService = module.get<DatasetsService>(DatasetsService);
    sourcesService = module.get<KnowledgeSourcesService>(
      KnowledgeSourcesService,
    );
    proposalsService = module.get<ProposalsService>(ProposalsService);
  });

  it('should isolate datasets by tenant and prevent cross-tenant access', async () => {
    const dsA = await datasetsService.create('tenant-alpha', {
      name: 'Alpha Customer Service Benchmark',
      description: 'Private benchmarks for Alpha tenant',
      isSynthetic: true,
      testCases: [],
    });

    // Tenant Alpha can retrieve its dataset
    const foundA = await datasetsService.findOne('tenant-alpha', dsA.datasetId);
    expect(foundA.datasetId).toBe(dsA.datasetId);

    // Tenant Beta must be prevented with NotFoundException
    await expect(
      datasetsService.findOne('tenant-beta', dsA.datasetId),
    ).rejects.toThrow(NotFoundException);

    // Listing datasets for tenant Beta should not include Alpha's dataset
    const listBeta = await datasetsService.findAll('tenant-beta');
    expect(listBeta.some((d) => d.datasetId === dsA.datasetId)).toBe(false);
  });

  it('should isolate knowledge sources by tenant', async () => {
    const srcA = await sourcesService.create('tenant-alpha', {
      name: 'Alpha Internal Billing Guide',
      sourceType: 'DOCUMENT',
      uri: 'docs/billing.md',
    });

    const foundA = await sourcesService.findOne('tenant-alpha', srcA.sourceId);
    expect(foundA.sourceId).toBe(srcA.sourceId);

    await expect(
      sourcesService.findOne('tenant-beta', srcA.sourceId),
    ).rejects.toThrow(NotFoundException);
  });

  it('should isolate documentation improvement proposals by tenant', async () => {
    const propA = await proposalsService.create('tenant-alpha', {
      sourceId: 'src_1',
      sourceName: 'Alpha Terms',
      title: 'Update section 4.1',
      rationale: 'Clarity improvement',
      currentSnippet: 'Old text',
      proposedSnippet: 'New text',
    });

    const foundA = await proposalsService.findOne(
      'tenant-alpha',
      propA.proposalId,
    );
    expect(foundA.proposalId).toBe(propA.proposalId);

    await expect(
      proposalsService.findOne('tenant-beta', propA.proposalId),
    ).rejects.toThrow(NotFoundException);
  });
});
