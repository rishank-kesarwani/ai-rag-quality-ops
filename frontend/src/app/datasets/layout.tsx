import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Benchmark Datasets & Snapshots',
  description:
    'Manage versioned evaluation benchmark datasets, test cases, and ground-truth relevance labels.',
};

export default function DatasetsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
