export type RetrievalMethod = 'DENSE' | 'SPARSE_BM25' | 'HYBRID' | 'RERANKED';

export type EvaluationStatus =
  'QUEUED' | 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED';

export type CaseEvaluationStatus =
  'PASS' | 'FAIL' | 'INSUFFICIENT_EVIDENCE' | 'EMPTY_RETRIEVAL' | 'ERROR';

export type FreshnessStatus =
  'FRESH' | 'STALE_WARNING' | 'EXPIRED' | 'CONTENT_DRIFT_DETECTED';

export type ProposalStatus = 'PROPOSED' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';

export interface ExpectedCitation {
  documentId: string;
  chunkId?: string;
  source?: string;
  quoteSnippet?: string;
}

export interface TestCase {
  caseId: string;
  query: string;
  expectedAnswer: string;
  relevantDocumentIds?: string[];
  relevantChunkIds?: string[];
  expectedCitations?: ExpectedCitation[];
  hasRelevanceLabels: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface Dataset {
  datasetId: string;
  name: string;
  description: string;
  tenantId: string;
  version: string;
  isSynthetic: boolean;
  isImmutable: boolean;
  snapshotHash: string;
  testCases: TestCase[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  documentVersion?: number;
  source: string;
  title?: string;
  text: string;
  score: number;
  isRelevantGroundTruth?: boolean;
}

export interface Citation {
  documentId: string;
  chunkId?: string;
  source?: string;
  score?: number;
  title?: string;
  documentType?: string;
}

export interface RetrievalMetrics {
  recallAtK: number | null;
  precisionAtK: number | null;
  mrr: number | null;
  ndcgAtK: number | null;
  labelsAvailable: boolean;
  labelsNote?: string;
}

export interface GenerationMetrics {
  citationCoverage: number;
  groundednessScore: number;
  answerRelevanceScore: number;
  evaluationMethod:
    'DETERMINISTIC_LABEL_MATCH' | 'LLM_JUDGE_AI_PLATFORM' | 'HEURISTIC_OVERLAP';
}

export interface CaseResult {
  caseId: string;
  query: string;
  expectedAnswer: string;
  generatedAnswer: string | null;
  retrievedChunks: RetrievedChunk[];
  citations: Citation[];
  status: CaseEvaluationStatus;
  metrics: {
    retrieval: RetrievalMetrics;
    generation: GenerationMetrics;
  };
  latencyMs: number;
  failureReason?: string | null;
}

export interface RunConfiguration {
  candidateLabel: string;
  retrievalMethod: RetrievalMethod;
  topK: number;
  minScore: number;
  chunkingStrategy?: string;
  embeddingModel?: string;
  rerankerModel?: string;
  temperature?: number;
}

export interface EvaluationRun {
  runId: string;
  name: string;
  tenantId: string;
  datasetId: string;
  datasetVersion: string;
  datasetSnapshotHash: string;
  isBaseline: boolean;
  baselineRunId?: string;
  configuration: RunConfiguration;
  executionMode: 'SHARED_AI_PLATFORM' | 'LOCAL_DETERMINISTIC_ADAPTER';
  status: EvaluationStatus;
  summaryMetrics: {
    retrieval: RetrievalMetrics;
    generation: {
      citationCoverage: number;
      groundednessScore: number;
      answerRelevanceScore: number;
    };
    latency: {
      averageMs: number;
      p95Ms: number;
    };
    counts: {
      total: number;
      passed: number;
      failed: number;
      insufficientEvidence: number;
      emptyRetrieval: number;
      errors: number;
    };
  };
  regressionCheck?: {
    status: 'PASS' | 'WARN' | 'FAIL' | 'SKIPPED';
    summary?: string;
    deltas?: Record<
      string,
      {
        candidate: number | null;
        baseline: number | null;
        delta: number | null;
        pass: boolean;
      }
    >;
  };
  caseResults: CaseResult[];
  createdAt: string;
  completedAt?: string;
}

export interface KnowledgeSource {
  sourceId: string;
  name: string;
  tenantId: string;
  sourceType: 'DOCUMENT' | 'URL' | 'API_SPEC' | 'MARKDOWN';
  uri: string;
  version: number;
  contentHash: string;
  lastCheckedAt: string;
  lastModifiedAt: string;
  freshnessStatus: FreshnessStatus;
  staleThresholdHours: number;
  dependentCasesCount: number;
  dependentCases: Array<{
    datasetId: string;
    datasetVersion: string;
    caseId: string;
    query: string;
  }>;
  etag?: string;
  contentSnippet?: string;
}

export interface DocumentationProposal {
  proposalId: string;
  sourceId: string;
  sourceName: string;
  tenantId: string;
  title: string;
  rationale: string;
  triggerRunId?: string;
  triggerCaseId?: string;
  currentSnippet: string;
  proposedSnippet: string;
  diffSnippet: string;
  status: ProposalStatus;
  proposedBy: string;
  reviewedBy?: string;
  reviewComment?: string;
  createdAt: string;
  reviewedAt?: string;
}
