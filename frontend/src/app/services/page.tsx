'use client';

import { useEffect, useState } from 'react';
import {
  Server,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  ExternalLink,
  Code,
  Lock,
  Clock,
  Layers,
} from 'lucide-react';
import { ApiClient } from '@/lib/api-client';
import { SystemHealth } from '@/lib/types';
import { getStatusBadgeClass } from '@/lib/utils';

export default function ServicesPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const loadHealth = async () => {
    setLoading(true);
    try {
      const h = await ApiClient.getHealth();
      setHealth(h);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  const services = [
    {
      id: 'ai-platform',
      name: 'Shared AI Platform Service',
      description:
        'Provides embeddings, vector indexing (Qdrant), RAG retrieval, and LLM-as-a-judge evaluation suite.',
      status: health?.dependencies.aiPlatform.status || 'LOCAL_ADAPTER',
      configured: health?.dependencies.aiPlatform.configured ?? false,
      url: health?.dependencies.aiPlatform.url || 'http://localhost:5000',
      latencyMs: health?.dependencies.aiPlatform.latencyMs || 0,
      authMethod: 'Header: x-api-key or Authorization: Bearer <token>',
      endpoints: [
        'POST /api/v1/rag/query — Vector similarity search with multi-tenant filtering',
        'POST /api/v1/ai/evaluation/run — Automated LLM-as-a-judge quality suite',
        'POST /api/v1/rag/documents — Document ingestion & chunking',
        'GET /health — Liveness probe',
      ],
      fallback:
        'When unreachable or unconfigured, the platform automatically switches to a deterministic local adapter yielding reproducible chunks, citations, and scores, tagged visibly as LOCAL_DETERMINISTIC_ADAPTER.',
    },
    {
      id: 'model-regression',
      name: 'Model Regression Detection Service',
      description:
        'Evaluates candidate models or RAG pipelines against accepted baselines to detect metric regressions.',
      status: health?.dependencies.modelRegressionService.status || 'LOCAL_ENGINE',
      configured: health?.dependencies.modelRegressionService.configured ?? false,
      url: health?.dependencies.modelRegressionService.url || 'http://localhost:4002',
      latencyMs: health?.dependencies.modelRegressionService.latencyMs || 0,
      authMethod: 'Header: x-api-key or Authorization: Bearer <token>',
      endpoints: [
        'POST /api/v1/regression/check — PR & pipeline regression decision contract',
        'GET /api/v1/baselines — Historical active baselines catalogue',
        'GET /health — Service liveness probe',
      ],
      fallback:
        'When offline, local deterministic regression engine evaluates candidate deltas against baseline thresholds (5% drop flags regression), labeled as LOCAL_DETERMINISTIC_ENGINE.',
    },
    {
      id: 'notification-service',
      name: 'Shared Notification Service',
      description:
        'Dispatches high-priority email and push notifications for regression alerts, stale knowledge warnings, and reviewed document proposals.',
      status: health?.dependencies.notificationService.status || 'LOCAL_LOGGING',
      configured: health?.dependencies.notificationService.configured ?? false,
      url: health?.dependencies.notificationService.url || 'http://localhost:3001',
      latencyMs: health?.dependencies.notificationService.latencyMs || 0,
      authMethod: 'Header: x-api-key: NOTIFICATION_RAG_OPS_API_KEY',
      endpoints: [
        'POST /v1/notifications — Multi-channel notification ingestion',
        'GET /health — Service liveness probe',
      ],
      fallback:
        'Operates with resilient try/catch timeouts; if notification dispatch fails, structured logs are recorded without interrupting benchmark execution or crashing the server.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Server className="h-5 w-5 text-indigo-400" />
            Shared Services Architecture & Health
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Verified integration contracts, timeout behavior, and fallback mechanisms for shared enterprise services.
          </p>
        </div>
        <button
          onClick={loadHealth}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-gray-300 hover:text-white transition-all self-start sm:self-auto"
        >
          <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Health Status
        </button>
      </div>

      {/* Services Grid */}
      <div className="space-y-5">
        {services.map((svc) => (
          <div key={svc.id} className="glass-card rounded-xl p-5 border border-border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-sm font-bold text-white">{svc.name}</h2>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(
                      svc.status,
                    )}`}
                  >
                    {svc.status}
                  </span>
                  {svc.latencyMs > 0 && (
                    <span className="text-[10px] text-gray-400 font-mono">
                      {svc.latencyMs}ms
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">{svc.description}</p>
              </div>

              <div className="text-[11px] font-mono text-gray-400 bg-card px-2.5 py-1 rounded border border-border self-start sm:self-auto">
                {svc.url}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Endpoints & Contracts */}
              <div className="p-3.5 rounded-lg bg-card border border-border/80 space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-gray-300">
                  <Code className="h-3.5 w-3.5 text-indigo-400" />
                  Verified API Contracts
                </div>
                <ul className="space-y-1 font-mono text-[11px] text-gray-300">
                  {svc.endpoints.map((ep, idx) => (
                    <li key={idx} className="truncate">
                      &bull; {ep}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Authentication & Fallback */}
              <div className="p-3.5 rounded-lg bg-card border border-border/80 space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-gray-300">
                  <Lock className="h-3.5 w-3.5 text-cyan-400" />
                  Authentication &amp; Resilient Fallback
                </div>
                <div className="text-[11px] text-gray-400">
                  <strong className="text-gray-300">Auth:</strong> {svc.authMethod}
                </div>
                <div className="text-[11px] text-gray-400 leading-relaxed pt-1 border-t border-border/40">
                  <strong className="text-gray-300">Resilience:</strong> {svc.fallback}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
