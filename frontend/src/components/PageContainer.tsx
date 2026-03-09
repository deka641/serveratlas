'use client';

import { ReactNode } from 'react';
import Header from '@/components/Header';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useMobileSidebar } from '@/components/MobileSidebarContext';

interface PageContainerProps {
  title: string;
  action?: ReactNode;
  loading?: boolean;
  error?: string | null;
  children: ReactNode;
}

export default function PageContainer({
  title,
  action,
  loading = false,
  error = null,
  children,
}: PageContainerProps) {
  const openSidebar = useMobileSidebar();

  return (
    <div className="flex flex-1 flex-col">
      <Header title={title} onMenuClick={openSidebar ?? undefined}>{action}</Header>
      <main className="flex-1 p-4 sm:p-6">
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
