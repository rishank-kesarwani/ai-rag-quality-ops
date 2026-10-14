'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart3,
  Play,
  Layers,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Hash,
  ShieldCheck,
  Search,
  Filter,
} from 'lucide-react';
import { ApiClient } from '@/lib/api-client';
import { EvaluationRun, Dataset, CaseResult } from '@/lib/types';
import { formatPercent, formatScore, getStatusBadgeClass } from '@/lib/utils';

export default function EvaluationsPage() {
  const [evaluations, setEvaluations] = useState<EvaluationRun[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedRun, setSelectedRun] = useState<EvaluationRun | null>(null);
  const [baselineRun, setBaselineRun] = useState<EvaluationRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRunModal, setShowRunModal] = useState(false);

  // Trigger modal state
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [candidateLabel, setCandidateLabel] = useState('Hybrid Search + BGE Reranker');
  const [retrievalMethod, setRetrievalMethod] = useState<'DENSE' | 'SPARSE_BM25' | 'HYBRID' | 'RERANKED'>('HYBRID');
  const [topK, setTopK] = useState(5);
  const [minScore, setMinScore] = useState(0.5);
  const [selectedBaselineId, setSelectedBaselineId] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [runsList, dsList] = await Promise.all([
        ApiClient.getEvaluations(),
        ApiClient.getDatasets(),
      ]);
      setEvaluations(runsList);
      setDatasets(dsList);

      if (runsList.length > 0) {
        const primary = runsList[0];
        setSelectedRun(primary);

        if (primary.baselineRunId) {
          const matchedBaseline = runsList.find((r) => r.runId === primary.baselineRunId);
          setBaselineRun(matchedBaseline || null);
        } else {
          const autoBaseline = runsList.find((r) => r.isBaseline && r.runId !== primary.runId);
          setBaselineRun(autoBaseline || null);
        }
      }

      if (dsList.length > 0 && !selectedDatasetId) {
        setSelectedDatasetId(dsList[0].datasetId);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedDatasetId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectRun = (run: EvaluationRun) => {
    setSelectedRun(run);
    if (run.baselineRunId) {
      const matched = evaluations.find((r) => r.runId === run.baselineRunId);
      setBaselineRun(matched || null);
    } else {
      const autoBaseline = evaluations.find((r) => r.isBaseline && r.runId !== run.runId);
      setBaselineRun(autoBaseline || null);
    }
  };

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newRun = await ApiClient.runEvaluation({
        datasetId: selectedDatasetId,
        candidateLabel,
        retrievalMethod,
        topK,
        minScore,
        baselineRunId: selectedBaselineId || undefined,
      });
      setShowRunModal(false);
      await loadData();
      setSelectedRun(newRun);
    } catch (err: any) {
      alert(`Evaluation failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-400" />
            Retrieval Benchmarking & Candidate vs Baseline Comparator
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Compare candidate retrieval configurations against baselines. Validates Recall@K, Precision@K, MRR, nDCG, Groundedness, and Citations.
          </p>
        </div>
        <button
          onClick={() => setShowRunModal(true)}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all self-start sm:self-auto"
        >
          <Play className="h-4 w-4" />
          Trigger Evaluation Suite
        </button>
      </div>

      {/* Main Grid: Run History + Comparator Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Runs List */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Evaluation Runs ({evaluations.length})
          </h2>
          {evaluations.map((run) => {
            const isSelected = selectedRun?.runId === run.runId;
            return (
              <div
                key={run.runId}
                onClick={() => handleSelectRun(run)}
                className={`p-4 rounded-xl cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-card border-indigo-500/50 shadow-md ring-1 ring-indigo-500/30'
                    : 'glass-card border-border hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-white">{run.name}</h3>
                  <span
                    className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${getStatusBadgeClass(
                      run.status,
                    )}`}
                  >
                    {run.status}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-400">
                  <span className="font-mono bg-card px-1.5 py-0.5 rounded border border-border">
                    {run.configuration.retrievalMethod}
                  </span>
                  <span>TopK: {run.configuration.topK}</span>
                  {run.isBaseline && (
                    <span className="text-[10px] font-bold text-indigo-400">BASELINE</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-border/50 text-[11px]">
                  <div>
                    <span className="text-gray-500">Recall: </span>
                    <strong className="text-white">
                      {formatPercent(run.summaryMetrics?.retrieval?.recallAtK)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-500">Grounded: </span>
                    <strong className="text-white">
                      {formatPercent(run.summaryMetrics?.generation?.groundednessScore)}
                    </strong>
                  </div>
                </div>

                {run.regressionCheck && (
                  <div className="mt-2 text-[10px] flex items-center justify-between text-gray-400">
                    <span>Regression Check:</span>
                    <span
                      className={`font-bold px-1.5 py-0.5 rounded border ${
                        run.regressionCheck.status === 'PASS'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}
                    >
                      {run.regressionCheck.status}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: Candidate vs Baseline Comparison & Case Evidence (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {selectedRun ? (
            <>
              {/* Comparison Header Card */}
              <div className="glass-card rounded-xl p-5 border border-border space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-white">{selectedRun.name}</h2>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-card border border-border text-gray-300">
                        {selectedRun.executionMode === 'SHARED_AI_PLATFORM'
                          ? 'AI Platform Gateway'
                          : 'Deterministic Local Adapter'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Tested on dataset: <strong>{selectedRun.datasetId}</strong> (v{selectedRun.datasetVersion})
                    </p>
                  </div>

                  {selectedRun.regressionCheck && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border">
                      <span className="text-xs text-gray-400 font-medium">Regression Gate:</span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded border ${
                          selectedRun.regressionCheck.status === 'PASS'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {selectedRun.regressionCheck.status}
                      </span>
                    </div>
                  )}
                </div>

                {/* Side-by-Side Metric Comparison Table */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                    Metric Comparison {baselineRun ? `(vs Baseline: ${baselineRun.name})` : '(No baseline selected)'}
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border/80 text-gray-400">
                          <th className="py-2 font-medium">Metric Dimension</th>
                          <th className="py-2 font-medium">Type</th>
                          <th className="py-2 font-medium">Candidate Value</th>
                          <th className="py-2 font-medium">Baseline Value</th>
                          <th className="py-2 font-medium">Delta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {/* Recall@K */}
                        <tr>
                          <td className="py-2.5 font-semibold text-white">Recall@K</td>
                          <td className="py-2.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Ground Truth
                            </span>
                          </td>
                          <td className="py-2.5 text-white font-mono">
                            {formatPercent(selectedRun.summaryMetrics?.retrieval?.recallAtK)}
                          </td>
                          <td className="py-2.5 text-gray-400 font-mono">
                            {baselineRun
                              ? formatPercent(baselineRun.summaryMetrics?.retrieval?.recallAtK)
                              : '-'}
                          </td>
                          <td className="py-2.5 font-mono">
                            {baselineRun &&
                            selectedRun.summaryMetrics?.retrieval?.recallAtK !== null &&
                            baselineRun.summaryMetrics?.retrieval?.recallAtK !== null ? (
                              <DeltaBadge
                                delta={
                                  selectedRun.summaryMetrics.retrieval.recallAtK -
                                  baselineRun.summaryMetrics.retrieval.recallAtK
                                }
                              />
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>

                        {/* Precision@K */}
                        <tr>
                          <td className="py-2.5 font-semibold text-white">Precision@K</td>
                          <td className="py-2.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Ground Truth
                            </span>
                          </td>
                          <td className="py-2.5 text-white font-mono">
                            {formatPercent(selectedRun.summaryMetrics?.retrieval?.precisionAtK)}
                          </td>
                          <td className="py-2.5 text-gray-400 font-mono">
                            {baselineRun
                              ? formatPercent(baselineRun.summaryMetrics?.retrieval?.precisionAtK)
                              : '-'}
                          </td>
                          <td className="py-2.5 font-mono">
                            {baselineRun &&
                            selectedRun.summaryMetrics?.retrieval?.precisionAtK !== null &&
                            baselineRun.summaryMetrics?.retrieval?.precisionAtK !== null ? (
                              <DeltaBadge
                                delta={
                                  selectedRun.summaryMetrics.retrieval.precisionAtK -
                                  baselineRun.summaryMetrics.retrieval.precisionAtK
                                }
                              />
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>

                        {/* MRR */}
                        <tr>
                          <td className="py-2.5 font-semibold text-white">MRR (Mean Reciprocal Rank)</td>
                          <td className="py-2.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Ground Truth
                            </span>
                          </td>
                          <td className="py-2.5 text-white font-mono">
                            {formatScore(selectedRun.summaryMetrics?.retrieval?.mrr)}
                          </td>
                          <td className="py-2.5 text-gray-400 font-mono">
                            {baselineRun
                              ? formatScore(baselineRun.summaryMetrics?.retrieval?.mrr)
                              : '-'}
                          </td>
                          <td className="py-2.5 font-mono">
                            {baselineRun &&
                            selectedRun.summaryMetrics?.retrieval?.mrr !== null &&
                            baselineRun.summaryMetrics?.retrieval?.mrr !== null ? (
                              <DeltaBadge
                                delta={
                                  selectedRun.summaryMetrics.retrieval.mrr -
                                  baselineRun.summaryMetrics.retrieval.mrr
                                }
                              />
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>

                        {/* nDCG@K */}
                        <tr>
                          <td className="py-2.5 font-semibold text-white">nDCG@K</td>
                          <td className="py-2.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Ground Truth
                            </span>
                          </td>
                          <td className="py-2.5 text-white font-mono">
                            {formatScore(selectedRun.summaryMetrics?.retrieval?.ndcgAtK)}
                          </td>
                          <td className="py-2.5 text-gray-400 font-mono">
                            {baselineRun
                              ? formatScore(baselineRun.summaryMetrics?.retrieval?.ndcgAtK)
                              : '-'}
                          </td>
                          <td className="py-2.5 font-mono">
                            {baselineRun &&
                            selectedRun.summaryMetrics?.retrieval?.ndcgAtK !== null &&
                            baselineRun.summaryMetrics?.retrieval?.ndcgAtK !== null ? (
                              <DeltaBadge
                                delta={
                                  selectedRun.summaryMetrics.retrieval.ndcgAtK -
                                  baselineRun.summaryMetrics.retrieval.ndcgAtK
                                }
                              />
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>

                        {/* Groundedness */}
                        <tr>
                          <td className="py-2.5 font-semibold text-white">Groundedness Score</td>
                          <td className="py-2.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              Evaluation Judge
                            </span>
                          </td>
                          <td className="py-2.5 text-white font-mono">
                            {formatPercent(selectedRun.summaryMetrics?.generation?.groundednessScore)}
                          </td>
                          <td className="py-2.5 text-gray-400 font-mono">
                            {baselineRun
                              ? formatPercent(baselineRun.summaryMetrics?.generation?.groundednessScore)
                              : '-'}
                          </td>
                          <td className="py-2.5 font-mono">
                            {baselineRun ? (
                              <DeltaBadge
                                delta={
                                  selectedRun.summaryMetrics.generation.groundednessScore -
                                  baselineRun.summaryMetrics.generation.groundednessScore
                                }
                              />
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>

                        {/* Citation Coverage */}
                        <tr>
                          <td className="py-2.5 font-semibold text-white">Citation Coverage</td>
                          <td className="py-2.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                              Citation Audit
                            </span>
                          </td>
                          <td className="py-2.5 text-white font-mono">
                            {formatPercent(selectedRun.summaryMetrics?.generation?.citationCoverage)}
                          </td>
                          <td className="py-2.5 text-gray-400 font-mono">
                            {baselineRun
                              ? formatPercent(baselineRun.summaryMetrics?.generation?.citationCoverage)
                              : '-'}
                          </td>
                          <td className="py-2.5 font-mono">
                            {baselineRun ? (
                              <DeltaBadge
                                delta={
                                  selectedRun.summaryMetrics.generation.citationCoverage -
                                  baselineRun.summaryMetrics.generation.citationCoverage
                                }
                              />
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Case Results & Retrieval Evidence Inspector */}
              <div className="glass-card rounded-xl p-5 border border-border space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Retrieval Evidence & Case Inspection ({selectedRun.caseResults.length} Cases)
                </h3>

                <div className="space-y-4">
                  {selectedRun.caseResults.map((cResult) => (
                    <div
                      key={cResult.caseId}
                      className="p-4 rounded-xl bg-card border border-border/80 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="text-xs font-bold text-white">{cResult.query}</div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border self-start sm:self-auto ${getStatusBadgeClass(
                            cResult.status,
                          )}`}
                        >
                          {cResult.status}
                        </span>
                      </div>

                      {cResult.failureReason && (
                        <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                          <strong>Failure Rationale:</strong> {cResult.failureReason}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded bg-background/50 border border-border/40">
                          <span className="text-gray-400 font-medium">Expected Ground Truth:</span>
                          <p className="text-gray-200 mt-1">{cResult.expectedAnswer}</p>
                        </div>
                        <div className="p-3 rounded bg-background/50 border border-border/40">
                          <span className="text-gray-400 font-medium">
                            Generated Synthesis ({cResult.metrics.generation.evaluationMethod}):
                          </span>
                          <p className="text-gray-200 mt-1">
                            {cResult.generatedAnswer || 'No answer generated.'}
                          </p>
                        </div>
                      </div>

                      {/* Retrieved Chunks Evidence */}
                      <div className="pt-2 border-t border-border/40 space-y-2">
                        <span className="text-[11px] font-semibold text-gray-400">
                          Retrieved Chunks & Vector Scores ({cResult.retrievedChunks.length}):
                        </span>

                        <div className="space-y-2">
                          {cResult.retrievedChunks.map((chunk, idx) => (
                            <div
                              key={chunk.chunkId || idx}
                              className={`p-2.5 rounded border text-xs ${
                                chunk.isRelevantGroundTruth
                                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                                  : 'bg-card/70 border-border/50 text-gray-300'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[11px] mb-1 font-mono">
                                <span className="font-semibold text-white">
                                  {chunk.chunkId} ({chunk.source})
                                </span>
                                <div className="flex items-center gap-2">
                                  {chunk.isRelevantGroundTruth && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                                      GROUND TRUTH MATCH
                                    </span>
                                  )}
                                  <span className="text-indigo-400 font-semibold">
                                    Score: {chunk.score.toFixed(3)}
                                  </span>
                                </div>
                              </div>
                              <p className="text-[11px] leading-relaxed">{chunk.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="glass-card rounded-xl p-12 text-center text-gray-400 border border-border">
              Select an evaluation run to view candidate metrics and evidence.
            </div>
          )}
        </div>
      </div>

      {/* Trigger Modal */}
      {showRunModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card rounded-xl p-5 sm:p-6 border border-border max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold text-white">Trigger Evaluation Suite</h2>
            <form onSubmit={handleExecute} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-300 mb-1 font-medium">Target Benchmark Dataset</label>
                <select
                  value={selectedDatasetId}
                  onChange={(e) => setSelectedDatasetId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-card border border-border text-white focus:outline-none focus:border-indigo-500"
                >
                  {datasets.map((d) => (
                    <option key={d.datasetId} value={d.datasetId}>
                      {d.name} ({d.testCases.length} cases)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-medium">Candidate Label</label>
                <input
                  type="text"
                  required
                  value={candidateLabel}
                  onChange={(e) => setCandidateLabel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-card border border-border text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 mb-1 font-medium">Retrieval Method</label>
                  <select
                    value={retrievalMethod}
                    onChange={(e) => setRetrievalMethod(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-card border border-border text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="HYBRID">Hybrid (Dense + Sparse)</option>
                    <option value="DENSE">Dense Vector</option>
                    <option value="SPARSE_BM25">Sparse BM25</option>
                    <option value="RERANKED">Dense + BGE Rerank</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 mb-1 font-medium">Top K Chunks</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={topK}
                    onChange={(e) => setTopK(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-lg bg-card border border-border text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-medium">Baseline Run for Regression Comparison</label>
                <select
                  value={selectedBaselineId}
                  onChange={(e) => setSelectedBaselineId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-card border border-border text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">None (Standalone Run)</option>
                  {evaluations.map((r) => (
                    <option key={r.runId} value={r.runId}>
                      {r.name} {r.isBaseline ? '[BASELINE]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowRunModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-border text-gray-400 hover:text-white text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
                >
                  Run Benchmark
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  const isPositive = delta > 0.001;
  const isNegative = delta < -0.001;
  const formatted = `${delta > 0 ? '+' : ''}${(delta * 100).toFixed(1)}%`;

  if (isNegative) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400">
        <TrendingDown className="h-3 w-3" />
        {formatted}
      </span>
    );
  }
  if (isPositive) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
        <TrendingUp className="h-3 w-3" />
        {formatted}
      </span>
    );
  }
  return <span className="text-[11px] text-gray-500">0.0%</span>;
}
