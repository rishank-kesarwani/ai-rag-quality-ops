'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Database,
  BarChart3,
  Clock,
  FileEdit,
  Server,
  Menu,
  X,
} from 'lucide-react';

export function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Overview', href: '/', icon: LayoutDashboard },
    { label: 'Datasets', href: '/datasets', icon: Database },
    { label: 'Evaluations', href: '/evaluations', icon: BarChart3 },
    { label: 'Freshness', href: '/freshness', icon: Clock },
    { label: 'Reviewed Docs', href: '/proposals', icon: FileEdit },
    { label: 'Services & Health', href: '/services', icon: Server },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link href="/" className="shrink-0 flex items-center gap-2.5 sm:gap-3 group mr-2 sm:mr-4">
            <div className="relative h-9 w-9 shrink-0 group-hover:scale-105 transition-transform flex items-center justify-center">
              <Image
                src="/logo.svg"
                alt="AI RAG Quality Ops Logo"
                width={36}
                height={36}
                className="h-9 w-9 drop-shadow-[0_0_10px_rgba(99,102,241,0.4)]"
                priority
                unoptimized
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-bold text-sm sm:text-base tracking-tight text-white shrink-0">
                  RAG Quality Ops
                </span>
                <span className="hidden xs:inline-block text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                  Reliability
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-gray-400 leading-none mt-0.5 truncate max-w-[190px] sm:max-w-none">
                Benchmark, Citation & Freshness
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 shrink-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname?.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-card/60'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Header Area: Tenant Badge & Mobile Hamburger */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded-md bg-card border border-border text-[11px] text-gray-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="hidden sm:inline text-gray-400">Tenant:</span>
              <span className="font-mono text-[10px] sm:text-[11px] font-medium text-gray-200">
                tenant-default
              </span>
            </div>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile navigation menu"
              className="lg:hidden p-2 rounded-lg bg-card border border-border text-gray-300 hover:text-white hover:bg-card/80 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5 text-indigo-400" />
              ) : (
                <Menu className="h-5 w-5 text-gray-300" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer / Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-border/80 bg-background/95 backdrop-blur-xl px-4 pt-2 pb-4 space-y-1 shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 px-3 py-1.5">
            Platform Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 font-semibold'
                    : 'text-gray-300 hover:text-white hover:bg-card/80'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-400' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
