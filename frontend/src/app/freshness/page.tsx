'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Clock,
  RotateCw,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  FileText,
  Hash,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { ApiClient } from '@/lib/api-client';
import { KnowledgeSource } from '@/lib/types';
import { getStatusBadgeClass } from '@/lib/utils';

export default function FreshnessPage() {
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<KnowledgeSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  const loadSources = useCallback(async () => {
    setLoading(true);
    try {
      const list = await ApiClient.getSources();
      setSources(list);
      if (list.length > 0 && !selectedSource) {
        setSelectedSource(list[0]);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedSource]);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  const handleCheckOne = async (sourceId: string) => {
    setCheckingId(sourceId);
    try {
      const updated = await ApiClient.checkSourceFreshness(sourceId);
      setSources((prev) => prev.map((s) => (s.sourceId === sourceId ? updated : s)));
      if (selectedSource?.sourceId === sourceId) {
        setSelectedSource(updated);
      }
    } catch (err: any) {
      alert(`Freshness check failed: ${err.message}`);
    } finally {
      setCheckingId(null);
    }
  };

  const handleCheckAll = async () => {
    setLoading(true);
    try {
      await ApiClient.checkAllSourcesFreshness();
      await loadSources();
    } catch (err: any) {
      alert(`Batch check failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const staleCount = sources.filter(
    (s) => s.freshnessStatus === 'STALE_WARNING' || s.freshnessStatus === 'EXPIRED',
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-400" />
            Knowledge Freshness & Stale Source Detection
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Detect stale or drifted documents and track exactly which evaluation benchmarks and test cases are impacted.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCheckAll}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all"
          >
            <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Check All Sources Freshness
          </button>
        </div>
      </div>

      {/* Staleness Notice Banner if any stale */}
      {staleCount > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/20 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-200/90">
            <span className="font-semibold text-amber-300">Stale Knowledge Warning:</span>{' '}
            {staleCount} monitored document(s) have exceeded their freshness thresholds. Dependent benchmark cases may be evaluating against obsolete ground truth.
          </div>
        </div>
      )}

      {/* Main Grid: Sources Table + Dependent Cases Impact Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Sources List (2 Cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="glass-card rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border/80 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Monitored Knowledge Sources ({sources.length})
              </h2>
              <span className="text-[11px] text-gray-400">SSRF &amp; Path Traversal Guarded</span>
            </div>

            <div className="divide-y divide-border/60">
              {sources.map((src) => {
                const isSelected = selectedSource?.sourceId === src.sourceId;
                const isChecking = checkingId === src.sourceId;

                return (
                  <div
                    key={src.sourceId}
                    onClick={() => setSelectedSource(src)}
                    className={`p-4 transition-all cursor-pointer ${
                      isSelected ? 'bg-card' : 'hover:bg-card/50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{src.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-card border border-border text-gray-300">
                            v{src.version}
                          </span>
                          <span
                            className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(
                              src.freshnessStatus,
                            )}`}
                          >
                            {src.freshnessStatus}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 font-mono mt-1">
                          URI: {src.uri} ({src.sourceType})
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <span className="text-[11px] text-gray-400">
                          Impacts: <strong className="text-white">{src.dependentCasesCount} cases</strong>
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCheckOne(src.sourceId);
                          }}
                          disabled={isChecking}
                          className="px-2.5 py-1 rounded border border-border hover:border-indigo-500 text-[11px] text-gray-300 hover:text-white transition-all flex items-center gap-1.5"
                        >
                          <RotateCw className={`h-3 w-3 ${isChecking ? 'animate-spin' : ''}`} />
                          Check
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-border/40 text-[10px] text-gray-400 font-mono">
                      <div>Hash: {src.contentHash.slice(0, 12)}...</div>
                      <div>TTL: {src.staleThresholdHours}h</div>
                      <div>Checked: {new Date(src.lastCheckedAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Impact Analysis Drawer (1 Col) */}
        <div className="space-y-4">
          {selectedSource ? (
            <div className="glass-card rounded-xl p-5 border border-border space-y-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Dependent Benchmark Cases Impact Analysis
                </h3>
                <h4 className="text-sm font-bold text-white mt-1">{selectedSource.name}</h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  The following evaluation test cases reference this source as ground-truth evidence:
                </p>
              </div>

              {selectedSource.dependentCases && selectedSource.dependentCases.length > 0 ? (
                <div className="space-y-2.5">
                  {selectedSource.dependentCases.map((dep, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-card border border-border text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[10px] text-gray-400">
                        <span className="font-semibold text-indigo-400">
                          Dataset: {dep.datasetId} (v{dep.datasetVersion})
                        </span>
                        <span className="font-mono">Case: {dep.caseId}</span>
                      </div>
                      <p className="text-xs text-gray-200">{dep.query}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-lg bg-card text-center text-xs text-gray-400 border border-border">
                  No active benchmark cases currently depend on this knowledge source.
                </div>
              )}

              {/* Source Details & Content Snippet */}
              <div className="pt-3 border-t border-border/50 space-y-2 text-xs">
                <span className="font-semibold text-gray-300">Recorded Content Snippet:</span>
                <pre className="p-3 rounded bg-background/80 border border-border text-[11px] font-mono text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {selectedSource.contentSnippet || 'No snippet preview stored.'}
                </pre>
              </div>
            </div>
          ) : (
            <div className="glass-card rounded-xl p-12 text-center text-gray-400 border border-border">
              Select a source to inspect dependent benchmark cases.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
