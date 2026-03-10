'use client';

import Link from 'next/link';
import { api } from '@/lib/api';
import { useData } from '@/hooks/useData';
import PageContainer from '@/components/PageContainer';
import StatsCards from '@/components/domain/StatsCards';
import ServerStatusGrid from '@/components/domain/ServerStatusGrid';
import CostOverview from '@/components/domain/CostOverview';
import BackupHealthTable from '@/components/domain/BackupHealthTable';
import Card from '@/components/ui/Card';
import SectionSkeleton from '@/components/ui/SectionSkeleton';

export default function DashboardPage() {
  const {
    data: stats,
    loading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useData(() => api.getDashboardStats());

  const {
    data: costSummary,
    loading: costLoading,
    error: costError,
  } = useData(() => api.getCostSummary());

  const {
    data: serversResult,
    loading: serversLoading,
    error: serversError,
  } = useData(() => api.listServers());

  const {
    data: recentBackups,
    loading: backupsLoading,
  } = useData(() => api.getRecentBackups());

  const {
    data: backupCoverage,
    loading: coverageLoading,
  } = useData(() => api.getBackupCoverage());

  const servers = serversResult?.items ?? null;
  const error = statsError || costError || serversError;

  return (
    <PageContainer title="Dashboard" error={error} onRetry={refetchStats}>
      <div className="space-y-8">
        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Overview
          </h2>
          {statsLoading || coverageLoading ? (
            <SectionSkeleton height="h-24" />
          ) : stats ? (
            <StatsCards stats={stats} backupCoverage={backupCoverage ?? undefined} />
          ) : null}
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Cost Summary
          </h2>
          {costLoading ? (
            <SectionSkeleton height="h-48" />
          ) : costSummary ? (
            <CostOverview costSummary={costSummary} />
          ) : null}
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Backup Health
          </h2>
          {backupCoverage && backupCoverage.failed_backups_24h > 0 && (
            <div className="mb-4 flex items-center gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3">
              <svg className="h-5 w-5 flex-shrink-0 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.27 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-sm font-medium text-red-800">
                {backupCoverage.failed_backups_24h} backup{backupCoverage.failed_backups_24h > 1 ? 's' : ''} failed in the last 24 hours.{' '}
                <Link href="/backups?status=failed" className="underline hover:text-red-900">View failed backups</Link>
              </span>
            </div>
          )}
          {backupsLoading ? (
            <SectionSkeleton height="h-32" />
          ) : recentBackups && recentBackups.length > 0 ? (
            <Card noPadding>
              <BackupHealthTable backups={recentBackups} />
            </Card>
          ) : (
            <Card>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  No backups configured yet.{' '}
                  <Link href="/backups/new" className="text-blue-600 hover:underline">
                    Add your first backup
                  </Link>
                </span>
              </div>
            </Card>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Servers
          </h2>
          {serversLoading ? (
            <SectionSkeleton height="h-48" />
          ) : servers && servers.length > 0 ? (
            <ServerStatusGrid servers={servers} />
          ) : (
            <Card>
              <p className="text-sm text-gray-500">
                No servers yet. Add your first server to see it here.
              </p>
            </Card>
          )}
        </section>
      </div>
    </PageContainer>
  );
}
