'use client';

import { useData } from '@/hooks/useData';
import { api } from '@/lib/api';
import { formatCost, formatRAM, formatDisk } from '@/lib/formatters';
import StatusBadge from '@/components/ui/StatusBadge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function ReportPage() {
  const { data: stats } = useData(() => api.getDashboardStats());
  const { data: costSummary } = useData(() => api.getCostSummary());
  const { data: serversResult } = useData(() => api.listServers({ limit: 500 }));
  const { data: backupCoverage } = useData(() => api.getBackupCoverage());

  const servers = serversResult?.items ?? [];

  if (!stats || !costSummary) return <div className="p-8"><LoadingSpinner /></div>;

  return (
    <div className="mx-auto max-w-4xl p-8 print:p-0">
      <header className="mb-8 border-b border-gray-200 pb-4" data-no-print>
        <button
          onClick={() => window.print()}
          className="float-right rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 print:hidden"
        >
          Print Report
        </button>
      </header>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">ServerAtlas Infrastructure Report</h1>
        <p className="mt-1 text-sm text-gray-500">Generated on {new Date().toLocaleDateString()}</p>
      </div>

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
            <p className="text-2xl font-bold">{stats.total_backups}</p>
            <p className="text-sm text-gray-500">Backups</p>
          </div>
        </div>
      </section>

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
          <table className="w-full text-sm border-collapse">
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

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Server Inventory</h2>
        <table className="w-full text-sm border-collapse">
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
    </div>
  );
}
