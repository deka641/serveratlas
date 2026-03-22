'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { ServerDetail } from '@/lib/types';
import { formatCost, formatRAM, formatDisk } from '@/lib/formatters';
import PageContainer from '@/components/PageContainer';
import StatusBadge from '@/components/ui/StatusBadge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

function CompareContent() {
  const searchParams = useSearchParams();
  const idsParam = searchParams.get('ids') || '';
  const ids = idsParam.split(',').map(Number).filter(Boolean);

  const [servers, setServers] = useState<ServerDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ids.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all(ids.map((id) => api.getServer(id)))
      .then(setServers)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [idsParam]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <PageContainer title="Compare Servers"><LoadingSpinner /></PageContainer>;
  if (error) return <PageContainer title="Compare Servers" error={error}>{null}</PageContainer>;
  if (servers.length === 0) {
    return (
      <PageContainer title="Compare Servers" breadcrumbs={[{ label: 'Servers', href: '/servers' }, { label: 'Compare' }]}>
        <p className="text-sm text-gray-500">Select servers to compare by adding ?ids=1,2,3 to the URL.</p>
      </PageContainer>
    );
  }

  const rows: { label: string; key: string; render: (s: ServerDetail) => React.ReactNode; getValue: (s: ServerDetail) => string }[] = [
    { label: 'Name', key: 'name', render: (s) => <Link href={`/servers/${s.id}`} className="font-medium text-blue-600 hover:underline">{s.name}</Link>, getValue: (s) => s.name },
    { label: 'Status', key: 'status', render: (s) => <StatusBadge status={s.status} />, getValue: (s) => s.status },
    { label: 'Provider', key: 'provider', render: (s) => s.provider_name || '\u2014', getValue: (s) => s.provider_name || '' },
    { label: 'OS', key: 'os', render: (s) => s.os || '\u2014', getValue: (s) => s.os || '' },
    { label: 'CPU Cores', key: 'cpu', render: (s) => s.cpu_cores != null ? String(s.cpu_cores) : '\u2014', getValue: (s) => String(s.cpu_cores ?? '') },
    { label: 'RAM', key: 'ram', render: (s) => formatRAM(s.ram_mb), getValue: (s) => String(s.ram_mb ?? '') },
    { label: 'Disk', key: 'disk', render: (s) => formatDisk(s.disk_gb), getValue: (s) => String(s.disk_gb ?? '') },
    { label: 'Location', key: 'location', render: (s) => s.location || '\u2014', getValue: (s) => s.location || '' },
    { label: 'Monthly Cost', key: 'cost', render: (s) => s.monthly_cost != null ? formatCost(s.monthly_cost, s.cost_currency) : '\u2014', getValue: (s) => String(s.monthly_cost ?? '') },
    { label: 'IP', key: 'ip', render: (s) => s.ip_v4 || '\u2014', getValue: (s) => s.ip_v4 || '' },
    { label: 'Applications', key: 'apps', render: (s) => String(s.applications?.length ?? 0), getValue: (s) => String(s.applications?.length ?? 0) },
  ];

  // Compute which rows have differing values (skip Name row which is always different)
  const diffRows = new Set<string>();
  for (const row of rows) {
    if (row.key === 'name') continue;
    const values = servers.map((s) => row.getValue(s));
    if (values.some((v) => v !== values[0])) {
      diffRows.add(row.key);
    }
  }
  const diffCount = diffRows.size;
  const comparableCount = rows.length - 1; // exclude Name

  return (
    <PageContainer
      title="Compare Servers"
      breadcrumbs={[{ label: 'Servers', href: '/servers' }, { label: 'Compare' }]}
    >
      <div className="mb-4 flex items-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-4 py-2 text-sm text-blue-700">
        <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
        </svg>
        {diffCount} of {comparableCount} attributes differ between servers.
        {diffCount > 0 && ' Differences are highlighted in yellow.'}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-700">Attribute</th>
              {servers.map((s) => (
                <th key={s.id} className="px-4 py-3 text-left font-medium text-gray-700">
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isDiff = diffRows.has(row.key);
              return (
                <tr key={row.label} className={`border-b border-gray-100 ${isDiff ? 'bg-amber-50' : ''}`}>
                  <td className={`px-4 py-3 font-medium ${isDiff ? 'text-amber-700' : 'text-gray-500'}`}>
                    {row.label}
                    {isDiff && <span className="ml-1 text-xs text-amber-500">*</span>}
                  </td>
                  {servers.map((s) => (
                    <td key={s.id} className="px-4 py-3 text-gray-700">
                      {row.render(s)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </PageContainer>
  );
}

export default function ServerComparePage() {
  return (
    <Suspense>
      <CompareContent />
    </Suspense>
  );
}
