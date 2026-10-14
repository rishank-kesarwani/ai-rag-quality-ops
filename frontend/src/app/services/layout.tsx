import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shared Services Architecture & Health',
  description:
    'Verified integration contracts, live status, and fallback mechanisms for shared services.',
};

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
