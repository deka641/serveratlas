'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import PageContainer from '@/components/PageContainer';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import Table, { Column } from '@/components/ui/Table';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { useProvider, useProviderServers } from '@/hooks/useProviders';
import { api } from '@/lib/api';
import { formatDate, formatCost } from '@/lib/formatters';
import type { Server } from '@/lib/types';

export default function ProviderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const id = Number(params.id);
  const { data: provider, loading, error, refetch } = useProvider(id);
  const { data: servers } = useProviderServers(id);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteProvider(id);
      addToast('success', 'Provider deleted successfully.');
      router.push('/providers');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to delete provider.');
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const serverColumns: Column<Server>[] = [
    {
      key: 'name',
      label: 'Name',
      render: (server) => (
        <Link
          href={`/servers/${server.id}`}
          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
        >
          {server.name}
        </Link>
      ),
    },
    {
      key: 'hostname',
      label: 'Hostname',
      render: (server) => server.hostname || <span className="text-gray-400">&mdash;</span>,
    },
    {
      key: 'ip_v4',
      label: 'IP Address',
      render: (server) => server.ip_v4 || <span className="text-gray-400">&mdash;</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (server) => <StatusBadge status={server.status} />,
    },
  ];

  return (
    <PageContainer
      title={provider?.name ?? 'Provider'}
      breadcrumbs={[{ label: 'Providers', href: '/providers' }, { label: provider?.name ?? 'Provider' }]}
      loading={loading}
      error={error}
      onRetry={refetch}
      action={
        provider && (
          <div className="flex items-center gap-2">
            <Link href={`/providers/${id}/edit`}>
              <Button variant="secondary">Edit</Button>
            </Link>
            <Button variant="danger" onClick={() => setShowDeleteDialog(true)}>
              Delete
            </Button>
          </div>
        )
      }
    >
      {provider && (
        <div className="space-y-6">
          <Card title="Provider Details">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{provider.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Website</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {provider.website ? (
                    <a
                      href={provider.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {provider.website}
                    </a>
                  ) : (
                    <span className="text-gray-400">&mdash;</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Support Contact</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {provider.support_contact || <span className="text-gray-400">&mdash;</span>}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Server Count</dt>
                <dd className="mt-1 text-sm text-gray-900">{provider.server_count}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
                  {provider.notes || '\u2014'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(provider.created_at)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(provider.updated_at)}
                </dd>
              </div>
            </dl>
          </Card>

          {servers && servers.length > 0 && (() => {
            const costByCurrency: Record<string, number> = {};
            let activeCount = 0;
            for (const s of servers) {
              if (s.monthly_cost != null) {
                const currency = s.cost_currency || 'EUR';
                costByCurrency[currency] = (costByCurrency[currency] || 0) + Number(s.monthly_cost);
              }
              if (s.status === 'active') activeCount++;
            }
            const currencies = Object.entries(costByCurrency);
            if (currencies.length === 0) return null;
            return (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {currencies.map(([currency, total]) => (
                  <div key={currency} className="rounded-lg border border-gray-200 bg-white p-4 border-l-4 border-l-blue-500">
                    <p className="text-sm font-medium text-gray-500">Monthly Cost ({currency})</p>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">{formatCost(total, currency)}</p>
                  </div>
                ))}
                <div className="rounded-lg border border-gray-200 bg-white p-4 border-l-4 border-l-green-500">
                  <p className="text-sm font-medium text-gray-500">Active Servers</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{activeCount} / {servers.length}</p>
                </div>
              </div>
            );
          })()}

          <Card title="Servers" noPadding>
            <Table
              columns={serverColumns}
              data={servers ?? []}
              keyExtractor={(item) => item.id}
            />
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={showDeleteDialog}
        title="Delete Provider"
        message={`Are you sure you want to delete "${provider?.name}"? This action cannot be undone.`}
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </PageContainer>
  );
}
