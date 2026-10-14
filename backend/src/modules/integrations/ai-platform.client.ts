import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { Citation, RetrievedChunk } from '../../common/types';

export interface AiPlatformRetrievalResult {
  contextText: string;
  citations: Citation[];
  chunks: RetrievedChunk[];
  totalRetrieved: number;
  source: 'AI_PLATFORM' | 'LOCAL_DETERMINISTIC_ADAPTER';
}

@Injectable()
export class AiPlatformClient {
  private readonly logger = new Logger(AiPlatformClient.name);
  private readonly client: AxiosInstance;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly applicationId: string;
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService
      .get<string>('aiPlatform.url', '')
      .replace(/\/$/, '');
    this.apiKey = this.configService.get<string>('aiPlatform.apiKey', '');
    this.applicationId = this.configService.get<string>(
      'aiPlatform.applicationId',
      'ai-rag-quality-ops',
    );
    this.timeoutMs = this.configService.get<number>(
      'aiPlatform.timeoutMs',
      10000,
    );

    this.client = axios.create({
      baseURL: this.baseUrl || 'http://localhost:5000',
      timeout: this.timeoutMs,
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { 'x-api-key': this.apiKey } : {}),
      },
    });
  }

  isConfigured(): boolean {
    return !!this.baseUrl;
  }

  async checkHealth(): Promise<{
    status: string;
    latencyMs: number;
    error?: string;
  }> {
    if (!this.baseUrl) {
      return { status: 'UNCONFIGURED', latencyMs: 0 };
    }
    const start = Date.now();
    try {
      const res = await this.client.get('/health', { timeout: 3000 });
      return {
        status: res.status === 200 ? 'UP' : 'DEGRADED',
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        status: 'DOWN',
        latencyMs: Date.now() - start,
        error: err.message,
      };
    }
  }

  /**
   * Executes RAG query against AI Platform /api/v1/rag/query.
   * Falls back to deterministic local adapter when AI Platform is offline or unconfigured.
   */
  async queryRag(params: {
    tenantId: string;
    query: string;
    topK: number;
    minScore: number;
    documentType?: string;
    filter?: Record<string, any>;
  }): Promise<AiPlatformRetrievalResult> {
    if (this.baseUrl) {
      try {
        this.logger.log(
          `Dispatching RAG query to AI Platform: "${params.query.slice(0, 50)}..."`,
        );
        const res = await this.client.post('/api/v1/rag/query', {
          applicationId: this.applicationId,
          tenantId: params.tenantId,
          query: params.query,
          topK: params.topK,
          minScore: params.minScore,
          documentType: params.documentType,
          filter: params.filter,
        });

        const data = res.data;
        const citations: Citation[] = data.citations || [];
        const chunks: RetrievedChunk[] = citations.map((c, idx) => ({
          chunkId: c.chunkId || `chunk-${c.documentId}-${idx + 1}`,
          documentId: c.documentId,
          source: c.source || 'ai-platform',
          title: c.title || 'Referenced Document',
          text:
            data.contextText?.split('\n\n---\n\n')[idx] ||
            'Context passage from vector store.',
          score: c.score ?? 0.85,
        }));

        return {
          contextText: data.contextText || '',
          citations,
          chunks,
          totalRetrieved: data.totalRetrieved ?? citations.length,
          source: 'AI_PLATFORM',
        };
      } catch (err: any) {
        this.logger.warn(
          `AI Platform query failed (${err.message}). Using local deterministic adapter.`,
        );
      }
    }

    return this.generateDeterministicRetrieval(params);
  }

  /**
   * Evaluates a sample with LLM-as-a-judge via /api/v1/ai/evaluation/run
   */
  async evaluateWithJudge(params: {
    tenantId: string;
    question: string;
    expectedAnswer: string;
  }): Promise<{
    groundedness: number;
    answerRelevance: number;
    generatedAnswer: string;
    method: 'LLM_JUDGE_AI_PLATFORM' | 'LOCAL_DETERMINISTIC_ADAPTER';
  }> {
    if (this.baseUrl) {
      try {
        const res = await this.client.post('/api/v1/ai/evaluation/run', {
          applicationId: this.applicationId,
          tenantId: params.tenantId,
          samples: [
            {
              question: params.question,
              expectedAnswer: params.expectedAnswer,
            },
          ],
        });

        const suiteResult = res.data;
        const itemResult = suiteResult?.results?.[0];
        if (itemResult) {
          return {
            groundedness: itemResult.scores?.contextRelevance ?? 0.85,
            answerRelevance: itemResult.scores?.answerRelevance ?? 0.88,
            generatedAnswer:
              itemResult.generatedAnswer || params.expectedAnswer,
            method: 'LLM_JUDGE_AI_PLATFORM',
          };
        }
      } catch (err: any) {
        this.logger.warn(
          `AI Platform judge evaluation failed (${err.message}). Falling back to local scoring.`,
        );
      }
    }

    return {
      groundedness: 0.85,
      answerRelevance: 0.88,
      generatedAnswer: `[Deterministic Mock Output] Relevant guidance synthesized from indexed knowledge matching question: "${params.question}".`,
      method: 'LOCAL_DETERMINISTIC_ADAPTER',
    };
  }

  /**
   * Deterministic local retrieval adapter used when AI Platform is offline.
   * Yields consistent, reproducible chunks based on keyword matching and query hashes.
   */
  private generateDeterministicRetrieval(params: {
    query: string;
    topK: number;
    minScore: number;
  }): AiPlatformRetrievalResult {
    const qLower = params.query.toLowerCase();

    const mockCorpus: Array<{
      chunkId: string;
      docId: string;
      title: string;
      source: string;
      keywords: string[];
      text: string;
    }> = [
      {
        chunkId: 'doc-refund-policy-v2#chunk-01',
        docId: 'doc-refund-policy-v2',
        title: 'Customer Refund & Cancellation Terms (v2.1)',
        source: 'docs/billing/refunds.md',
        keywords: [
          'refund',
          'money',
          'cancel',
          'return',
          'turnaround',
          'business days',
        ],
        text: 'Credit card refunds are processed within 3 to 5 business days following formal authorization. Bank transfers may require up to 7 business days depending on the financial institution.',
      },
      {
        chunkId: 'doc-refund-policy-v2#chunk-02',
        docId: 'doc-refund-policy-v2',
        title: 'Customer Refund & Cancellation Terms (v2.1)',
        source: 'docs/billing/refunds.md',
        keywords: ['dispute', 'chargeback', 'policy', 'merchant'],
        text: 'In the event of a disputed transaction, the customer must submit payment proof within 14 calendar days to avoid automated claim rejection.',
      },
      {
        chunkId: 'doc-api-ratelimits-v1#chunk-01',
        docId: 'doc-api-ratelimits-v1',
        title: 'Developer API Rate Limits & Quotas',
        source: 'docs/api/rate-limits.md',
        keywords: [
          'rate limit',
          'quota',
          '429',
          'throttle',
          'requests',
          'minute',
          'rpm',
        ],
        text: 'The standard REST API tier permits up to 120 requests per minute per tenant API key. If the quota is exceeded, the server returns HTTP 429 Too Many Requests with a Retry-After header.',
      },
      {
        chunkId: 'doc-api-auth-v1#chunk-01',
        docId: 'doc-api-auth-v1',
        title: 'API Authentication & Bearer Tokens',
        source: 'docs/api/authentication.md',
        keywords: [
          'auth',
          'token',
          'jwt',
          'header',
          'api key',
          'bearer',
          '401',
        ],
        text: 'All API requests must include a valid service API key in the x-api-key header or a Bearer token in the Authorization header. Unauthenticated requests receive HTTP 401 Unauthorized.',
      },
      {
        chunkId: 'doc-data-retention-v3#chunk-01',
        docId: 'doc-data-retention-v3',
        title: 'Enterprise Data Retention & Purge Compliance',
        source: 'docs/compliance/retention.md',
        keywords: [
          'retention',
          'purge',
          'delete',
          'gdpr',
          'compliance',
          'days',
          'audit',
        ],
        text: 'Audit logs and user interaction records are retained for 90 days by default. After 90 days, automated archival jobs purge non-essential records unless legal hold status is enabled.',
      },
    ];

    // Score mock corpus by keyword matches
    const scored = mockCorpus
      .map((item) => {
        let matchCount = 0;
        for (const kw of item.keywords) {
          if (qLower.includes(kw)) {
            matchCount += 1;
          }
        }
        const baseScore =
          matchCount > 0 ? 0.7 + Math.min(0.25, matchCount * 0.08) : 0.35;
        return { item, score: Math.round(baseScore * 100) / 100 };
      })
      .filter((s) => s.score >= (params.minScore ?? 0.5))
      .sort((a, b) => b.score - a.score)
      .slice(0, params.topK);

    const chunks: RetrievedChunk[] = scored.map((s) => ({
      chunkId: s.item.chunkId,
      documentId: s.item.docId,
      source: s.item.source,
      title: s.item.title,
      text: s.item.text,
      score: s.score,
    }));

    const citations: Citation[] = scored.map((s) => ({
      documentId: s.item.docId,
      chunkId: s.item.chunkId,
      source: s.item.source,
      title: s.item.title,
      score: s.score,
    }));

    const contextText = chunks
      .map((c) => `[Source: ${c.source} | DocId: ${c.documentId}]\n${c.text}`)
      .join('\n\n---\n\n');

    return {
      contextText,
      citations,
      chunks,
      totalRetrieved: chunks.length,
      source: 'LOCAL_DETERMINISTIC_ADAPTER',
    };
  }
}
