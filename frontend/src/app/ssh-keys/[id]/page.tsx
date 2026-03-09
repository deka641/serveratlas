'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useSshKey } from '@/hooks/useSshKeys';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import PageContainer from '@/components/PageContainer';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Table, { Column } from '@/components/ui/Table';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useState } from 'react';

export default function SshKeyDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();
  const { addToast } = useToast();
  const { data: key, loading, error, refetch } = useSshKey(id);
  const [showDelete, setShowDelete] = useState(false);

  const handleDelete = async () => {
    try {
      await api.deleteSshKey(id);
      addToast('success', 'SSH key deleted successfully');
      router.push('/ssh-keys');
    } catch {
      addToast('error', 'Failed to delete SSH key');
    }
  };

  const serverColumns: Column<Record<string, unknown>>[] = [
    {
      key: 'server_name',
      label: 'Server',
      render: (row) => (
        <Link href={`/servers/${row.server_id}`} className="font-medium text-blue-600 hover:text-blue-800">
          {row.server_name as string}
        </Link>
      ),
    },
    {
      key: 'is_authorized',
      label: 'Authorized',
      render: (row) => (
        <Badge color={row.is_authorized ? 'green' : 'gray'}>
          {row.is_authorized ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      key: 'is_host_key',
      label: 'Host Key',
      render: (row) => (
        <Badge color={row.is_host_key ? 'blue' : 'gray'}>
          {row.is_host_key ? 'Yes' : 'No'}
        </Badge>
      ),
    },
  ];

  return (
    <PageContainer
      title={key?.name || 'SSH Key'}
      breadcrumbs={[{ label: 'SSH Keys', href: '/ssh-keys' }, { label: key?.name ?? 'SSH Key' }]}
      loading={loading}
      error={error}
      onRetry={refetch}
      action={
        <div className="flex items-center gap-2">
          <Link href={`/ssh-keys/${id}/edit`}>
            <Button variant="secondary">Edit</Button>
          </Link>
          <Button variant="danger" onClick={() => setShowDelete(true)}>
            Delete
          </Button>
        </div>
      }
    >
      {key && (
        <div className="space-y-6">
          <Card title="Key Details">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{key.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Key Type</dt>
                <dd className="mt-1">
                  {key.key_type ? (
                    <Badge>{key.key_type.toUpperCase()}</Badge>
                  ) : (
                    <span className="text-sm text-gray-500">{'\u2014'}</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Fingerprint</dt>
                <dd className="mt-1 font-mono text-sm text-gray-900">{key.fingerprint || '\u2014'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Comment</dt>
                <dd className="mt-1 text-sm text-gray-900">{key.comment || '\u2014'}</dd>
              </div>
              {key.public_key && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Public Key</dt>
                  <dd className="mt-1 break-all rounded bg-gray-50 p-3 font-mono text-xs text-gray-900">
                    {key.public_key}
                  </dd>
                </div>
              )}
              {key.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Notes</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-900">{key.notes}</dd>
                </div>
              )}
            </dl>
          </Card>

          <Card title="Associated Servers" noPadding>
            {key.servers && key.servers.length > 0 ? (
              <Table
                columns={serverColumns}
                data={key.servers as unknown as Record<string, unknown>[]}
              />
            ) : (
              <div className="p-6 text-center text-sm text-gray-500">
                No servers associated with this key.
              </div>
            )}
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={showDelete}
        title="Delete SSH Key"
        message={`Are you sure you want to delete "${key?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </PageContainer>
  );
}
