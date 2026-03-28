'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useData } from '@/hooks/useData';
import { api } from '@/lib/api';
import { formatCost, formatNumber, formatRAM, formatDisk, formatDateTime } from '@/lib/formatters';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import CSSBarChart from '@/components/domain/CSSBarChart';
import CSSDonutIndicator from '@/components/domain/CSSDonutIndicator';
import type { Application, SshConnection, Tag, Server, Backup, OverdueBackup } from '@/lib/types';

function ReportSkeleton() {
  return (
    <div className="mx-auto max-w-4xl p-8 animate-pulse">
      <div className="mb-8 border-b border-gray-200 pb-4">
        <div className="h-8 w-48 bg-gray-200 rounded mb-2" />
        <div className="h-5 w-36 bg-gray-200 rounded mb-1" />
        <div className="h-4 w-56 bg-gray-100 rounded" />
      </div>
      <div className="mb-8">
        <div className="h-6 w-32 bg-gray-200 rounded mb-3" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded border p-3">
              <div className="h-8 w-12 bg-gray-200 rounded mb-1" />
              <div className="h-4 w-20 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="mb-8">
        <div className="h-6 w-40 bg-gray-200 rounded mb-3" />
        <div className="h-32 bg-gray-100 rounded" />
      </div>
      <div className="mb-8">
        <div className="h-6 w-36 bg-gray-200 rounded mb-3" />
        <div className="h-48 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

function SectionSkeleton({ title }: { title: string }) {
  return (
    <section className="mb-8 report-section">
      <h2 className="mb-3 text-lg font-semibold text-gray-900">{title}</h2>
      <div className="animate-pulse bg-gray-100 rounded h-32" />
    </section>
  );
}

function formatOverdueDuration(hours: number): string {
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

export default function ReportPage() {
  // --- Tier 1: Small summary data (loads immediately) ---
  const { data: stats, loading: statsLoading } = useData(() => api.getDashboardStats());
  const { data: costSummary, loading: costSummaryLoading } = useData(() => api.getCostSummary());
  const { data: backupCoverage, loading: backupCoverageLoading } = useData(() => api.getBackupCoverage());

  // --- Tier readiness states ---
  const [tier1Ready, setTier1Ready] = useState(false);
  const [tier2Ready, setTier2Ready] = useState(false);

  useEffect(() => {
    if (!statsLoading && !costSummaryLoading && !backupCoverageLoading && stats && costSummary) {
      setTier1Ready(true);
    }
  }, [stats, costSummary, backupCoverage, statsLoading, costSummaryLoading, backupCoverageLoading]);

  // --- Tier 2: Large datasets (loads after Tier 1) ---
  const { data: serversResult, loading: serversLoading } = useData(
    () => tier1Ready ? api.listServers({ limit: 500 }) : Promise.resolve(null),
    [tier1Ready]
  );
  const { data: applicationsResult, loading: applicationsLoading } = useData(
    () => tier1Ready ? api.listApplications({ limit: 500 }) : Promise.resolve(null),
    [tier1Ready]
  );
  const { data: backupsResult, loading: backupsLoading } = useData(
    () => tier1Ready ? api.listBackups({ limit: 500 }) : Promise.resolve(null),
    [tier1Ready]
  );
  const { data: connectionsResult, loading: connectionsLoading } = useData(
    () => tier1Ready ? api.listSshConnections({ limit: 500 }) : Promise.resolve(null),
    [tier1Ready]
  );
  const { data: tagsResult, loading: tagsLoading } = useData(
    () => tier1Ready ? api.listTags() : Promise.resolve(null),
    [tier1Ready]
  );
  const tags = tagsResult?.items ?? [];

  useEffect(() => {
    if (
      tier1Ready &&
      !serversLoading && !applicationsLoading && !backupsLoading &&
      !connectionsLoading && !tagsLoading &&
      serversResult !== null
    ) {
      setTier2Ready(true);
    }
  }, [tier1Ready, serversResult, applicationsResult, backupsResult, connectionsResult, tagsResult, serversLoading, applicationsLoading, backupsLoading, connectionsLoading, tagsLoading]);

  // --- Tier 3: Secondary analytics (loads after Tier 2) ---
  const { data: overdueBackups } = useData(
    () => tier2Ready ? api.getOverdueBackups() : Promise.resolve(null),
    [tier2Ready]
  );
  const { data: costByTag } = useData(
    () => tier2Ready ? api.getCostByTag() : Promise.resolve(null),
    [tier2Ready]
  );

  const [filterProvider, setFilterProvider] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const allServers = serversResult?.items ?? [];
  const allApplications = applicationsResult?.items ?? [];
  const allConnections = connectionsResult?.items ?? [];
  const allBackups = backupsResult?.items ?? [];

  const servers = allServers.filter((s) => {
    if (filterProvider && s.provider_name !== filterProvider) return false;
    if (filterStatus && s.status !== filterStatus) return false;
    return true;
  });
  const filteredServerIds = new Set(servers.map((s) => s.id));
  const applications = (filterProvider || filterStatus)
    ? allApplications.filter((a) => filteredServerIds.has(a.server_id))
    : allApplications;
  const connections = (filterProvider || filterStatus)
    ? allConnections.filter((c) => filteredServerIds.has(c.source_server_id) || filteredServerIds.has(c.target_server_id))
    : allConnections;
  const backups = (filterProvider || filterStatus)
    ? allBackups.filter((b) => !b.source_server_id || filteredServerIds.has(b.source_server_id))
    : allBackups;

  // Compute unique servers involved in SSH connections
  const uniqueConnectionServers = new Set<number>();
  connections.forEach((c) => {
    uniqueConnectionServers.add(c.source_server_id);
    uniqueConnectionServers.add(c.target_server_id);
  });

  // Compute tag distribution: count servers per tag
  const tagServerCounts: Record<number, number> = {};
  servers.forEach((s) => {
    s.tags?.forEach((t) => {
      tagServerCounts[t.id] = (tagServerCounts[t.id] || 0) + 1;
    });
  });

  // D14: Resource summary computations
  const totalCpu = servers.reduce((sum, s) => sum + (s.cpu_cores ?? 0), 0);
  const totalRam = servers.reduce((sum, s) => sum + (s.ram_mb ?? 0), 0);
  const totalDisk = servers.reduce((sum, s) => sum + (s.disk_gb ?? 0), 0);

  // Resources by provider
  const resourcesByProvider: Record<string, { cpu: number; ram: number; disk: number; count: number }> = {};
  servers.forEach((s) => {
    const providerName = s.provider_name || 'Unassigned';
    if (!resourcesByProvider[providerName]) {
      resourcesByProvider[providerName] = { cpu: 0, ram: 0, disk: 0, count: 0 };
    }
    resourcesByProvider[providerName].cpu += s.cpu_cores ?? 0;
    resourcesByProvider[providerName].ram += s.ram_mb ?? 0;
    resourcesByProvider[providerName].disk += s.disk_gb ?? 0;
    resourcesByProvider[providerName].count += 1;
  });

  // Resources by status
  const activeServers = servers.filter((s) => s.status === 'active');
  const inactiveServers = servers.filter((s) => s.status !== 'active');
  const activeCpu = activeServers.reduce((sum, s) => sum + (s.cpu_cores ?? 0), 0);
  const activeRam = activeServers.reduce((sum, s) => sum + (s.ram_mb ?? 0), 0);
  const activeDisk = activeServers.reduce((sum, s) => sum + (s.disk_gb ?? 0), 0);

  const generatedAt = new Date();
  const dateWithDay = generatedAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timestampFull = generatedAt.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Show full skeleton only while Tier 1 is loading
  if (!stats || !costSummary) return <ReportSkeleton />;

  // Executive Summary findings
  const findings: { text: string; critical: boolean }[] = [];
  const unhealthyCount = stats.unhealthy_servers;
  if (unhealthyCount > 0) {
    findings.push({ text: `${unhealthyCount} of ${stats.total_servers} server${unhealthyCount !== 1 ? 's are' : ' is'} unhealthy`, critical: true });
  }
  if (backupCoverage && backupCoverage.failed_backups_24h > 0) {
    findings.push({ text: `${backupCoverage.failed_backups_24h} backup${backupCoverage.failed_backups_24h !== 1 ? 's' : ''} failed in the last 24h`, critical: true });
  }
  if (backupCoverage && backupCoverage.uncovered_applications.length > 0) {
    findings.push({ text: `${backupCoverage.uncovered_applications.length} application${backupCoverage.uncovered_applications.length !== 1 ? 's have' : ' has'} no backup coverage`, critical: true });
  }
  if (overdueBackups && overdueBackups.length > 0) {
    findings.push({ text: `${overdueBackups.length} backup${overdueBackups.length !== 1 ? 's are' : ' is'} overdue`, critical: true });
  }
  if (stats.failing_backups > 0) {
    findings.push({ text: `${stats.failing_backups} backup${stats.failing_backups !== 1 ? 's' : ''} in failed state`, critical: true });
  }
  const allClear = findings.length === 0;

  // Whether tier 2 data is still loading
  const tier2Loading = !serversResult || !applicationsResult || !backupsResult || !connectionsResult || !tagsResult;

  return (
    <div className="mx-auto max-w-4xl p-8 print:p-0 print:text-sm">
      {/* C10 + C11: Navigation header with back link and print button */}
      <header className="mb-8 flex items-center justify-between border-b border-gray-200 pb-4" data-no-print>
        <Link href="/" className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
        <Button variant="secondary" onClick={() => window.print()}>
          Print Report
        </Button>
      </header>

      {/* D16: Report title / print header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">ServerAtlas</h1>
        <p className="text-lg text-gray-600">Infrastructure Report</p>
        <p className="mt-1 text-sm text-gray-500">
          Managing {stats.total_servers} server{stats.total_servers !== 1 ? 's' : ''} across {stats.total_providers} provider{stats.total_providers !== 1 ? 's' : ''}
        </p>
        <p className="mt-1 text-xs text-gray-400">Generated on {timestampFull}</p>
        <hr className="mt-4 border-gray-200" />
      </div>

      {/* Executive Summary */}
      <section id="executive-summary" className={`mb-8 report-section print-keep-together ${allClear ? 'border-l-4 border-green-500 bg-green-50 p-4 rounded-r-lg' : 'border-l-4 border-red-500 bg-red-50 p-4 rounded-r-lg'}`}>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          {allClear ? 'All Systems Operational' : `${findings.length} Critical Finding${findings.length !== 1 ? 's' : ''}`}
        </h2>

        {/* Key Metrics Grid */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded border border-gray-200 bg-white p-3">
            <p className="text-lg font-bold text-gray-900">
              {costSummary.totals_by_currency.length > 0
                ? formatCost(costSummary.totals_by_currency[0].amount, costSummary.totals_by_currency[0].currency)
                : '\u2014'}
            </p>
            <p className="text-xs text-gray-500">Total Monthly Cost</p>
          </div>
          <div className="rounded border border-gray-200 bg-white p-3">
            <p className="text-lg font-bold text-gray-900">
              {stats.total_servers > 0
                ? `${Math.round((servers.filter(s => s.status === 'active').length / stats.total_servers) * 100)}%`
                : '0%'}
            </p>
            <p className="text-xs text-gray-500">Server Utilization</p>
          </div>
          <div className="rounded border border-gray-200 bg-white p-3">
            <p className="text-lg font-bold text-gray-900">
              {backupCoverage && backupCoverage.total_applications > 0
                ? `${Math.round((backupCoverage.covered_applications / backupCoverage.total_applications) * 100)}%`
                : '\u2014'}
            </p>
            <p className="text-xs text-gray-500">Backup Coverage</p>
          </div>
          <div className="rounded border border-gray-200 bg-white p-3">
            <p className={`text-lg font-bold ${findings.filter(f => f.critical).length > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {findings.filter(f => f.critical).length}
            </p>
            <p className="text-xs text-gray-500">Critical Findings</p>
          </div>
        </div>

        {allClear ? (
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500 print-color-exact" />
            <span className="text-sm font-medium text-green-800">No critical findings. All systems operational.</span>
          </div>
        ) : (
          <ul className="space-y-2">
            {findings.map((finding, i) => (
              <li key={i} className={`flex items-center gap-2 rounded border px-4 py-2 text-sm font-medium ${
                finding.critical
                  ? 'border-red-200 bg-red-50 text-red-800'
                  : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}>
                <span className={`inline-block h-2 w-2 rounded-full print-color-exact ${
                  finding.critical ? 'bg-red-500' : 'bg-amber-500'
                }`} />
                {finding.text}
              </li>
            ))}
          </ul>
        )}

        {/* Recommendations */}
        {(() => {
          const recommendations: string[] = [];
          if (stats.unhealthy_servers > 0) {
            recommendations.push(`Investigate ${stats.unhealthy_servers} unhealthy server${stats.unhealthy_servers !== 1 ? 's' : ''}`);
          }
          if (backupCoverage && backupCoverage.uncovered_applications.length > 0) {
            recommendations.push(`Configure backup for ${backupCoverage.uncovered_applications.length} uncovered application${backupCoverage.uncovered_applications.length !== 1 ? 's' : ''}`);
          }
          if (overdueBackups && overdueBackups.length > 0) {
            recommendations.push(`Review ${overdueBackups.length} overdue backup${overdueBackups.length !== 1 ? 's' : ''}`);
          }
          if (stats.failing_backups > 0) {
            recommendations.push(`Resolve ${stats.failing_backups} failing backup${stats.failing_backups !== 1 ? 's' : ''}`);
          }
          if (recommendations.length === 0) return null;
          return (
            <div className="mt-4 rounded border border-gray-200 bg-white p-3">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Recommendations</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                {recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          );
        })()}
      </section>

      {/* Table of Contents */}
      <nav className="mb-8 report-section print-keep-together">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Table of Contents</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-600">
          {[
            { id: 'summary', label: 'Summary' },
            { id: 'cost-breakdown', label: 'Cost Breakdown' },
            { id: 'backup-health', label: 'Backup Health' },
            { id: 'resource-summary', label: 'Resource Summary' },
            { id: 'server-inventory', label: 'Server Inventory' },
            { id: 'application-inventory', label: 'Application Inventory' },
            { id: 'ssh-topology', label: 'SSH Connection Topology' },
            { id: 'tag-distribution', label: 'Tag Distribution' },
            { id: 'cost-by-tag', label: 'Cost by Tag' },
            { id: 'overdue-backups', label: 'Overdue Backups' },
            { id: 'backup-schedule', label: 'Backup Schedule' },
          ].map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="hover:underline">
                {section.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* Filters - hidden in print */}
      <div className="mb-6 flex flex-wrap gap-4" data-no-print>
        <div className="w-48">
          <select
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={filterProvider}
            onChange={(e) => setFilterProvider(e.target.value)}
          >
            <option value="">All Providers</option>
            {[...new Set(allServers.map((s) => s.provider_name).filter(Boolean))].map((name) => (
              <option key={name} value={name!}>{name}</option>
            ))}
          </select>
        </div>
        <div className="w-48">
          <select
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="maintenance">Maintenance</option>
            <option value="decommissioned">Decommissioned</option>
          </select>
        </div>
        {(filterProvider || filterStatus) && (
          <button
            onClick={() => { setFilterProvider(''); setFilterStatus(''); }}
            className="self-center text-sm text-blue-600 hover:text-blue-800"
          >
            Clear filters
          </button>
        )}
      </div>

      {(filterProvider || filterStatus) && (
        <p className="mb-4 text-sm text-gray-600 italic print:border print:border-gray-300 print:rounded print:px-3 print:py-2 print:font-medium">
          Filtered by: {filterProvider ? `Provider: ${filterProvider}` : ''}{filterProvider && filterStatus ? ' | ' : ''}{filterStatus ? `Status: ${filterStatus}` : ''}
        </p>
      )}

      {/* Data truncation warning */}
      {((serversResult && serversResult.total > serversResult.items.length) ||
        (applicationsResult && applicationsResult.total > applicationsResult.items.length) ||
        (backupsResult && backupsResult.total > backupsResult.items.length)) && (
        <div className="mb-4 flex items-center gap-2 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.27 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span>
            <span className="font-medium">Partial data:</span>{' '}
            {serversResult && serversResult.total > serversResult.items.length && `Showing ${serversResult.items.length} of ${serversResult.total} servers. `}
            {applicationsResult && applicationsResult.total > applicationsResult.items.length && `Showing ${applicationsResult.items.length} of ${applicationsResult.total} applications. `}
            {backupsResult && backupsResult.total > backupsResult.items.length && `Showing ${backupsResult.items.length} of ${backupsResult.total} backups. `}
            Use filters to narrow down or export for complete data.
          </span>
        </div>
      )}

      {/* Summary */}
      <section id="summary" className="mb-8 report-section">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Summary</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded border p-3">
            <p className="text-2xl font-bold">{stats.total_servers}</p>
            <p className="text-sm text-gray-500">Servers</p>
          </div>
          <div className="rounded border p-3">
            <p className="text-2xl font-bold">{stats.total_providers}</p>
            <p className="text-sm text-gray-500">Providers</p>
          </div>
          <div className="rounded border p-3">
            <p className="text-2xl font-bold">{stats.total_applications}</p>
            <p className="text-sm text-gray-500">Applications</p>
          </div>
          <div className="rounded border p-3">
            <p className="text-2xl font-bold">{stats.total_ssh_keys}</p>
            <p className="text-sm text-gray-500">SSH Keys</p>
          </div>
          <div className="rounded border p-3">
            <p className="text-2xl font-bold">{tier2Loading ? '...' : connections.length}</p>
            <p className="text-sm text-gray-500">Connections</p>
          </div>
          <div className="rounded border p-3">
            <p className="text-2xl font-bold">{stats.total_backups}</p>
            <p className="text-sm text-gray-500">Backups</p>
          </div>
        </div>
      </section>

      {/* Cost Breakdown */}
      <section id="cost-breakdown" className="mb-8 report-section">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Cost Breakdown</h2>
        {costSummary.totals_by_currency.length > 0 ? (
          <div className="mb-4 flex gap-4">
            {costSummary.totals_by_currency.map((t) => (
              <div key={t.currency} className="rounded border p-3">
                <p className="text-xl font-bold">{formatCost(t.amount, t.currency)}</p>
                <p className="text-sm text-gray-500">Total {t.currency}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No cost data available.</p>
        )}
        {costSummary.by_provider.length > 0 && (
          <table className="w-full text-sm print:text-xs border-collapse">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left font-medium">Provider</th>
                <th className="py-2 text-right font-medium">Servers</th>
                <th className="py-2 text-right font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {costSummary.by_provider.map((item, i) => (
                <tr key={i} className={`border-b ${i % 2 === 1 ? 'bg-gray-50' : ''}`}>
                  <td className="py-2">{item.provider_name}</td>
                  <td className="py-2 text-right">{item.server_count}</td>
                  <td className="py-2 text-right font-mono">{formatCost(item.total_cost, item.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {costSummary.by_provider.length > 0 && (
          <div className="mt-4">
            <CSSBarChart
              title="Cost by Provider"
              items={costSummary.by_provider.map((item) => ({
                label: item.provider_name,
                value: Number(item.total_cost),
              }))}
              formatValue={(v) => formatCost(v)}
            />
          </div>
        )}
      </section>

      {/* Backup Health (Tier 1 data) */}
      {backupCoverage && (
        <section id="backup-health" className="mb-8 report-section">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Backup Health</h2>
          <div className="flex items-start gap-6">
            <CSSDonutIndicator
              percentage={backupCoverage.total_applications > 0
                ? (backupCoverage.covered_applications / backupCoverage.total_applications) * 100
                : 0}
              label="Backup Coverage"
              color={backupCoverage.total_applications > 0 && backupCoverage.covered_applications === backupCoverage.total_applications ? '#22c55e' : '#3b82f6'}
            />
            <div className="flex-1">
              <p className="text-sm">
                {backupCoverage.covered_applications} of {backupCoverage.total_applications} applications covered.
                {backupCoverage.failed_backups_24h > 0 && (
                  <span className="ml-2 font-semibold text-red-600">
                    {backupCoverage.failed_backups_24h} failed in last 24h.
                  </span>
                )}
              </p>
              {backupCoverage.uncovered_applications.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-700">Uncovered applications:</p>
                  <ul className="mt-1 list-inside list-disc text-sm text-gray-600">
                    {backupCoverage.uncovered_applications.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* --- Tier 2 sections: Show skeletons until data arrives --- */}

      {/* D14: Resource Summary */}
      {tier2Loading ? (
        <SectionSkeleton title="Resource Summary" />
      ) : servers.length > 0 ? (
        <section id="resource-summary" className="mb-8 report-section">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Resource Summary</h2>
          <div className="mb-4 grid grid-cols-3 gap-4">
            <div className="rounded border p-3">
              <p className="text-2xl font-bold">{totalCpu}</p>
              <p className="text-sm text-gray-500">Total CPU Cores</p>
            </div>
            <div className="rounded border p-3">
              <p className="text-2xl font-bold">{formatRAM(totalRam)}</p>
              <p className="text-sm text-gray-500">Total RAM</p>
            </div>
            <div className="rounded border p-3">
              <p className="text-2xl font-bold">{formatDisk(totalDisk)}</p>
              <p className="text-sm text-gray-500">Total Disk</p>
            </div>
          </div>

          {/* By status */}
          <table className="w-full text-sm print:text-xs border-collapse mb-4">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left font-medium">Status</th>
                <th className="py-2 text-right font-medium">Servers</th>
                <th className="py-2 text-right font-medium">CPU Cores</th>
                <th className="py-2 text-right font-medium">RAM</th>
                <th className="py-2 text-right font-medium">Disk</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2">Active</td>
                <td className="py-2 text-right">{activeServers.length}</td>
                <td className="py-2 text-right">{activeCpu}</td>
                <td className="py-2 text-right">{formatRAM(activeRam)}</td>
                <td className="py-2 text-right">{formatDisk(activeDisk)}</td>
              </tr>
              {inactiveServers.length > 0 && (
                <tr className="border-b">
                  <td className="py-2">Inactive / Maintenance</td>
                  <td className="py-2 text-right">{inactiveServers.length}</td>
                  <td className="py-2 text-right">{totalCpu - activeCpu}</td>
                  <td className="py-2 text-right">{formatRAM(totalRam - activeRam)}</td>
                  <td className="py-2 text-right">{formatDisk(totalDisk - activeDisk)}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* By provider */}
          {Object.keys(resourcesByProvider).length > 1 && (
            <table className="w-full text-sm print:text-xs border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left font-medium">Provider</th>
                  <th className="py-2 text-right font-medium">Servers</th>
                  <th className="py-2 text-right font-medium">CPU Cores</th>
                  <th className="py-2 text-right font-medium">RAM</th>
                  <th className="py-2 text-right font-medium">Disk</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(resourcesByProvider).map(([name, res], i) => (
                  <tr key={name} className={`border-b ${i % 2 === 1 ? 'bg-gray-50' : ''}`}>
                    <td className="py-2">{name}</td>
                    <td className="py-2 text-right">{res.count}</td>
                    <td className="py-2 text-right">{res.cpu}</td>
                    <td className="py-2 text-right">{formatRAM(res.ram)}</td>
                    <td className="py-2 text-right">{formatDisk(res.disk)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {Object.keys(resourcesByProvider).length > 0 && (
            <div className="mt-4">
              <CSSBarChart
                title="CPU Cores by Provider"
                items={Object.entries(resourcesByProvider).map(([name, res]) => ({
                  label: name,
                  value: res.cpu,
                }))}
                formatValue={(v) => formatNumber(v)}
              />
            </div>
          )}
        </section>
      ) : null}

      {/* Server Inventory */}
      {tier2Loading ? (
        <SectionSkeleton title="Server Inventory" />
      ) : (
        <section id="server-inventory" className="mb-8 report-section">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Server Inventory</h2>
          <table className="w-full text-sm print:text-xs border-collapse">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left font-medium">Name</th>
                <th className="py-2 text-left font-medium">Status</th>
                <th className="py-2 text-left font-medium">Health</th>
                <th className="py-2 text-left font-medium">Provider</th>
                <th className="py-2 text-left font-medium">IPv4</th>
                <th className="py-2 text-left font-medium">Hostname</th>
                <th className="py-2 text-left font-medium">Location</th>
                <th className="py-2 text-left font-medium">Tags</th>
                <th className="py-2 text-left font-medium">OS</th>
                <th className="py-2 text-right font-medium">CPU</th>
                <th className="py-2 text-right font-medium">RAM</th>
                <th className="py-2 text-right font-medium">Disk</th>
                <th className="py-2 text-right font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {servers.map((s, i) => (
                <tr key={s.id} className={`border-b ${i % 2 === 1 ? 'bg-gray-50' : ''}`}>
                  <td className="py-2">{s.name}</td>
                  <td className="py-2"><StatusBadge status={s.status} /></td>
                  <td className="py-2">
                    {/* C12: aria-label for health status */}
                    <span className="flex items-center gap-1">
                      <span
                        className={`inline-block h-2 w-2 rounded-full print-color-exact ${
                          s.last_check_status === 'healthy' ? 'bg-green-500' :
                          s.last_check_status === 'unhealthy' ? 'bg-red-500' :
                          'bg-gray-300'
                        }`}
                        aria-label={`Health status: ${
                          s.last_check_status === 'healthy' ? 'Healthy' :
                          s.last_check_status === 'unhealthy' ? 'Unhealthy' :
                          'Unknown'
                        }`}
                        role="img"
                      />
                      <span className="text-xs">
                        {s.last_check_status === 'healthy' ? 'Healthy' :
                         s.last_check_status === 'unhealthy' ? 'Unhealthy' :
                         'Unknown'}
                      </span>
                    </span>
                  </td>
                  <td className="py-2">{s.provider_name || '\u2014'}</td>
                  <td className="py-2 font-mono text-xs">{s.ip_v4 || '\u2014'}</td>
                  <td className="py-2 text-xs">{s.hostname || '\u2014'}</td>
                  <td className="py-2">{s.location || '\u2014'}</td>
                  <td className="py-2 text-xs">{(s.tags || []).map(t => t.name).join(', ') || '\u2014'}</td>
                  <td className="py-2">{s.os || '\u2014'}</td>
                  <td className="py-2 text-right">{s.cpu_cores ?? '\u2014'}</td>
                  <td className="py-2 text-right">{formatRAM(s.ram_mb)}</td>
                  <td className="py-2 text-right">{formatDisk(s.disk_gb)}</td>
                  <td className="py-2 text-right font-mono">{s.monthly_cost != null ? formatCost(s.monthly_cost, s.cost_currency) : '\u2014'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Application Inventory */}
      {tier2Loading ? (
        <SectionSkeleton title="Application Inventory" />
      ) : (
        <section id="application-inventory" className="mb-8 report-section">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Application Inventory</h2>
          {applications.length > 0 ? (
            <table className="w-full text-sm print:text-xs border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left font-medium">Name</th>
                  <th className="py-2 text-left font-medium">Server</th>
                  <th className="py-2 text-left font-medium">Type</th>
                  <th className="py-2 text-right font-medium">Port</th>
                  <th className="py-2 text-left font-medium">Status</th>
                  <th className="py-2 text-left font-medium">URL</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app, i) => (
                  <tr key={app.id} className={`border-b ${i % 2 === 1 ? 'bg-gray-50' : ''}`}>
                    <td className="py-2">{app.name}</td>
                    <td className="py-2">{app.server_name || '\u2014'}</td>
                    <td className="py-2">{app.app_type || '\u2014'}</td>
                    <td className="py-2 text-right">{app.port ?? '\u2014'}</td>
                    <td className="py-2"><StatusBadge status={app.status} /></td>
                    <td className="py-2 max-w-[200px] truncate">{app.url || '\u2014'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-gray-500">No applications yet.</p>
          )}
        </section>
      )}

      {/* SSH Connection Topology */}
      {tier2Loading ? (
        <SectionSkeleton title="SSH Connection Topology" />
      ) : (
        <section id="ssh-topology" className="mb-8 report-section">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">SSH Connection Topology</h2>
          {connections.length > 0 ? (
            <>
              <p className="mb-2 text-sm text-gray-600">
                {connections.length} connection{connections.length !== 1 ? 's' : ''} between{' '}
                {uniqueConnectionServers.size} server{uniqueConnectionServers.size !== 1 ? 's' : ''}
              </p>
              <table className="w-full text-sm print:text-xs border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left font-medium">Source Server</th>
                    <th className="py-2 text-left font-medium">Target Server</th>
                    <th className="py-2 text-left font-medium">User</th>
                    <th className="py-2 text-right font-medium">Port</th>
                    <th className="py-2 text-left font-medium">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {connections.map((conn, i) => (
                    <tr key={conn.id} className={`border-b ${i % 2 === 1 ? 'bg-gray-50' : ''}`}>
                      <td className="py-2">{conn.source_server_name || '\u2014'}</td>
                      <td className="py-2">{conn.target_server_name || '\u2014'}</td>
                      <td className="py-2">{conn.ssh_user || '\u2014'}</td>
                      <td className="py-2 text-right">{conn.ssh_port}</td>
                      <td className="py-2">{conn.purpose || '\u2014'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="text-sm text-gray-500">No SSH connections yet.</p>
          )}
        </section>
      )}

      {/* Tag Distribution */}
      {tier2Loading ? (
        <SectionSkeleton title="Tag Distribution" />
      ) : (
        <section id="tag-distribution" className="mb-8 report-section">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Tag Distribution</h2>
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
                  style={{
                    backgroundColor: tag.color + '20',
                    color: tag.color,
                    border: `1px solid ${tag.color}40`,
                  }}
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full print-color-exact"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                  <span className="ml-1 text-xs opacity-75">
                    ({tagServerCounts[tag.id] || 0} server{(tagServerCounts[tag.id] || 0) !== 1 ? 's' : ''})
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No tags yet.</p>
          )}
        </section>
      )}

      {/* --- Tier 3 sections: Show skeletons until data arrives --- */}

      {/* Cost by Tag */}
      {!tier2Ready ? (
        <SectionSkeleton title="Cost by Tag" />
      ) : costByTag && costByTag.length > 0 ? (
        <section id="cost-by-tag" className="mb-8 report-section">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Cost by Tag</h2>
          <table className="w-full text-sm print:text-xs border-collapse">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left font-medium">Tag</th>
                <th className="py-2 text-right font-medium">Servers</th>
                <th className="py-2 text-right font-medium">Monthly Cost</th>
              </tr>
            </thead>
            <tbody>
              {costByTag.map((item, i) => (
                <tr key={i} className={`border-b ${i % 2 === 1 ? 'bg-gray-50' : ''}`}>
                  <td className="py-2">
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full print-color-exact" style={{ backgroundColor: item.tag_color }} />
                      {item.tag_name}
                    </span>
                  </td>
                  <td className="py-2 text-right">{item.server_count}</td>
                  <td className="py-2 text-right font-mono">{formatCost(item.total_cost, item.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {/* C13 + D17: Overdue Backups detail section */}
      {!tier2Ready ? (
        <SectionSkeleton title="Overdue Backups" />
      ) : overdueBackups && overdueBackups.length > 0 ? (
        <section id="overdue-backups" className="mb-8 report-section">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Overdue Backups</h2>
          <p className="mb-3 text-sm text-red-600 font-medium">
            {overdueBackups.length} backup{overdueBackups.length !== 1 ? 's require' : ' requires'} attention.
          </p>
          <table className="w-full text-sm print:text-xs border-collapse">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left font-medium">Name</th>
                <th className="py-2 text-left font-medium">Source Server</th>
                <th className="py-2 text-left font-medium">Frequency</th>
                <th className="py-2 text-left font-medium">Last Run</th>
                <th className="py-2 text-left font-medium">Overdue By</th>
              </tr>
            </thead>
            <tbody>
              {overdueBackups.map((b: OverdueBackup, i: number) => (
                <tr key={b.id} className={`border-b ${i % 2 === 1 ? 'bg-gray-50' : ''}`}>
                  <td className="py-2 font-medium">{b.name}</td>
                  <td className="py-2">{b.source_server_name || '\u2014'}</td>
                  <td className="py-2 capitalize">{b.frequency}</td>
                  <td className="py-2">{b.last_run_at ? formatDateTime(b.last_run_at) : 'Never'}</td>
                  <td className="py-2">
                    <span className={`inline-flex items-center gap-1 font-medium ${
                      b.hours_overdue >= 48 ? 'text-red-600' : 'text-amber-600'
                    }`}>
                      <span className={`inline-block h-2 w-2 rounded-full print-color-exact ${
                        b.hours_overdue >= 48 ? 'bg-red-500' : 'bg-amber-500'
                      }`} />
                      {formatOverdueDuration(b.hours_overdue)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {/* Backup Schedule */}
      {tier2Loading ? (
        <SectionSkeleton title="Backup Schedule" />
      ) : backups.length > 0 ? (
        <section id="backup-schedule" className="mb-8 report-section">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Backup Schedule</h2>
          <table className="w-full text-sm print:text-xs border-collapse">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left font-medium">Name</th>
                <th className="py-2 text-left font-medium">Source Server</th>
                <th className="py-2 text-left font-medium">Application</th>
                <th className="py-2 text-left font-medium">Frequency</th>
                <th className="py-2 text-right font-medium">Retention</th>
                <th className="py-2 text-left font-medium">Last Run</th>
                <th className="py-2 text-left font-medium">Last Status</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b, i) => (
                <tr key={b.id} className={`border-b ${i % 2 === 1 ? 'bg-gray-50' : ''}`}>
                  <td className="py-2">{b.name}</td>
                  <td className="py-2">{b.source_server_name || '\u2014'}</td>
                  <td className="py-2">{b.application_name || '\u2014'}</td>
                  <td className="py-2 capitalize">{b.frequency}</td>
                  <td className="py-2 text-right">{b.retention_days != null ? `${b.retention_days}d` : '\u2014'}</td>
                  <td className="py-2">{b.last_run_at ? formatDateTime(b.last_run_at) : 'Never'}</td>
                  <td className="py-2"><StatusBadge status={b.last_run_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {/* Print-only footer */}
      <footer className="hidden print:block print:fixed print:bottom-0 print:left-0 print:right-0 border-t border-gray-300 pt-2 text-xs text-gray-400 bg-white">
        <div className="flex justify-between">
          <span>ServerAtlas Infrastructure Report</span>
          <span>Generated {timestampFull}</span>
        </div>
      </footer>
    </div>
  );
}
