'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSshConnection } from '@/hooks/useSshConnections';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import PageContainer from '@/components/PageContainer';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import DetailSkeleton from '@/components/ui/DetailSkeleton';

export default function SshConnectionDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();
  const { addToast } = useToast();
  const { data: conn, loading, error, refetch } = useSshConnection(id);
  const [showDelete, setShowDelete] = useState(false);

  const handleDelete = async () => {
    try {
      await api.deleteSshConnection(id);
      addToast('success', 'SSH connection deleted successfully');
      router.push('/ssh-connections');
    } catch {
      addToast('error', 'Failed to delete SSH connection');
    }
  };

  return (
    <PageContainer
      title={conn ? `${conn.source_server_name} → ${conn.target_server_name}` : 'SSH Connection'}
      breadcrumbs={[{ label: 'SSH Connections', href: '/ssh-connections' }, { label: conn ? `${conn.source_server_name} → ${conn.target_server_name}` : 'SSH Connection' }]}
      error={error}
      onRetry={refetch}
      action={
        <div className="flex items-center gap-2">
          <Link href={`/ssh-connections/${id}/edit`}>
            <Button variant="secondary">Edit</Button>
          </Link>
          <Button variant="danger" onClick={() => setShowDelete(true)}>
            Delete
          </Button>
        </div>
      }
    >
      {loading ? <DetailSkeleton cards={2} fieldsPerCard={4} /> : conn && (
        <Card title="Connection Details">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Source Server</dt>
              <dd className="mt-1">
                <Link
                  href={`/servers/${conn.source_server_id}`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  {conn.source_server_name || `Server #${conn.source_server_id}`}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Target Server</dt>
              <dd className="mt-1">
                <Link
                  href={`/servers/${conn.target_server_id}`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  {conn.target_server_name || `Server #${conn.target_server_id}`}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">SSH User</dt>
              <dd className="mt-1 font-mono text-sm text-gray-900">
                {conn.ssh_user || '\u2014'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">SSH Port</dt>
              <dd className="mt-1 font-mono text-sm text-gray-900">{conn.ssh_port}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">SSH Key</dt>
              <dd className="mt-1">
                {conn.ssh_key_id ? (
                  <Link
                    href={`/ssh-keys/${conn.ssh_key_id}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    {conn.ssh_key_name || `Key #${conn.ssh_key_id}`}
                  </Link>
                ) : (
                  <span className="text-sm text-gray-500">{'\u2014'}</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Purpose</dt>
              <dd className="mt-1 text-sm text-gray-900">{conn.purpose || '\u2014'}</dd>
            </div>
            {conn.notes && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-900">{conn.notes}</dd>
              </div>
            )}
          </dl>
        </Card>
      )}

      <ConfirmDialog
        open={showDelete}
        title="Delete SSH Connection"
        message="Are you sure you want to delete this connection? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </PageContainer>
  );
}
