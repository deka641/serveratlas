'use client';

import { useData } from '@/hooks/useData';
import { api } from '@/lib/api';
import { formatCost, formatRAM, formatDisk } from '@/lib/formatters';
import StatusBadge from '@/components/ui/StatusBadge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import type { Application, SshConnection, Tag, Server } from '@/lib/types';

export default function ReportPage() {
  const { data: stats } = useData(() => api.getDashboardStats());
  const { data: costSummary } = useData(() => api.getCostSummary());
  const { data: serversResult } = useData(() => api.listServers({ limit: 500 }));
  const { data: backupCoverage } = useData(() => api.getBackupCoverage());
  const { data: applicationsResult } = useData(() => api.listApplications({ limit: 500 }));
  const { data: connectionsResult } = useData(() => api.listSshConnections({ limit: 500 }));
  const { data: tags } = useData(() => api.listTags());

  const servers = serversResult?.items ?? [];
  const applications = applicationsResult?.items ?? [];
  const connections = connectionsResult?.items ?? [];

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

  if (!stats || !costSummary) return <div className="p-8"><LoadingSpinner /></div>;

  return (
    <div className="mx-auto max-w-4xl p-8 print:p-0 print:text-xs">
      <header className="mb-8 border-b border-gray-200 pb-4" data-no-print>
        <button
          onClick={() => window.print()}
          className="float-right rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 print:hidden"
          data-no-print
        >
          Print Report
        </button>
      </header>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">ServerAtlas</h1>
        <p className="text-lg text-gray-600">Infrastructure Report</p>
        <p className="mt-1 text-sm text-gray-500">Generated on {dateWithDay}</p>
      </div>

      {/* Summary */}
      <section className="mb-8">
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
            <p className="text-2xl font-bold">{connections.length}</p>
            <p className="text-sm text-gray-500">Connections</p>
          </div>
          <div className="rounded border p-3">
            <p className="text-2xl font-bold">{stats.total_backups}</p>
            <p className="text-sm text-gray-500">Backups</p>
          </div>
        </div>
      </section>

      {/* Cost Breakdown */}
      <section className="mb-8">
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
                <tr key={i} className="border-b">
                  <td className="py-2">{item.provider_name}</td>
                  <td className="py-2 text-right">{item.server_count}</td>
                  <td className="py-2 text-right font-mono">{formatCost(item.total_cost, item.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Server Inventory */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Server Inventory</h2>
        <table className="w-full text-sm print:text-xs border-collapse">
          <thead>
            <tr className="border-b">
              <th className="py-2 text-left font-medium">Name</th>
              <th className="py-2 text-left font-medium">Status</th>
              <th className="py-2 text-left font-medium">Provider</th>
              <th className="py-2 text-left font-medium">OS</th>
              <th className="py-2 text-right font-medium">CPU</th>
              <th className="py-2 text-right font-medium">RAM</th>
              <th className="py-2 text-right font-medium">Disk</th>
              <th className="py-2 text-right font-medium">Cost</th>
            </tr>
          </thead>
          <tbody>
            {servers.map((s) => (
              <tr key={s.id} className="border-b">
                <td className="py-2">{s.name}</td>
                <td className="py-2"><StatusBadge status={s.status} /></td>
                <td className="py-2">{s.provider_name || '\u2014'}</td>
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

      {/* Application Inventory */}
      <section className="mb-8">
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
              {applications.map((app) => (
                <tr key={app.id} className="border-b">
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

      {/* SSH Connection Topology */}
      <section className="mb-8">
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
                {connections.map((conn) => (
                  <tr key={conn.id} className="border-b">
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

      {/* Tag Distribution */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Tag Distribution</h2>
        {tags && tags.length > 0 ? (
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
                  className="inline-block h-2 w-2 rounded-full"
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

      {/* Backup Health */}
      {backupCoverage && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Backup Health</h2>
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
        </section>
      )}

      {/* Print-only footer */}
      <footer className="hidden print:block mt-12 border-t border-gray-300 pt-4 text-xs text-gray-400">
        <div className="flex justify-between">
          <span>ServerAtlas Infrastructure Report</span>
          <span>Generated {timestampFull}</span>
        </div>
      </footer>
    </div>
  );
}
