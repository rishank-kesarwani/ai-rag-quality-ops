import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Knowledge Freshness & Drift Operations',
  description:
    'Monitor knowledge sources, detect content drift and staleness, and assess benchmark test case impact.',
};

export default function FreshnessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
