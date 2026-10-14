'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  FileEdit,
  CheckCircle,
  XCircle,
  FileText,
  AlertCircle,
  MessageSquare,
  User,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';
import { ApiClient } from '@/lib/api-client';
import { DocumentationProposal } from '@/lib/types';
import { getStatusBadgeClass } from '@/lib/utils';

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<DocumentationProposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<DocumentationProposal | null>(null);
  const [loading, setLoading] = useState(true);

  // Review action modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [actionType, setActionType] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewerEmail, setReviewerEmail] = useState('ops-reviewer@company.com');

  const loadProposals = useCallback(async () => {
    setLoading(true);
    try {
      const list = await ApiClient.getProposals();
      setProposals(list);
      if (list.length > 0 && !selectedProposal) {
        setSelectedProposal(list[0]);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedProposal]);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProposal) return;
    try {
      const updated = await ApiClient.reviewProposal(
        selectedProposal.proposalId,
        actionType,
        reviewComment,
        reviewerEmail,
      );
      setProposals((prev) =>
        prev.map((p) => (p.proposalId === updated.proposalId ? updated : p)),
      );
      setSelectedProposal(updated);
      setShowReviewModal(false);
      setReviewComment('');
    } catch (err: any) {
      alert(`Review submission failed: ${err.message}`);
    }
  };

  const openReview = (type: 'APPROVED' | 'REJECTED') => {
    setActionType(type);
    setReviewComment(
      type === 'APPROVED'
        ? 'Verified with technical documentation standards and approved for release.'
        : 'Proposal rejected due to ambiguity or inaccurate factual claim.',
    );
    setShowReviewModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileEdit className="h-5 w-5 text-indigo-400" />
            Reviewed Documentation Improvements
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Human-in-the-loop review workflow. Documents are never silently rewritten; all proposed edits must be verified and approved by authorized operators.
          </p>
        </div>
      </div>

      {/* Safety Policy Alert */}
      <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/20 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-indigo-400 mt-0.5 shrink-0" />
        <div className="text-xs text-indigo-200/90 leading-relaxed">
          <strong className="text-indigo-300">Safety Policy Enforcement:</strong>{' '}
          Automated evaluation runs detect missing or ambiguous context and generate proposed documentation fixes.
          Authoritative documents remain untouched until human review and formal sign-off.
        </div>
      </div>

      {/* Grid: Proposals List + Diff Reviewer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Proposals Queue (1 Col) */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Proposals Review Queue ({proposals.length})
          </h2>

          {proposals.map((prop) => {
            const isSelected = selectedProposal?.proposalId === prop.proposalId;
            return (
              <div
                key={prop.proposalId}
                onClick={() => setSelectedProposal(prop)}
                className={`p-4 rounded-xl cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-card border-indigo-500/50 shadow-md ring-1 ring-indigo-500/30'
                    : 'glass-card border-border hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-white line-clamp-1">{prop.title}</h3>
                  <span
                    className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${getStatusBadgeClass(
                      prop.status,
                    )}`}
                  >
                    {prop.status}
                  </span>
                </div>

                <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                  {prop.rationale}
                </p>

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/50 text-[10px] text-gray-400">
                  <span>Source: {prop.sourceName}</span>
                  <span>{new Date(prop.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Selected Proposal & Unified Diff Inspector (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          {selectedProposal ? (
            <div className="glass-card rounded-xl p-5 border border-border space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white">{selectedProposal.title}</h2>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(
                        selectedProposal.status,
                      )}`}
                    >
                      {selectedProposal.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Target Document: <strong>{selectedProposal.sourceName}</strong>
                  </p>
                </div>

                {/* Review Buttons if not finalized */}
                {selectedProposal.status === 'PROPOSED' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openReview('APPROVED')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Approve Edit
                    </button>
                    <button
                      onClick={() => openReview('REJECTED')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition-all"
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </button>
                  </div>
                )}
              </div>

              {/* Rationale & Trigger Context */}
              <div className="p-3.5 rounded-lg bg-card border border-border text-xs space-y-1.5">
                <span className="font-semibold text-gray-300">Proposal Rationale:</span>
                <p className="text-gray-300 leading-relaxed">{selectedProposal.rationale}</p>
                <div className="text-[10px] text-gray-400 pt-1.5 border-t border-border/50 flex items-center justify-between">
                  <span>Proposed by: {selectedProposal.proposedBy}</span>
                  {selectedProposal.triggerRunId && (
                    <span>Triggered by Benchmark Run: {selectedProposal.triggerRunId}</span>
                  )}
                </div>
              </div>

              {/* Review Audit Trail if Reviewed */}
              {selectedProposal.reviewedBy && (
                <div className="p-3.5 rounded-lg bg-background/60 border border-border text-xs space-y-1">
                  <span className="font-semibold text-white">Review Audit Sign-off:</span>
                  <div className="text-gray-300">
                    Reviewed by <strong>{selectedProposal.reviewedBy}</strong> on{' '}
                    {new Date(selectedProposal.reviewedAt || '').toLocaleString()}:
                  </div>
                  <p className="text-gray-400 italic mt-1">&quot;{selectedProposal.reviewComment}&quot;</p>
                </div>
              )}

              {/* Unified Diff Viewer */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Unified Diff Preview
                </h3>

                <div className="rounded-lg bg-background border border-border overflow-hidden font-mono text-xs">
                  <div className="p-2.5 bg-card/60 border-b border-border/80 text-[11px] text-gray-400 flex items-center justify-between">
                    <span>{selectedProposal.sourceName}</span>
                    <span>Format: unified diff</span>
                  </div>

                  <div className="p-4 space-y-1 overflow-x-auto text-[11px] leading-relaxed">
                    {selectedProposal.diffSnippet.split('\n').map((line, idx) => {
                      let colorClass = 'text-gray-400';
                      let bgClass = '';
                      if (line.startsWith('+')) {
                        colorClass = 'text-emerald-400 font-semibold';
                        bgClass = 'bg-emerald-950/20';
                      } else if (line.startsWith('-')) {
                        colorClass = 'text-rose-400 font-semibold';
                        bgClass = 'bg-rose-950/20';
                      } else if (line.startsWith('---') || line.startsWith('+++')) {
                        colorClass = 'text-indigo-400 font-semibold';
                      }

                      return (
                        <div key={idx} className={`px-2 py-0.5 rounded ${bgClass} ${colorClass}`}>
                          {line}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card rounded-xl p-12 text-center text-gray-400 border border-border">
              Select a proposal from the queue to inspect diff and review actions.
            </div>
          )}
        </div>
      </div>

      {/* Review Action Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card rounded-xl p-5 sm:p-6 border border-border max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold text-white">
              {actionType === 'APPROVED' ? 'Approve Documentation Edit' : 'Reject Documentation Edit'}
            </h2>
            <form onSubmit={handleReviewSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-300 mb-1 font-medium">Reviewer Email / Identity</label>
                <input
                  type="email"
                  required
                  value={reviewerEmail}
                  onChange={(e) => setReviewerEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-card border border-border text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-medium">Review Sign-Off Notes</label>
                <textarea
                  required
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Audit reason, verification steps performed..."
                  className="w-full px-3 py-2 rounded-lg bg-card border border-border text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-border text-gray-400 hover:text-white text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 rounded-lg font-semibold text-xs text-white ${
                    actionType === 'APPROVED'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  Confirm {actionType === 'APPROVED' ? 'Approval' : 'Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
