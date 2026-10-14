import {
  Dataset,
  EvaluationRun,
  KnowledgeSource,
  DocumentationProposal,
  SystemHealth,
} from './types';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export class ApiClient {
  private static getHeaders(tenantId: string = 'tenant-default'): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'x-tenant-id': tenantId,
    };
  }

  static async getDatasets(tenantId: string = 'tenant-default'): Promise<Dataset[]> {
    try {
      const res = await fetch(`${API_BASE}/datasets`, {
        headers: this.getHeaders(tenantId),
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  }

  static async getDataset(datasetId: string, tenantId: string = 'tenant-default'): Promise<Dataset | null> {
    try {
      const res = await fetch(`${API_BASE}/datasets/${datasetId}`, {
        headers: this.getHeaders(tenantId),
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.data || null;
    } catch {
      return null;
    }
  }

  static async createDataset(
    data: { name: string; description: string; isSynthetic: boolean; tags: string[]; version?: string },
    tenantId: string = 'tenant-default',
  ): Promise<Dataset> {
    const res = await fetch(`${API_BASE}/datasets`, {
      method: 'POST',
      headers: this.getHeaders(tenantId),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to create dataset' }));
      throw new Error(err.message || 'Failed to create dataset');
    }
    const json = await res.json();
    return json.data;
  }

  static async getEvaluations(tenantId: string = 'tenant-default'): Promise<EvaluationRun[]> {
    try {
      const res = await fetch(`${API_BASE}/evaluations`, {
        headers: this.getHeaders(tenantId),
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  }

  static async getEvaluation(runId: string, tenantId: string = 'tenant-default'): Promise<EvaluationRun | null> {
    try {
      const res = await fetch(`${API_BASE}/evaluations/${runId}`, {
        headers: this.getHeaders(tenantId),
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.data || null;
    } catch {
      return null;
    }
  }

  static async runEvaluation(
    data: {
      datasetId: string;
      candidateLabel: string;
      retrievalMethod?: string;
      topK?: number;
      minScore?: number;
      baselineRunId?: string;
    },
    tenantId: string = 'tenant-default',
  ): Promise<EvaluationRun> {
    const res = await fetch(`${API_BASE}/evaluations/run`, {
      method: 'POST',
      headers: this.getHeaders(tenantId),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to execute evaluation' }));
      throw new Error(err.message || 'Failed to execute evaluation');
    }
    const json = await res.json();
    return json.data;
  }

  static async getSources(tenantId: string = 'tenant-default'): Promise<KnowledgeSource[]> {
    try {
      const res = await fetch(`${API_BASE}/sources`, {
        headers: this.getHeaders(tenantId),
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  }

  static async checkSourceFreshness(sourceId: string, tenantId: string = 'tenant-default'): Promise<KnowledgeSource> {
    const res = await fetch(`${API_BASE}/sources/${sourceId}/check-freshness`, {
      method: 'POST',
      headers: this.getHeaders(tenantId),
      body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error('Failed to evaluate source freshness');
    const json = await res.json();
    return json.data;
  }

  static async checkAllSourcesFreshness(tenantId: string = 'tenant-default'): Promise<any> {
    const res = await fetch(`${API_BASE}/sources/check-all`, {
      method: 'POST',
      headers: this.getHeaders(tenantId),
    });
    if (!res.ok) throw new Error('Failed to run batch freshness check');
    const json = await res.json();
    return json.data;
  }

  static async getProposals(tenantId: string = 'tenant-default'): Promise<DocumentationProposal[]> {
    try {
      const res = await fetch(`${API_BASE}/proposals`, {
        headers: this.getHeaders(tenantId),
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  }

  static async reviewProposal(
    proposalId: string,
    status: 'APPROVED' | 'REJECTED' | 'IN_REVIEW',
    reviewComment: string,
    reviewedBy: string,
    tenantId: string = 'tenant-default',
  ): Promise<DocumentationProposal> {
    const res = await fetch(`${API_BASE}/proposals/${proposalId}/review`, {
      method: 'PATCH',
      headers: this.getHeaders(tenantId),
      body: JSON.stringify({ status, reviewComment, reviewedBy }),
    });
    if (!res.ok) throw new Error('Failed to record review decision');
    const json = await res.json();
    return json.data;
  }

  static async getHealth(): Promise<SystemHealth | null> {
    try {
      const healthUrl = API_BASE.replace(/\/api\/v1\/?$/, '') + '/health/ready';
      const res = await fetch(healthUrl, { cache: 'no-store' });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }
}
