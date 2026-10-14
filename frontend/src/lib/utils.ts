import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A';
  return `${(value * 100).toFixed(1)}%`;
}

export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A';
  return value.toFixed(3);
}

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'PASS':
    case 'FRESH':
    case 'APPROVED':
    case 'COMPLETED':
    case 'UP':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    case 'WARN':
    case 'STALE_WARNING':
    case 'IN_REVIEW':
    case 'PARTIAL':
    case 'DEGRADED':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    case 'FAIL':
    case 'EXPIRED':
    case 'REJECTED':
    case 'FAILED':
    case 'DOWN':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    case 'CONTENT_DRIFT_DETECTED':
      return 'bg-violet-500/10 text-violet-400 border-violet-500/30';
    case 'INSUFFICIENT_EVIDENCE':
      return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    case 'EMPTY_RETRIEVAL':
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    case 'PROPOSED':
    case 'QUEUED':
    default:
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
  }
}
