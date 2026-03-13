'use client';

import Link from 'next/link';
import { api } from '@/lib/api';
import { useData } from '@/hooks/useData';
import { formatDateTime } from '@/lib/formatters';
import type { Activity, OverdueBackup } from '@/lib/types';
import PageContainer from '@/components/PageContainer';
import StatsCards from '@/components/domain/StatsCards';
import ServerStatusGrid from '@/components/domain/ServerStatusGrid';
import CostOverview from '@/components/domain/CostOverview';
import BackupHealthTable from '@/components/domain/BackupHealthTable';
import Button from '@/components/ui/Button';
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

  const {
    data: overdueBackups,
    loading: overdueLoading,
  } = useData(() => api.getOverdueBackups());

  const {
    data: activitiesResult,
    loading: activitiesLoading,
  } = useData(() => api.listActivities({ limit: 10 }));

  const activities = activitiesResult?.items ?? null;

  const servers = serversResult?.items ?? null;
  const error = statsError || costError || serversError;

  const allZero = stats && stats.total_servers === 0 && stats.total_providers === 0 && stats.total_applications === 0;

  return (
    <PageContainer
      title="Dashboard"
      error={error}
      onRetry={refetchStats}
      action={
        <Link href="/report">
          <Button variant="secondary">Print Report</Button>
        </Link>
      }
    >
      <div className="space-y-8">
        {/* Welcome card for empty database */}
        {!statsLoading && allZero && (
          <Card>
            <div className="text-center py-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome to ServerAtlas</h2>
              <p className="text-sm text-gray-600 mb-6">Get started by setting up your infrastructure in 3 steps:</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/providers/new">
                  <Button variant="secondary">
                    <span className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">1</span>
                      Add a Provider
                    </span>
                  </Button>
                </Link>
                <Link href="/servers/new">
                  <Button variant="secondary">
                    <span className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">2</span>
                      Add a Server
                    </span>
                  </Button>
                </Link>
                <Link href="/applications/new">
                  <Button variant="secondary">
                    <span className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">3</span>
                      Add an Application
                    </span>
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        )}

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

        {/* Overdue Backups Warning */}
        {!overdueLoading && overdueBackups && overdueBackups.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Overdue Backups
            </h2>
            <div className="mb-4 flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
              <svg className="h-5 w-5 flex-shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.27 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-sm font-medium text-amber-800">
                {overdueBackups.length} backup{overdueBackups.length > 1 ? 's are' : ' is'} overdue.
              </span>
            </div>
            <Card noPadding>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-500">Name</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500">Frequency</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500">Last Run</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500">Server</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-500">Hours Overdue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {overdueBackups.map((b: OverdueBackup) => (
                      <tr key={b.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <Link href={`/backups/${b.id}`} className="font-medium text-blue-600 hover:underline">
                            {b.name}
                          </Link>
                        </td>
                        <td className="px-4 py-2 capitalize">{b.frequency}</td>
                        <td className="px-4 py-2">{b.last_run_at ? formatDateTime(b.last_run_at) : 'Never'}</td>
                        <td className="px-4 py-2">{b.source_server_name ?? '\u2014'}</td>
                        <td className="px-4 py-2">
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            {b.hours_overdue}h overdue
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>
        )}

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

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Activity
            </h2>
            <Link href="/activities" className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          {activitiesLoading ? (
            <SectionSkeleton height="h-48" />
          ) : activities && activities.length > 0 ? (
            <Card noPadding>
              <ul className="divide-y divide-gray-100">
                {activities.map((activity) => (
                  <li key={activity.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <span className="flex-shrink-0 text-xs text-gray-500 w-40">
                      {formatDateTime(activity.created_at)}
                    </span>
                    <ActivityActionBadge action={activity.action} />
                    <span className="text-gray-600">{activity.entity_type}</span>
                    <Link
                      href={activityEntityUrl(activity)}
                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline truncate"
                    >
                      {activity.entity_name}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            <Card>
              <p className="text-sm text-gray-500">No recent activity.</p>
            </Card>
          )}
        </section>
      </div>
    </PageContainer>
  );
}

function activityEntityUrl(activity: Activity): string {
  const typeMap: Record<string, string> = {
    ssh_key: 'ssh-keys',
    ssh_connection: 'ssh-connections',
  };
  const urlSegment = typeMap[activity.entity_type] ?? `${activity.entity_type}s`;
  return `/${urlSegment}/${activity.entity_id}`;
}

function ActivityActionBadge({ action }: { action: string }) {
  let colorClasses = 'bg-gray-100 text-gray-700';
  if (action === 'created') colorClasses = 'bg-green-100 text-green-700';
  else if (action === 'updated') colorClasses = 'bg-blue-100 text-blue-700';
  else if (action === 'deleted') colorClasses = 'bg-red-100 text-red-700';

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClasses}`}>
      {action}
    </span>
  );
}
