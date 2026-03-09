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
    data: servers,
    loading: serversLoading,
    error: serversError,
  } = useData(() => api.listServers());

  const {
    data: recentBackups,
    loading: backupsLoading,
  } = useData(() => api.getRecentBackups());

  const error = statsError || costError || serversError;

  return (
    <PageContainer title="Dashboard" error={error} onRetry={refetchStats}>
      <div className="space-y-8">
        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Overview
          </h2>
          {statsLoading ? (
            <SectionSkeleton height="h-24" />
          ) : stats ? (
            <StatsCards stats={stats} />
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
