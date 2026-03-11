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

  const rows: { label: string; render: (s: ServerDetail) => React.ReactNode }[] = [
    { label: 'Name', render: (s) => <Link href={`/servers/${s.id}`} className="font-medium text-blue-600 hover:underline">{s.name}</Link> },
    { label: 'Status', render: (s) => <StatusBadge status={s.status} /> },
    { label: 'Provider', render: (s) => s.provider_name || '\u2014' },
    { label: 'OS', render: (s) => s.os || '\u2014' },
    { label: 'CPU Cores', render: (s) => s.cpu_cores != null ? String(s.cpu_cores) : '\u2014' },
    { label: 'RAM', render: (s) => formatRAM(s.ram_mb) },
    { label: 'Disk', render: (s) => formatDisk(s.disk_gb) },
    { label: 'Location', render: (s) => s.location || '\u2014' },
    { label: 'Monthly Cost', render: (s) => s.monthly_cost != null ? formatCost(s.monthly_cost, s.cost_currency) : '\u2014' },
    { label: 'IP', render: (s) => s.ip_v4 || '\u2014' },
    { label: 'Applications', render: (s) => String(s.applications?.length ?? 0) },
  ];

  return (
    <PageContainer
      title="Compare Servers"
      breadcrumbs={[{ label: 'Servers', href: '/servers' }, { label: 'Compare' }]}
    >
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
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-gray-100">
                <td className="px-4 py-3 font-medium text-gray-500">{row.label}</td>
                {servers.map((s) => (
                  <td key={s.id} className="px-4 py-3 text-gray-700">
                    {row.render(s)}
                  </td>
                ))}
              </tr>
            ))}
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
