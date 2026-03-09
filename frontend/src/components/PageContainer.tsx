'use client';

import { ReactNode, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useMobileSidebar } from '@/components/MobileSidebarContext';

export interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageContainerProps {
  title: string;
  action?: ReactNode;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  breadcrumbs?: Breadcrumb[];
  children: ReactNode;
}

export default function PageContainer({
  title,
  action,
  loading = false,
  error = null,
  onRetry,
  breadcrumbs,
  children,
}: PageContainerProps) {
  const openSidebar = useMobileSidebar();

  useEffect(() => {
    document.title = title ? `${title} | ServerAtlas` : 'ServerAtlas';
  }, [title]);

  return (
    <div className="flex flex-1 flex-col">
      <Header title={title} onMenuClick={openSidebar ?? undefined}>{action}</Header>
      <main className="flex-1 p-4 sm:p-6">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="mb-4 flex items-center gap-1.5 text-sm text-gray-500">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-gray-300">/</span>}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-gray-700 hover:underline">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-gray-900">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm font-medium text-red-800">{error}</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="ml-auto rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-200 transition-colors"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="animate-fadeIn">
            {children}
          </div>
        )}
      </main>
    </div>
  );
}
