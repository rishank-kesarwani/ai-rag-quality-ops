import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navigation } from '@/components/Navigation';

export const metadata: Metadata = {
  title: {
    default: 'AI RAG Quality & Knowledge Operations',
    template: '%s | AI RAG Quality Ops',
  },
  description:
    'Production-grade platform for RAG evaluation, retrieval benchmarking, citation verification, stale knowledge detection, and reviewed documentation operations.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/logo.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#090d16',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
        <Navigation />
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
          {children}
        </main>
        <footer className="border-t border-border/60 py-6 text-center text-xs text-gray-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>AI RAG Quality & Knowledge Operations Platform</span>
            <span>Independent Deployment &bull; Render Backend &bull; Vercel Frontend</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
