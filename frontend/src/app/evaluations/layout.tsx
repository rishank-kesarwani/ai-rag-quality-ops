import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Retrieval Evaluations & Comparator',
  description:
    'Repeatable RAG retrieval evaluations, candidate vs baseline comparisons, and evidence inspection.',
};

export default function EvaluationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
