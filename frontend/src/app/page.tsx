'use client';

import Link from 'next/link';
import { api } from '@/lib/api';
import { useData } from '@/hooks/useData';
import { formatDateTime } from '@/lib/formatters';
import { useState, useEffect, useCallback } from 'react';
import type { Activity, CostByTag, InfrastructureSnapshot, OverdueBackup } from '@/lib/types';
import PageContainer from '@/components/PageContainer';
import StatsCards from '@/components/domain/StatsCards';
import ServerStatusGrid from '@/components/domain/ServerStatusGrid';
import CostOverview from '@/components/domain/CostOverview';
import BackupHealthTable from '@/components/domain/BackupHealthTable';
import DocumentationCoverage from '@/components/domain/DocumentationCoverage';
import EfficiencyMetrics from '@/components/domain/EfficiencyMetrics';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import SectionSkeleton from '@/components/ui/SectionSkeleton';
import WidgetError from '@/components/ui/WidgetError';
import { useToast } from '@/components/ui/Toast';

export default function DashboardPage() {
  const { addToast } = useToast();
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
    refetch: refetchCost,
  } = useData(() => api.getCostSummary());

  const {
    data: serversResult,
    loading: serversLoading,
    error: serversError,
    refetch: refetchServers,
  } = useData(() => api.listServers());

  const {
    data: recentBackups,
    loading: backupsLoading,
    refetch: refetchBackups,
  } = useData(() => api.getRecentBackups());

  const {
    data: backupCoverage,
    loading: coverageLoading,
    refetch: refetchCoverage,
  } = useData(() => api.getBackupCoverage());

  const {
    data: overdueBackups,
    loading: overdueLoading,
    refetch: refetchOverdue,
  } = useData(() => api.getOverdueBackups());

  const {
    data: activitiesResult,
    loading: activitiesLoading,
    refetch: refetchActivities,
  } = useData(() => api.listActivities({ limit: 10 }));

  const {
    data: costByTag,
    loading: costByTagLoading,
    refetch: refetchCostByTag,
  } = useData(() => api.getCostByTag());

  const {
    data: healthSummary,
    loading: healthSummaryLoading,
    refetch: refetchHealthSummary,
  } = useData(() => api.getHealthSummary());

  const {
    data: docCoverage,
    loading: docCoverageLoading,
    refetch: refetchDocCoverage,
  } = useData(() => api.getDocumentationCoverage());

  const {
    data: snapshots,
    loading: snapshotsLoading,
    refetch: refetchSnapshots,
  } = useData(() => api.listSnapshots({ days: 30 }));

  const [snapshotCreating, setSnapshotCreating] = useState(false);

  async function handleCreateSnapshot() {
    setSnapshotCreating(true);
    try {
      await api.createSnapshot();
      addToast('success', 'Infrastructure snapshot captured');
      refetchSnapshots();
    } catch (e: unknown) {
      addToast('error', e instanceof Error ? e.message : 'Failed to create snapshot');
    } finally {
      setSnapshotCreating(false);
    }
  }

  const [batchChecking, setBatchChecking] = useState(false);
  const [autoHealthCheck, setAutoHealthCheck] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dashboard-auto-health-check');
      return stored ? Number(stored) : null;
    }
    return null;
  });
  const [nextCheckIn, setNextCheckIn] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dashboard-auto-refresh');
      return stored ? Number(stored) : null;
    }
    return null;
  });
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  async function handleBatchHealthCheck() {
    setBatchChecking(true);
    try {
      const result = await api.batchHealthCheck();
      addToast('success', `Health check complete: ${result.healthy} healthy, ${result.unhealthy} unhealthy, ${result.skipped} skipped`);
      refetchHealthSummary();
      refetchServers();
      refetchStats();
    } catch {
      addToast('error', 'Batch health check failed');
    } finally {
      setBatchChecking(false);
    }
  }

  const handleRefreshAll = useCallback(() => {
    refetchStats();
    refetchCost();
    refetchServers();
    refetchBackups();
    refetchCoverage();
    refetchOverdue();
    refetchActivities();
    refetchCostByTag();
    refetchHealthSummary();
    refetchDocCoverage();
    refetchSnapshots();
    setLastUpdated(new Date());
  }, [refetchStats, refetchCost, refetchServers, refetchBackups, refetchCoverage, refetchOverdue, refetchActivities, refetchCostByTag, refetchHealthSummary, refetchDocCoverage, refetchSnapshots]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(handleRefreshAll, autoRefresh * 1000);
    return () => clearInterval(id);
  }, [autoRefresh, handleRefreshAll]);

  // Auto health check timer
  useEffect(() => {
    if (!autoHealthCheck) {
      setNextCheckIn(null);
      return;
    }
    setNextCheckIn(autoHealthCheck);
    const countdown = setInterval(() => {
      setNextCheckIn((prev) => {
        if (prev === null || prev <= 1) return autoHealthCheck;
        return prev - 1;
      });
    }, 1000);
    const check = setInterval(async () => {
      try {
        const result = await api.batchHealthCheck();
        if (result.unhealthy > 0) {
          addToast('error', `Auto health check: ${result.unhealthy} unhealthy server(s) detected`);
        }
        refetchHealthSummary();
        refetchServers();
        refetchStats();
      } catch {
        // silent failure for auto checks
      }
      setNextCheckIn(autoHealthCheck);
    }, autoHealthCheck * 1000);
    return () => {
      clearInterval(countdown);
      clearInterval(check);
    };
  }, [autoHealthCheck, addToast, refetchHealthSummary, refetchServers, refetchStats]);

  function handleAutoHealthCheckChange(value: string) {
    const num = value ? Number(value) : null;
    setAutoHealthCheck(num);
    if (typeof window !== 'undefined') {
      if (num) localStorage.setItem('dashboard-auto-health-check', String(num));
      else localStorage.removeItem('dashboard-auto-health-check');
    }
  }

  function handleAutoRefreshChange(value: string) {
    const num = value ? Number(value) : null;
    setAutoRefresh(num);
    if (typeof window !== 'undefined') {
      if (num) localStorage.setItem('dashboard-auto-refresh', String(num));
      else localStorage.removeItem('dashboard-auto-refresh');
    }
  }

  const activities = activitiesResult?.items ?? null;

  const servers = serversResult?.items ?? null;

  const allZero = stats && stats.total_servers === 0 && stats.total_providers === 0 && stats.total_applications === 0;

  return (
    <PageContainer
      title="Dashboard"
      action={
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
          <select
            value={autoRefresh ?? ''}
            onChange={(e) => handleAutoRefreshChange(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700"
            aria-label="Auto-refresh interval"
          >
            <option value="">Auto: Off</option>
            <option value="30">Auto: 30s</option>
            <option value="60">Auto: 60s</option>
            <option value="300">Auto: 5m</option>
          </select>
          <Button variant="secondary" onClick={handleRefreshAll}>
            Refresh
          </Button>
          <Link href="/report">
            <Button variant="secondary">Print Report</Button>
          </Link>
        </div>
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
          ) : statsError ? (
            <WidgetError message={statsError} onRetry={refetchStats} />
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
          ) : costError ? (
            <WidgetError message={costError} onRetry={refetchCost} />
          ) : costSummary ? (
            <CostOverview costSummary={costSummary} />
          ) : null}
        </section>

        {/* Resource Efficiency */}
        <section>
          <EfficiencyMetrics />
        </section>

        {/* Infrastructure Health Summary (#20) */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Infrastructure Health</h2>
            <div className="flex items-center gap-2">
              {nextCheckIn !== null && autoHealthCheck && (
                <span className="text-xs text-gray-400">
                  Next check in {Math.floor(nextCheckIn / 60)}:{String(nextCheckIn % 60).padStart(2, '0')}
                </span>
              )}
              <select
                value={autoHealthCheck ?? ''}
                onChange={(e) => handleAutoHealthCheckChange(e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700"
                aria-label="Auto health check interval"
              >
                <option value="">Auto Check: Off</option>
                <option value="300">Auto Check: 5m</option>
                <option value="900">Auto Check: 15m</option>
                <option value="1800">Auto Check: 30m</option>
                <option value="3600">Auto Check: 60m</option>
              </select>
              <Button variant="secondary" size="sm" onClick={handleBatchHealthCheck} disabled={batchChecking}>
                {batchChecking ? 'Checking...' : 'Check All Servers'}
              </Button>
            </div>
          </div>
          {healthSummaryLoading ? (
            <SectionSkeleton height="h-20" />
          ) : healthSummary ? (
            <Card>
              <div className="flex flex-col gap-3">
                <div className="flex h-4 w-full overflow-hidden rounded-full bg-gray-200">
                  {healthSummary.total > 0 && (
                    <>
                      {healthSummary.healthy > 0 && (
                        <div
                          className="bg-green-500 transition-all"
                          style={{ width: `${(healthSummary.healthy / healthSummary.total) * 100}%` }}
                        />
                      )}
                      {healthSummary.unhealthy > 0 && (
                        <div
                          className="bg-red-500 transition-all"
                          style={{ width: `${(healthSummary.unhealthy / healthSummary.total) * 100}%` }}
                        />
                      )}
                      {healthSummary.unchecked > 0 && (
                        <div
                          className="bg-gray-400 transition-all"
                          style={{ width: `${(healthSummary.unchecked / healthSummary.total) * 100}%` }}
                        />
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <Link href="/servers?status=active" className="flex items-center gap-1.5 hover:underline">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
                    {healthSummary.healthy} healthy
                  </Link>
                  <Link href="/servers?status=active" className="flex items-center gap-1.5 hover:underline">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
                    {healthSummary.unhealthy} unhealthy
                  </Link>
                  <Link href="/servers" className="flex items-center gap-1.5 hover:underline">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-400" />
                    {healthSummary.unchecked} unchecked
                  </Link>
                  {healthSummary.last_full_check && (
                    <span className="ml-auto text-xs text-gray-500">
                      Last check: {formatDateTime(healthSummary.last_full_check)}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ) : null}
        </section>

        {/* Documentation Coverage */}
        <DocumentationCoverage loading={docCoverageLoading} coverage={docCoverage} refetch={refetchDocCoverage} />

        {/* Infrastructure Trend */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Infrastructure Trend</h2>
            <Button variant="secondary" size="sm" onClick={handleCreateSnapshot} disabled={snapshotCreating}>
              {snapshotCreating ? 'Capturing...' : 'Take Snapshot'}
            </Button>
          </div>
          {snapshotsLoading ? (
            <SectionSkeleton height="h-32" />
          ) : snapshots && snapshots.length > 0 ? (
            <Card>
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {(() => {
                    const latest = snapshots[snapshots.length - 1];
                    const prev = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;
                    const delta = (curr: number, old: number | null | undefined) =>
                      old != null ? curr - old : null;
                    const fmt = (d: number | null) =>
                      d === null ? '' : d > 0 ? ` (+${d})` : d < 0 ? ` (${d})` : '';
                    return (
                      <>
                        <div>
                          <p className="text-xs text-gray-500">Servers</p>
                          <p className="text-lg font-bold text-gray-900">
                            {latest.total_servers}
                            <span className="text-xs font-normal text-gray-400">{fmt(delta(latest.total_servers, prev?.total_servers))}</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Monthly Cost</p>
                          <p className="text-lg font-bold text-gray-900">
                            {latest.total_monthly_cost != null ? `${latest.total_monthly_cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '\u2014'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Backup Coverage</p>
                          <p className="text-lg font-bold text-gray-900">
                            {latest.backup_coverage_pct != null ? `${latest.backup_coverage_pct}%` : '\u2014'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Audit Compliance</p>
                          <p className="text-lg font-bold text-gray-900">
                            {latest.audit_compliance_pct != null ? `${latest.audit_compliance_pct}%` : '\u2014'}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
                {/* Mini sparkline using CSS bars */}
                {snapshots.length > 1 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Health trend ({snapshots.length} snapshots)</p>
                    <div className="flex items-end gap-px h-10">
                      {snapshots.map((s: InfrastructureSnapshot) => {
                        const total = s.healthy_count + s.unhealthy_count;
                        const healthPct = total > 0 ? (s.healthy_count / total) * 100 : 0;
                        return (
                          <div
                            key={s.id}
                            className="flex-1 rounded-t print-color-exact"
                            style={{
                              height: `${Math.max(healthPct, 5)}%`,
                              backgroundColor: healthPct >= 80 ? '#22c55e' : healthPct >= 50 ? '#f59e0b' : '#ef4444',
                            }}
                            title={`${new Date(s.snapshot_date).toLocaleDateString()}: ${s.healthy_count}/${total} healthy (${Math.round(healthPct)}%)`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-400">
                  Latest: {new Date(snapshots[snapshots.length - 1].snapshot_date).toLocaleString()}
                  {snapshots.length > 1 && ` \u00b7 ${snapshots.length} snapshots in last 30 days`}
                </p>
              </div>
            </Card>
          ) : (
            <Card>
              <p className="text-sm text-gray-500">
                No snapshots yet. Take your first snapshot to start tracking infrastructure trends.
              </p>
            </Card>
          )}
        </section>

        {/* Cost by Tag (#18) */}
        {!costByTagLoading && costByTag && costByTag.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Cost by Tag</h2>
            <Card>
              <div className="space-y-3">
                {costByTag.map((item: CostByTag) => {
                  const maxCost = Math.max(...costByTag.map((c: CostByTag) => c.total_cost));
                  const barWidth = maxCost > 0 ? (item.total_cost / maxCost) * 100 : 0;
                  return (
                    <div key={`${item.tag_id}-${item.currency}`} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 w-32 flex-shrink-0">
                        <span
                          className="inline-block h-3 w-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.tag_color }}
                        />
                        <span className="text-sm font-medium text-gray-700 truncate">{item.tag_name}</span>
                      </div>
                      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${barWidth}%`, backgroundColor: item.tag_color + '80' }}
                        />
                      </div>
                      <div className="text-sm text-gray-600 w-28 text-right flex-shrink-0">
                        {item.total_cost.toFixed(2)} {item.currency}
                      </div>
                      <div className="text-xs text-gray-400 w-20 text-right flex-shrink-0">
                        {item.server_count} server{item.server_count !== 1 ? 's' : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </section>
        )}

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
          ) : serversError ? (
            <WidgetError message={serversError} onRetry={refetchServers} />
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
                    {(() => {
                      const url = activityEntityUrl(activity);
                      if (activity.action === 'deleted' || !url) {
                        return (
                          <span className="font-medium text-gray-500 truncate">
                            {activity.entity_name}
                          </span>
                        );
                      }
                      return (
                        <Link
                          href={url}
                          className="font-medium text-blue-600 hover:text-blue-800 hover:underline truncate"
                        >
                          {activity.entity_name}
                        </Link>
                      );
                    })()}
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

function activityEntityUrl(activity: Activity): string | null {
  if (activity.entity_type === 'tag') return null;
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
