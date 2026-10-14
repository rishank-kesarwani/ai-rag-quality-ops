import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { DatasetsService } from '../datasets/datasets.service';
import { EvaluationsService } from '../evaluations/evaluations.service';
import { KnowledgeSourcesService } from '../knowledge-sources/knowledge-sources.service';
import { ProposalsService } from '../proposals/proposals.service';
import {
  Dataset,
  EvaluationRun,
  KnowledgeSource,
  DocumentationProposal,
} from '../../common/types';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly datasetsService: DatasetsService,
    private readonly evaluationsService: EvaluationsService,
    private readonly sourcesService: KnowledgeSourcesService,
    private readonly proposalsService: ProposalsService,
  ) {}

  async onModuleInit() {
    this.seedAll();
  }

  seedAll() {
    const tenantId = 'tenant-default';
    this.seedKnowledgeSources(tenantId);
    this.seedDatasets(tenantId);
    this.seedEvaluationRuns(tenantId);
    this.seedProposals(tenantId);
    this.logger.log(
      'Demo seed data initialized successfully with clearly labeled synthetic datasets.',
    );
  }

  private seedKnowledgeSources(tenantId: string) {
    const now = new Date();
    const tenDaysAgo = new Date(
      now.getTime() - 10 * 24 * 3600 * 1000,
    ).toISOString();

    const sources: KnowledgeSource[] = [
      {
        sourceId: 'src_billing_refunds',
        name: 'Customer Refund & Cancellation Terms (v2.1)',
        tenantId,
        sourceType: 'DOCUMENT',
        uri: 'docs/billing/refunds.md',
        version: 2,
        contentHash:
          'a7f394c8b2e10582d90f23b71ca847291a2e4785b91c890123ef6718294a02bc',
        lastCheckedAt: now.toISOString(),
        lastModifiedAt: now.toISOString(),
        freshnessStatus: 'FRESH',
        staleThresholdHours: 168,
        dependentCasesCount: 2,
        dependentCases: [],
        contentSnippet:
          'Credit card refunds are processed within 3 to 5 business days following formal authorization. Disputed transactions require payment proof within 14 calendar days.',
      },
      {
        sourceId: 'src_api_ratelimits',
        name: 'Developer API Rate Limits & Quotas',
        tenantId,
        sourceType: 'API_SPEC',
        uri: 'docs/api/rate-limits.md',
        version: 1,
        contentHash:
          'f41289c09b1a5e7391024bd781ac983419823efca89104712398510239481234',
        lastCheckedAt: now.toISOString(),
        lastModifiedAt: now.toISOString(),
        freshnessStatus: 'FRESH',
        staleThresholdHours: 168,
        dependentCasesCount: 2,
        dependentCases: [],
        contentSnippet:
          'The standard REST API tier permits up to 120 requests per minute per tenant API key. If exceeded, HTTP 429 Too Many Requests is returned with Retry-After header.',
      },
      {
        sourceId: 'src_legacy_webhooks',
        name: 'Legacy Third-Party Webhook Specifications',
        tenantId,
        sourceType: 'MARKDOWN',
        uri: 'docs/integrations/legacy-webhooks.md',
        version: 1,
        contentHash:
          'e9821034bcaf71982341908234fa091823471092834019283401928340192834',
        lastCheckedAt: tenDaysAgo,
        lastModifiedAt: tenDaysAgo,
        freshnessStatus: 'STALE_WARNING',
        staleThresholdHours: 168,
        dependentCasesCount: 1,
        dependentCases: [],
        contentSnippet:
          'Webhook notifications are dispatched over HTTP/1.1 with MD5 HMAC signing. Deprecated as of Q3 2024.',
      },
    ];

    for (const s of sources) {
      this.sourcesService.seedSource(s);
    }
  }

  private seedDatasets(tenantId: string) {
    const now = new Date().toISOString();

    const ds1: Dataset = {
      datasetId: 'ds_cust_support',
      name: 'Customer Support Policy Benchmark (Synthetic Sample v1)',
      description:
        'Labeled synthetic queries testing refund timelines, dispute resolution, and payment terms.',
      tenantId,
      version: '1.0.0',
      isSynthetic: true,
      isImmutable: false,
      snapshotHash: '8b7f21a49c32e180',
      tags: ['support', 'billing', 'synthetic-sample', 'v1'],
      createdAt: now,
      updatedAt: now,
      testCases: [
        {
          caseId: 'tc_refund_time_01',
          query:
            'What is the refund turnaround time for credit card transactions?',
          expectedAnswer:
            'Credit card refunds are processed within 3 to 5 business days following formal authorization.',
          relevantDocumentIds: ['doc-refund-policy-v2'],
          relevantChunkIds: ['doc-refund-policy-v2#chunk-01'],
          expectedCitations: [
            {
              documentId: 'doc-refund-policy-v2',
              chunkId: 'doc-refund-policy-v2#chunk-01',
              source: 'docs/billing/refunds.md',
              quoteSnippet: 'processed within 3 to 5 business days',
            },
          ],
          hasRelevanceLabels: true,
          tags: ['billing', 'refunds'],
        },
        {
          caseId: 'tc_dispute_time_02',
          query:
            'How many days does a customer have to submit proof for a disputed transaction?',
          expectedAnswer:
            'Customers must submit payment proof within 14 calendar days to avoid automated claim rejection.',
          relevantDocumentIds: ['doc-refund-policy-v2'],
          relevantChunkIds: ['doc-refund-policy-v2#chunk-02'],
          expectedCitations: [
            {
              documentId: 'doc-refund-policy-v2',
              chunkId: 'doc-refund-policy-v2#chunk-02',
              source: 'docs/billing/refunds.md',
              quoteSnippet: 'within 14 calendar days',
            },
          ],
          hasRelevanceLabels: true,
          tags: ['billing', 'disputes'],
        },
      ],
    };

    const ds2: Dataset = {
      datasetId: 'ds_api_docs',
      name: 'Developer API & Quota Benchmark (Synthetic Sample v1)',
      description:
        'Synthetic queries evaluating rate limit guidance, authentication, and HTTP 429 response behavior.',
      tenantId,
      version: '1.0.0',
      isSynthetic: true,
      isImmutable: false,
      snapshotHash: '4a1e90d38b55f112',
      tags: ['api', 'developer', 'synthetic-sample'],
      createdAt: now,
      updatedAt: now,
      testCases: [
        {
          caseId: 'tc_api_limit_01',
          query: 'What is the standard API rate limit per minute?',
          expectedAnswer:
            'The standard REST API tier permits up to 120 requests per minute per tenant API key.',
          relevantDocumentIds: ['doc-api-ratelimits-v1'],
          relevantChunkIds: ['doc-api-ratelimits-v1#chunk-01'],
          hasRelevanceLabels: true,
          tags: ['api', 'rate-limits'],
        },
        {
          caseId: 'tc_api_auth_02',
          query:
            'Which HTTP header is required for service-to-service API key authentication?',
          expectedAnswer:
            'Requests must include the API key in the x-api-key header or Bearer token in Authorization.',
          relevantDocumentIds: ['doc-api-auth-v1'],
          relevantChunkIds: ['doc-api-auth-v1#chunk-01'],
          hasRelevanceLabels: true,
          tags: ['api', 'auth'],
        },
      ],
    };

    const ds3: Dataset = {
      datasetId: 'ds_unlabeled_exploratory',
      name: 'Unlabeled Customer Queries (Synthetic Sample v1)',
      description:
        'Exploratory questions without chunk-level ground-truth labels. Demonstrates safe metric handling.',
      tenantId,
      version: '1.0.0',
      isSynthetic: true,
      isImmutable: false,
      snapshotHash: '19ef00a293b1d75c',
      tags: ['unlabeled', 'synthetic-sample'],
      createdAt: now,
      updatedAt: now,
      testCases: [
        {
          caseId: 'tc_unlabeled_01',
          query:
            'Can I export my annual invoice receipts to CSV or accounting software format?',
          expectedAnswer:
            'Yes, invoices can be exported to CSV or PDF via the billing console.',
          relevantDocumentIds: [],
          relevantChunkIds: [],
          hasRelevanceLabels: false,
          tags: ['exploratory'],
        },
      ],
    };

    this.datasetsService.seedDataset(ds1);
    this.datasetsService.seedDataset(ds2);
    this.datasetsService.seedDataset(ds3);
  }

  private seedEvaluationRuns(tenantId: string) {
    const now = new Date().toISOString();

    const baselineRun: EvaluationRun = {
      runId: 'run_baseline_001',
      name: 'Customer Support Benchmark — Baseline (Dense Retrieval)',
      tenantId,
      datasetId: 'ds_cust_support',
      datasetVersion: '1.0.0',
      datasetSnapshotHash: '8b7f21a49c32e180',
      isBaseline: true,
      configuration: {
        candidateLabel: 'Baseline Dense Vector Search',
        retrievalMethod: 'DENSE',
        topK: 5,
        minScore: 0.5,
        chunkingStrategy: 'fixed_500_char',
        embeddingModel: 'text-embedding-004',
      },
      executionMode: 'LOCAL_DETERMINISTIC_ADAPTER',
      status: 'COMPLETED',
      summaryMetrics: {
        retrieval: {
          recallAtK: 1.0,
          precisionAtK: 0.2,
          mrr: 1.0,
          ndcgAtK: 1.0,
          labelsAvailable: true,
        },
        generation: {
          citationCoverage: 1.0,
          groundednessScore: 0.88,
          answerRelevanceScore: 0.85,
        },
        latency: {
          averageMs: 145,
          p95Ms: 160,
        },
        counts: {
          total: 2,
          passed: 2,
          failed: 0,
          insufficientEvidence: 0,
          emptyRetrieval: 0,
          errors: 0,
        },
      },
      caseResults: [
        {
          caseId: 'tc_refund_time_01',
          query:
            'What is the refund turnaround time for credit card transactions?',
          expectedAnswer:
            'Credit card refunds are processed within 3 to 5 business days following formal authorization.',
          generatedAnswer:
            'Credit card refunds are processed within 3 to 5 business days following formal authorization.',
          retrievedChunks: [
            {
              chunkId: 'doc-refund-policy-v2#chunk-01',
              documentId: 'doc-refund-policy-v2',
              source: 'docs/billing/refunds.md',
              title: 'Customer Refund & Cancellation Terms (v2.1)',
              text: 'Credit card refunds are processed within 3 to 5 business days following formal authorization.',
              score: 0.92,
              isRelevantGroundTruth: true,
            },
          ],
          citations: [
            {
              documentId: 'doc-refund-policy-v2',
              chunkId: 'doc-refund-policy-v2#chunk-01',
              source: 'docs/billing/refunds.md',
              score: 0.92,
            },
          ],
          status: 'PASS',
          metrics: {
            retrieval: {
              recallAtK: 1.0,
              precisionAtK: 0.2,
              mrr: 1.0,
              ndcgAtK: 1.0,
              labelsAvailable: true,
            },
            generation: {
              citationCoverage: 1.0,
              groundednessScore: 0.92,
              answerRelevanceScore: 0.95,
              evaluationMethod: 'HEURISTIC_OVERLAP',
            },
          },
          latencyMs: 140,
        },
        {
          caseId: 'tc_dispute_time_02',
          query:
            'How many days does a customer have to submit proof for a disputed transaction?',
          expectedAnswer:
            'Customers must submit payment proof within 14 calendar days to avoid automated claim rejection.',
          generatedAnswer:
            'In the event of a disputed transaction, customers have 14 calendar days to submit proof.',
          retrievedChunks: [
            {
              chunkId: 'doc-refund-policy-v2#chunk-02',
              documentId: 'doc-refund-policy-v2',
              source: 'docs/billing/refunds.md',
              title: 'Customer Refund & Cancellation Terms (v2.1)',
              text: 'In the event of a disputed transaction, the customer must submit payment proof within 14 calendar days.',
              score: 0.88,
              isRelevantGroundTruth: true,
            },
          ],
          citations: [
            {
              documentId: 'doc-refund-policy-v2',
              chunkId: 'doc-refund-policy-v2#chunk-02',
              source: 'docs/billing/refunds.md',
              score: 0.88,
            },
          ],
          status: 'PASS',
          metrics: {
            retrieval: {
              recallAtK: 1.0,
              precisionAtK: 0.2,
              mrr: 1.0,
              ndcgAtK: 1.0,
              labelsAvailable: true,
            },
            generation: {
              citationCoverage: 1.0,
              groundednessScore: 0.84,
              answerRelevanceScore: 0.75,
              evaluationMethod: 'HEURISTIC_OVERLAP',
            },
          },
          latencyMs: 150,
        },
      ],
      createdAt: now,
      completedAt: now,
    };

    this.evaluationsService.seedRun(baselineRun);
  }

  private seedProposals(tenantId: string) {
    const now = new Date().toISOString();

    const prop1: DocumentationProposal = {
      proposalId: 'prop_seed_01',
      sourceId: 'src_billing_refunds',
      sourceName: 'Customer Refund & Cancellation Terms (v2.1)',
      tenantId,
      title: 'Clarify credit card turnaround timeline to 3-5 business days',
      rationale:
        'Benchmark run detected ambiguities when customers asked about weekend bank delays.',
      currentSnippet:
        'Credit card refunds are processed within 3 to 5 business days following formal authorization.',
      proposedSnippet:
        'Credit card refunds are processed within 3 to 5 business days (excluding weekends and official banking holidays) following formal authorization.',
      diffSnippet:
        '--- current\n+++ proposed\n- Credit card refunds are processed within 3 to 5 business days following formal authorization.\n+ Credit card refunds are processed within 3 to 5 business days (excluding weekends and official banking holidays) following formal authorization.',
      status: 'PROPOSED',
      proposedBy: 'agent-qa-proposer',
      createdAt: now,
    };

    const prop2: DocumentationProposal = {
      proposalId: 'prop_seed_02',
      sourceId: 'src_api_ratelimits',
      sourceName: 'Developer API Rate Limits & Quotas',
      tenantId,
      title: 'Document HTTP 429 Retry-After header format',
      rationale:
        'API clients frequently retry prematurely without respecting Retry-After header.',
      currentSnippet:
        'If exceeded, HTTP 429 Too Many Requests is returned with Retry-After header.',
      proposedSnippet:
        'If exceeded, HTTP 429 Too Many Requests is returned with a standard Retry-After header specifying delay seconds.',
      diffSnippet:
        '--- current\n+++ proposed\n- If exceeded, HTTP 429 Too Many Requests is returned with Retry-After header.\n+ If exceeded, HTTP 429 Too Many Requests is returned with a standard Retry-After header specifying delay seconds.',
      status: 'APPROVED',
      proposedBy: 'developer-advocate',
      reviewedBy: 'ops-lead@company.com',
      reviewComment:
        'Verified with gateway infrastructure specifications. Merged into docs.',
      createdAt: now,
      reviewedAt: now,
    };

    this.proposalsService.seedProposal(prop1);
    this.proposalsService.seedProposal(prop2);
  }
}
