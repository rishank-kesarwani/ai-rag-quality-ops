'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Database,
  Plus,
  Tag,
  CheckCircle2,
  AlertCircle,
  Copy,
  Hash,
  FileCode,
  ShieldAlert,
} from 'lucide-react';
import { ApiClient } from '@/lib/api-client';
import { Dataset, TestCase } from '@/lib/types';

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [isSynthetic, setIsSynthetic] = useState(true);
  const [tagsStr, setTagsStr] = useState('benchmark, synthetic');

  const loadDatasets = useCallback(async () => {
    setLoading(true);
    try {
      const list = await ApiClient.getDatasets();
      setDatasets(list);
      if (list.length > 0 && !selectedDataset) {
        setSelectedDataset(list[0]);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedDataset]);

  useEffect(() => {
    loadDatasets();
  }, [loadDatasets]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const tags = tagsStr.split(',').map((t) => t.trim()).filter(Boolean);
      const created = await ApiClient.createDataset({
        name,
        description,
        version,
        isSynthetic,
        tags,
      });
      setShowCreateModal(false);
      setName('');
      setDescription('');
      await loadDatasets();
      setSelectedDataset(created);
    } catch (err: any) {
      alert(`Error creating dataset: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="h-5 w-5 text-indigo-400" />
            Evaluation Benchmark Datasets
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage versioned datasets containing queries, expected answers, relevant document/chunk identifiers, and citations.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Create Benchmark Dataset
        </button>
      </div>

      {/* Grid: Dataset List + Test Case Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Dataset Cards */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Available Datasets ({datasets.length})
          </h2>
          {datasets.map((ds) => {
            const isSelected = selectedDataset?.datasetId === ds.datasetId;
            const labeledCount = ds.testCases.filter((tc) => tc.hasRelevanceLabels).length;

            return (
              <div
                key={ds.datasetId}
                onClick={() => setSelectedDataset(ds)}
                className={`p-4 rounded-xl cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-card border-indigo-500/50 shadow-md ring-1 ring-indigo-500/30'
                    : 'glass-card border-border hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-white">{ds.name}</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-card border border-border text-gray-300">
                    v{ds.version}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                  {ds.description}
                </p>

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {ds.isSynthetic ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      SYNTHETIC DATA
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      PRODUCTION GROUND TRUTH
                    </span>
                  )}
                  <span className="text-[10px] text-gray-400">
                    {ds.testCases.length} Cases ({labeledCount} Labeled)
                  </span>
                </div>

                <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-border/50 text-[10px] text-gray-500 font-mono">
                  <Hash className="h-3 w-3" />
                  <span>Snapshot: {ds.snapshotHash}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Selected Dataset Detail & Test Cases (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          {selectedDataset ? (
            <div className="glass-card rounded-xl p-5 border border-border space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white">{selectedDataset.name}</h2>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      v{selectedDataset.version}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{selectedDataset.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-400 font-mono">
                    ID: {selectedDataset.datasetId}
                  </span>
                </div>
              </div>

              {/* Notice regarding label eligibility */}
              <div className="p-3 rounded-lg bg-card/60 border border-border text-xs text-gray-300 flex items-start gap-2.5">
                <FileCode className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                <div>
                  <strong className="text-white">Strict Label Guard:</strong> Retrieval metrics
                  (Recall@K, Precision@K, MRR, nDCG) are calculated only for test cases with verified ground-truth chunk labels. Cases without labels are marked as UNLABELED.
                </div>
              </div>

              {/* Test Cases List */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Test Cases in Benchmark ({selectedDataset.testCases.length})
                </h3>

                {selectedDataset.testCases.map((tc, idx) => (
                  <div
                    key={tc.caseId}
                    className="p-4 rounded-lg bg-card border border-border/80 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-indigo-400">#{idx + 1}</span>
                        <span className="text-xs font-semibold text-white">{tc.query}</span>
                      </div>
                      {tc.hasRelevanceLabels ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="h-3 w-3" />
                          LABELED
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 shrink-0">
                          <AlertCircle className="h-3 w-3" />
                          UNLABELED
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-gray-300 bg-background/50 p-2.5 rounded border border-border/40">
                      <span className="text-gray-400 font-medium">Expected Answer: </span>
                      {tc.expectedAnswer}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-gray-400">
                      <div>
                        <span className="text-gray-500">Relevant Chunks: </span>
                        {tc.relevantChunkIds && tc.relevantChunkIds.length > 0 ? (
                          <span className="font-mono text-gray-300">
                            {tc.relevantChunkIds.join(', ')}
                          </span>
                        ) : (
                          <span className="italic text-gray-500">None specified</span>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-500">Relevant Documents: </span>
                        {tc.relevantDocumentIds && tc.relevantDocumentIds.length > 0 ? (
                          <span className="font-mono text-gray-300">
                            {tc.relevantDocumentIds.join(', ')}
                          </span>
                        ) : (
                          <span className="italic text-gray-500">None specified</span>
                        )}
                      </div>
                    </div>

                    {tc.expectedCitations && tc.expectedCitations.length > 0 && (
                      <div className="text-[11px] text-gray-400 pt-2 border-t border-border/40">
                        <span className="text-gray-500 font-medium">Expected Citations: </span>
                        {tc.expectedCitations.map((c, cIdx) => (
                          <span
                            key={cIdx}
                            className="inline-block mr-2 px-1.5 py-0.5 rounded bg-card/80 border border-border text-[10px] font-mono text-indigo-300"
                          >
                            {c.documentId} ({c.source || 'doc'})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="glass-card rounded-xl p-12 text-center text-gray-400 border border-border">
              Select a dataset to view test cases and ground-truth labels.
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card rounded-xl p-5 sm:p-6 border border-border max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold text-white">Create Benchmark Dataset</h2>
            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-300 mb-1 font-medium">Dataset Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Developer Documentation Benchmark"
                  className="w-full px-3 py-2 rounded-lg bg-card border border-border text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-medium">Description</label>
                <textarea
                  required
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Scope, queries tested, and objectives..."
                  className="w-full px-3 py-2 rounded-lg bg-card border border-border text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 mb-1 font-medium">Version</label>
                  <input
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-card border border-border text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1 font-medium">Data Classification</label>
                  <select
                    value={isSynthetic ? 'true' : 'false'}
                    onChange={(e) => setIsSynthetic(e.target.value === 'true')}
                    className="w-full px-3 py-2 rounded-lg bg-card border border-border text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="true">Synthetic Sample Data</option>
                    <option value="false">Production Data</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-medium">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={tagsStr}
                  onChange={(e) => setTagsStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-card border border-border text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-border text-gray-400 hover:text-white text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
                >
                  Create Dataset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
