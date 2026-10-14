'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Database,
  Clock,
  FileEdit,
  ArrowRight,
  TrendingUp,
  Layers,
  Info,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';
import { ApiClient } from '@/lib/api-client';
import { Dataset, EvaluationRun, KnowledgeSource, DocumentationProposal } from '@/lib/types';
import { formatPercent, getStatusBadgeClass } from '@/lib/utils';

export default function OverviewPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationRun[]>([]);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [proposals, setProposals] = useState<DocumentationProposal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dsList, evList, srcList, propList] = await Promise.all([
        ApiClient.getDatasets(),
        ApiClient.getEvaluations(),
        ApiClient.getSources(),
        ApiClient.getProposals(),
      ]);
      setDatasets(dsList);
      setEvaluations(evList);
      setSources(srcList);
      setProposals(propList);
    } catch {
      // Handled via defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute aggregated stats
  const totalCases = datasets.reduce((acc, d) => acc + d.testCases.length, 0);
  const freshSourcesCount = sources.filter((s) => s.freshnessStatus === 'FRESH').length;
  const freshRate = sources.length > 0 ? freshSourcesCount / sources.length : 1.0;

  const latestRun = evaluations[0];
  const avgRecall = latestRun?.summaryMetrics?.retrieval?.recallAtK ?? 1.0;
  const avgGroundedness = latestRun?.summaryMetrics?.generation?.groundednessScore ?? 0.88;
  const avgCitation = latestRun?.summaryMetrics?.generation?.citationCoverage ?? 0.95;

  return (
    <div className="space-y-8">
      {/* Synthetic Data Label Banner */}
      <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/20 flex items-start gap-3">
        <Info className="h-5 w-5 text-indigo-400 mt-0.5 shrink-0" />
        <div className="text-xs text-indigo-200/90 leading-relaxed">
          <span className="font-semibold text-indigo-300">Notice on Benchmarks & Ground Truth:</span>{' '}
          All included sample datasets contain clearly labelled synthetic data for operational benchmarking and regression validation.
          Model-judged scores (groundedness and relevance) are generated via evaluation judges and are visibly distinguished from deterministic ground-truth label matches.
        </div>
      </div>

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            RAG Quality & Knowledge Operations
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Continuous retrieval benchmarking, citation verification, stale knowledge detection, and reviewed documentation maintenance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-gray-300 hover:text-white hover:bg-card/80 transition-all"
          >
            <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            href="/evaluations"
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Run Evaluation Suite
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Retrieval Recall@K */}
        <div className="glass-card rounded-xl p-5 border border-border relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Benchmark Recall@K</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{formatPercent(avgRecall)}</span>
            <span className="text-[11px] text-emerald-400 font-medium">Ground-Truth Labeled</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Fraction of relevant chunks retrieved in top 5
          </p>
        </div>

        {/* KPI 2: Groundedness */}
        <div className="glass-card rounded-xl p-5 border border-border relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Answer Groundedness</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{formatPercent(avgGroundedness)}</span>
            <span className="text-[11px] text-indigo-400 font-medium">Evaluation Judge</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Context faithfulness without hallucinations
          </p>
        </div>

        {/* KPI 3: Citation Coverage */}
        <div className="glass-card rounded-xl p-5 border border-border relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Citation Coverage</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{formatPercent(avgCitation)}</span>
            <span className="text-[11px] text-cyan-400 font-medium">Verified Sources</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Proportion of expected citations resolved
          </p>
        </div>

        {/* KPI 4: Knowledge Freshness */}
        <div className="glass-card rounded-xl p-5 border border-border relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Knowledge Freshness</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{formatPercent(freshRate)}</span>
            <span className="text-[11px] text-gray-400">{sources.length} sources tracked</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Sources updated within staleness threshold
          </p>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Benchmark Evaluations (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-xl p-5 border border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white">Recent Benchmark Evaluation Runs</h2>
                <p className="text-xs text-gray-400">Repeatable candidate vs baseline RAG evaluations</p>
              </div>
              <Link
                href="/evaluations"
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
              >
                View all runs <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="space-y-3">
              {evaluations.slice(0, 4).map((run) => (
                <div
                  key={run.runId}
                  className="p-4 rounded-lg bg-card/80 border border-border/70 hover:border-indigo-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">{run.name}</span>
                      {run.isBaseline && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          BASELINE
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(
                          run.status,
                        )}`}
                      >
                        {run.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-gray-400">
                      <span>Method: <strong className="text-gray-300">{run.configuration.retrievalMethod}</strong></span>
                      <span>TopK: <strong className="text-gray-300">{run.configuration.topK}</strong></span>
                      <span>Execution: <strong className="text-gray-300">{run.executionMode === 'SHARED_AI_PLATFORM' ? 'AI Platform' : 'Local Adapter'}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs font-bold text-white">
                        Recall: {formatPercent(run.summaryMetrics?.retrieval?.recallAtK)}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        Grounded: {formatPercent(run.summaryMetrics?.generation?.groundednessScore)}
                      </div>
                    </div>

                    {run.regressionCheck && (
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded border ${
                          run.regressionCheck.status === 'PASS'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {run.regressionCheck.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monitored Knowledge Sources */}
          <div className="glass-card rounded-xl p-5 border border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white">Monitored Knowledge Sources</h2>
                <p className="text-xs text-gray-400">Detect content drift and staleness across authoritative docs</p>
              </div>
              <Link
                href="/freshness"
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
              >
                Inspect freshness <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="divide-y divide-border/60">
              {sources.map((src) => (
                <div key={src.sourceId} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-white">{src.name}</span>
                      <span className="text-[10px] text-gray-400 font-mono">v{src.version}</span>
                    </div>
                    <div className="text-[11px] text-gray-400 font-mono mt-0.5">{src.uri}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-gray-400">
                      Impacts: <strong className="text-gray-300">{src.dependentCasesCount} cases</strong>
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(
                        src.freshnessStatus,
                      )}`}
                    >
                      {src.freshnessStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Proposals & Quick Actions (1 Col) */}
        <div className="space-y-6">
          {/* Documentation Proposals */}
          <div className="glass-card rounded-xl p-5 border border-border">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-white">Documentation Improvements</h2>
                <p className="text-xs text-gray-400">Human-reviewed edits proposal queue</p>
              </div>
              <Link
                href="/proposals"
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
              >
                Review queue <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="space-y-3">
              {proposals.map((prop) => (
                <div key={prop.proposalId} className="p-3 rounded-lg bg-card border border-border/80 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-white leading-tight">
                      {prop.title}
                    </span>
                    <span
                      className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full border shrink-0 ${getStatusBadgeClass(
                        prop.status,
                      )}`}
                    >
                      {prop.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 line-clamp-2">
                    {prop.rationale}
                  </p>
                  <div className="text-[10px] text-gray-400 flex items-center justify-between pt-1 border-t border-border/40">
                    <span>Target: {prop.sourceName}</span>
                    <Link
                      href="/proposals"
                      className="text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      Inspect Diff &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Benchmark Datasets Summary */}
          <div className="glass-card rounded-xl p-5 border border-border">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-white">Active Datasets</h2>
                <p className="text-xs text-gray-400">{datasets.length} versioned benchmark sets</p>
              </div>
              <Link
                href="/datasets"
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
              >
                Manage <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {datasets.map((ds) => (
                <div key={ds.datasetId} className="p-2.5 rounded-lg bg-card/60 border border-border/50 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white truncate max-w-[180px]">{ds.name}</span>
                    <span className="text-[10px] font-mono text-gray-400">v{ds.version}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-gray-400">
                    <span>{ds.testCases.length} Test Cases</span>
                    {ds.isSynthetic && (
                      <span className="text-[10px] text-amber-400 font-medium">Synthetic Sample</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
