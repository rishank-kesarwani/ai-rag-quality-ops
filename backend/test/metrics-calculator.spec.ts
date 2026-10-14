import { MetricsCalculator } from '../src/common/utils/metrics-calculator';
import { TestCase, RetrievedChunk } from '../src/common/types';

describe('MetricsCalculator', () => {
  const labeledCase: TestCase = {
    caseId: 'tc_1',
    query: 'What is the refund turnaround time?',
    expectedAnswer: 'Refunds take 3 to 5 business days.',
    relevantChunkIds: ['chunk-1', 'chunk-2'],
    relevantDocumentIds: ['doc-1'],
    hasRelevanceLabels: true,
  };

  const retrievedChunks: RetrievedChunk[] = [
    {
      chunkId: 'chunk-1',
      documentId: 'doc-1',
      source: 'docs/refunds.md',
      text: 'Refunds take 3 to 5 business days.',
      score: 0.95,
    },
    {
      chunkId: 'chunk-3',
      documentId: 'doc-2',
      source: 'docs/other.md',
      text: 'General customer support terms.',
      score: 0.85,
    },
    {
      chunkId: 'chunk-2',
      documentId: 'doc-1',
      source: 'docs/refunds.md',
      text: 'Bank transfer processing details.',
      score: 0.8,
    },
  ];

  it('should accurately calculate Recall@K, Precision@K, MRR, and nDCG@K when ground truth labels exist', () => {
    // Ground truth: ['chunk-1', 'chunk-2'] (2 items)
    // In top 3: chunk-1 (rank 1, match), chunk-3 (rank 2, no match), chunk-2 (rank 3, match)
    // 2 out of 2 relevant retrieved -> Recall@3 = 2 / 2 = 1.0
    // 2 relevant out of 3 retrieved -> Precision@3 = 2 / 3 = 0.6667
    // First relevant item at rank 1 -> MRR = 1 / 1 = 1.0
    // DCG: 1/log2(2) + 0 + 1/log2(4) = 1 + 0.5 = 1.5
    // IDCG: 1/log2(2) + 1/log2(3) = 1 + 0.6309 = 1.6309
    // nDCG: 1.5 / 1.6309 = 0.9197

    const metrics = MetricsCalculator.calculateRetrievalMetrics(
      labeledCase,
      retrievedChunks,
      3,
    );

    expect(metrics.labelsAvailable).toBe(true);
    expect(metrics.recallAtK).toBe(1.0);
    expect(metrics.precisionAtK).toBeCloseTo(0.6667, 3);
    expect(metrics.mrr).toBe(1.0);
    expect(metrics.ndcgAtK).toBeGreaterThan(0.9);
  });

  it('STRICT GUARD: should return null for retrieval metrics when relevance labels are missing', () => {
    const unlabeledCase: TestCase = {
      caseId: 'tc_unlabeled',
      query: 'Can I export invoices to CSV?',
      expectedAnswer: 'Yes via billing console.',
      relevantChunkIds: [],
      relevantDocumentIds: [],
      hasRelevanceLabels: false,
    };

    const metrics = MetricsCalculator.calculateRetrievalMetrics(
      unlabeledCase,
      retrievedChunks,
      3,
    );

    expect(metrics.labelsAvailable).toBe(false);
    expect(metrics.recallAtK).toBeNull();
    expect(metrics.precisionAtK).toBeNull();
    expect(metrics.mrr).toBeNull();
    expect(metrics.ndcgAtK).toBeNull();
    expect(metrics.labelsNote).toContain('not provided');
  });

  it('should calculate citation coverage against expected citations', () => {
    const expectedCitations = [
      { documentId: 'doc-1', source: 'docs/refunds.md' },
      { documentId: 'doc-2', source: 'docs/other.md' },
    ];
    const retrievedCitations = [{ documentId: 'doc-1', chunkId: 'chunk-1' }];

    const coverage = MetricsCalculator.calculateCitationCoverage(
      expectedCitations,
      retrievedCitations,
      'As stated in doc-1, refunds take 3 to 5 business days.',
    );

    // 1 of 2 expected citations matched
    expect(coverage).toBe(0.5);
  });

  it('should calculate groundedness based on lexical overlap with retrieved chunks', () => {
    const groundedAnswer = 'Refunds take 3 to 5 business days.';
    const score = MetricsCalculator.calculateGroundedness(
      groundedAnswer,
      retrievedChunks,
    );
    expect(score).toBeGreaterThanOrEqual(0.8);

    const hallucinatedAnswer =
      'Astronauts frequently travel to Jupiter using quantum antimatter engines.';
    const lowScore = MetricsCalculator.calculateGroundedness(
      hallucinatedAnswer,
      retrievedChunks,
    );
    expect(lowScore).toBeLessThan(0.3);
  });
});
