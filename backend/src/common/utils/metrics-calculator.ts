import {
  TestCase,
  RetrievedChunk,
  RetrievalMetrics,
  GenerationMetrics,
  ExpectedCitation,
  Citation,
} from '../types';

export class MetricsCalculator {
  /**
   * Calculates Recall@K, Precision@K, MRR, and nDCG@K.
   * STRICT GUARD: Only calculates when the test case contains verified ground-truth labels.
   */
  static calculateRetrievalMetrics(
    testCase: TestCase,
    retrievedChunks: RetrievedChunk[],
    topK: number,
  ): RetrievalMetrics {
    const relevantChunkIds = testCase.relevantChunkIds || [];
    const relevantDocIds = testCase.relevantDocumentIds || [];

    const hasChunkLabels = relevantChunkIds.length > 0;
    const hasDocLabels = relevantDocIds.length > 0;
    const labelsAvailable =
      testCase.hasRelevanceLabels && (hasChunkLabels || hasDocLabels);

    if (!labelsAvailable) {
      return {
        recallAtK: null,
        precisionAtK: null,
        mrr: null,
        ndcgAtK: null,
        labelsAvailable: false,
        labelsNote:
          'Retrieval ground-truth labels (relevantChunkIds / relevantDocumentIds) not provided. Metrics cannot be accurately calculated without ground truth.',
      };
    }

    const effectiveChunks = retrievedChunks.slice(0, topK);
    const relevantSet = new Set(
      hasChunkLabels
        ? relevantChunkIds.map((id) => id.trim().toLowerCase())
        : relevantDocIds.map((id) => id.trim().toLowerCase()),
    );

    let relevantRetrievedCount = 0;
    let firstRelevantRank = 0;
    let dcg = 0;

    effectiveChunks.forEach((chunk, index) => {
      const identifier = hasChunkLabels
        ? (chunk.chunkId || '').trim().toLowerCase()
        : (chunk.documentId || '').trim().toLowerCase();

      const isMatch = relevantSet.has(identifier);

      if (isMatch) {
        relevantRetrievedCount += 1;
        if (firstRelevantRank === 0) {
          firstRelevantRank = index + 1;
        }
        // Discounted Cumulative Gain with binary relevance: rel_i / log2(rank + 1)
        dcg += 1 / Math.log2(index + 2);
      }
    });

    // 1. Recall@K: fraction of total ground truth relevant items retrieved
    const totalRelevant = relevantSet.size || 1;
    const recallAtK = Math.min(1, relevantRetrievedCount / totalRelevant);

    // 2. Precision@K: fraction of retrieved items in topK that are relevant
    const denominatorK = Math.max(
      1,
      Math.min(topK, effectiveChunks.length || 1),
    );
    const precisionAtK = Math.min(1, relevantRetrievedCount / denominatorK);

    // 3. MRR (Mean Reciprocal Rank): 1 / rank of first relevant item
    const mrr = firstRelevantRank > 0 ? 1 / firstRelevantRank : 0;

    // 4. nDCG@K: DCG / Ideal DCG
    const idealRelevantCount = Math.min(topK, relevantSet.size);
    let idcg = 0;
    for (let i = 0; i < idealRelevantCount; i++) {
      idcg += 1 / Math.log2(i + 2);
    }
    const ndcgAtK = idcg > 0 ? Math.min(1, dcg / idcg) : 0;

    return {
      recallAtK: roundMetric(recallAtK),
      precisionAtK: roundMetric(precisionAtK),
      mrr: roundMetric(mrr),
      ndcgAtK: roundMetric(ndcgAtK),
      labelsAvailable: true,
      labelsNote: undefined,
    };
  }

  /**
   * Evaluates citation coverage: proportion of expected citations or retrieved sources
   * that are referenced in the generated answer or retrieved citations.
   */
  static calculateCitationCoverage(
    expectedCitations: ExpectedCitation[] | undefined,
    retrievedCitations: Citation[],
    generatedAnswer: string | null,
  ): number {
    if (expectedCitations && expectedCitations.length > 0) {
      const citedDocIds = new Set(
        retrievedCitations.map((c) => c.documentId?.toLowerCase()),
      );
      const answerText = (generatedAnswer || '').toLowerCase();

      let matched = 0;
      for (const expected of expectedCitations) {
        const docIdLower = expected.documentId.toLowerCase();
        const citedInApi = citedDocIds.has(docIdLower);
        const citedInText =
          answerText.includes(docIdLower) ||
          (expected.source &&
            answerText.includes(expected.source.toLowerCase()));

        if (citedInApi || citedInText) {
          matched += 1;
        }
      }
      return roundMetric(matched / expectedCitations.length);
    }

    // When no explicit expected citations exist, measure if retrieved citations exist
    if (retrievedCitations.length > 0) {
      return roundMetric(Math.min(1, retrievedCitations.length / 3));
    }
    return 0;
  }

  /**
   * Deterministic lexical / n-gram groundedness heuristic:
   * verifies what proportion of words/phrases in the generated answer appear in retrieved chunks.
   */
  static calculateGroundedness(
    generatedAnswer: string | null,
    retrievedChunks: RetrievedChunk[],
  ): number {
    if (!generatedAnswer || !generatedAnswer.trim()) return 0;
    if (!retrievedChunks || retrievedChunks.length === 0) return 0;

    const contextText = retrievedChunks
      .map((c) => c.text)
      .join(' ')
      .toLowerCase();
    const answerWords = tokenize(generatedAnswer);
    if (answerWords.length === 0) return 0;

    let groundedWordCount = 0;
    const stopWords = new Set([
      'the',
      'is',
      'at',
      'which',
      'on',
      'a',
      'an',
      'and',
      'or',
      'in',
      'of',
      'for',
      'to',
      'with',
      'by',
      'as',
      'it',
      'this',
      'that',
      'are',
      'was',
      'were',
      'be',
      'been',
    ]);

    const significantWords = answerWords.filter(
      (w) => !stopWords.has(w) && w.length > 2,
    );
    if (significantWords.length === 0) return 1.0;

    for (const word of significantWords) {
      if (contextText.includes(word)) {
        groundedWordCount += 1;
      }
    }

    return roundMetric(groundedWordCount / significantWords.length);
  }

  /**
   * Lexical & token overlap heuristic for Answer Relevance between generated answer and expected answer.
   */
  static calculateAnswerRelevance(
    generatedAnswer: string | null,
    expectedAnswer: string,
  ): number {
    if (!generatedAnswer || !generatedAnswer.trim()) return 0;
    if (!expectedAnswer || !expectedAnswer.trim()) return 0;

    const genTokens = new Set(tokenize(generatedAnswer));
    const expTokens = new Set(tokenize(expectedAnswer));

    if (expTokens.size === 0) return 0;

    let common = 0;
    for (const t of expTokens) {
      if (genTokens.has(t)) {
        common += 1;
      }
    }

    const precision = common / Math.max(1, genTokens.size);
    const recall = common / expTokens.size;

    if (precision + recall === 0) return 0;
    const f1 = (2 * precision * recall) / (precision + recall);
    return roundMetric(f1);
  }

  /**
   * Builds combined generation metrics with explicit method identification.
   */
  static buildGenerationMetrics(
    testCase: TestCase,
    generatedAnswer: string | null,
    retrievedChunks: RetrievedChunk[],
    retrievedCitations: Citation[],
    llmJudgeScores?: {
      groundedness?: number;
      answerRelevance?: number;
    },
  ): GenerationMetrics {
    const citationCoverage = this.calculateCitationCoverage(
      testCase.expectedCitations,
      retrievedCitations,
      generatedAnswer,
    );

    if (
      llmJudgeScores?.groundedness !== undefined &&
      llmJudgeScores?.answerRelevance !== undefined
    ) {
      return {
        citationCoverage,
        groundednessScore: roundMetric(llmJudgeScores.groundedness),
        answerRelevanceScore: roundMetric(llmJudgeScores.answerRelevance),
        evaluationMethod: 'LLM_JUDGE_AI_PLATFORM',
      };
    }

    const groundednessScore = this.calculateGroundedness(
      generatedAnswer,
      retrievedChunks,
    );
    const answerRelevanceScore = this.calculateAnswerRelevance(
      generatedAnswer,
      testCase.expectedAnswer,
    );

    return {
      citationCoverage,
      groundednessScore,
      answerRelevanceScore,
      evaluationMethod: 'HEURISTIC_OVERLAP',
    };
  }
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

function roundMetric(val: number): number {
  return Math.round(val * 10000) / 10000;
}
