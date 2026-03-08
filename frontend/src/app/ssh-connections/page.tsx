'use client';

import Link from 'next/link';
import { useSshConnections } from '@/hooks/useSshConnections';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import PageContainer from '@/components/PageContainer';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import SshConnectionTable from '@/components/domain/SshConnectionTable';

export default function SshConnectionsPage() {
  const { data: connections, loading, error, refetch } = useSshConnections();
  const { addToast } = useToast();

  const handleDelete = async (id: number) => {
    try {
      await api.deleteSshConnection(id);
      addToast('success', 'SSH connection deleted successfully');
      refetch();
    } catch {
      addToast('error', 'Failed to delete SSH connection');
    }
  };

  return (
    <PageContainer
      title="SSH Connections"
      loading={loading}
      error={error}
      action={
        <Link href="/ssh-connections/new">
          <Button>Add Connection</Button>
        </Link>
      }
    >
      {connections && connections.length > 0 ? (
        <SshConnectionTable connections={connections} onDelete={handleDelete} />
      ) : (
        <EmptyState
          message="No SSH connections found"
          description="Add your first SSH connection to get started."
        />
      )}
    </PageContainer>
  );
}
