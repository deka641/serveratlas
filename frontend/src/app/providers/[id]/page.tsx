'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import PageContainer from '@/components/PageContainer';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Table, { Column } from '@/components/ui/Table';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { useProvider, useProviderServers } from '@/hooks/useProviders';
import { api } from '@/lib/api';
import type { Server } from '@/lib/types';

const statusColors: Record<string, 'green' | 'red' | 'yellow' | 'gray'> = {
  active: 'green',
  inactive: 'gray',
  maintenance: 'yellow',
  decommissioned: 'red',
};

export default function ProviderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const id = Number(params.id);
  const { data: provider, loading, error } = useProvider(id);
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
      render: (server) => (
        <Badge color={statusColors[server.status] || 'gray'}>
          {server.status}
        </Badge>
      ),
    },
  ];

  return (
    <PageContainer
      title={provider?.name ?? 'Provider'}
      loading={loading}
      error={error}
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
              {provider.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Notes</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
                    {provider.notes}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(provider.created_at).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(provider.updated_at).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </Card>

          <Card title="Servers" noPadding>
            <Table
              columns={serverColumns as unknown as Column<Record<string, unknown>>[]}
              data={(servers ?? []) as unknown as Record<string, unknown>[]}
              keyExtractor={(item) => (item as unknown as Server).id}
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
