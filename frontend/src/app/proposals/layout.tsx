import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reviewed Documentation Improvements',
  description:
    'Human-in-the-loop review queue for proposed documentation additions and unified diff inspections.',
};

export default function ProposalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
