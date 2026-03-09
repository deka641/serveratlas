'use client';

import { api } from '@/lib/api';
import { useData } from '@/hooks/useData';
import PageContainer from '@/components/PageContainer';
import StatsCards from '@/components/domain/StatsCards';
import ServerStatusGrid from '@/components/domain/ServerStatusGrid';
import CostOverview from '@/components/domain/CostOverview';
import BackupHealthTable from '@/components/domain/BackupHealthTable';
import Card from '@/components/ui/Card';

export default function DashboardPage() {
  const {
    data: stats,
    loading: statsLoading,
    error: statsError,
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

  const loading = statsLoading || costLoading || serversLoading || backupsLoading;
  const error = statsError || costError || serversError;

  return (
    <PageContainer title="Dashboard" loading={loading} error={error}>
      <div className="space-y-8">
        {stats && (
          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Overview
            </h2>
            <StatsCards stats={stats} />
          </section>
        )}

        {costSummary && (
          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Cost Summary
            </h2>
            <CostOverview costSummary={costSummary} />
          </section>
        )}

        {recentBackups && recentBackups.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Backup Health
            </h2>
            <Card noPadding>
              <BackupHealthTable backups={recentBackups} />
            </Card>
          </section>
        )}

        {servers && servers.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Servers
            </h2>
            <ServerStatusGrid servers={servers} />
          </section>
        )}
      </div>
    </PageContainer>
  );
}
