'use client';

import Link from 'next/link';
import { useSshKeys } from '@/hooks/useSshKeys';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import PageContainer from '@/components/PageContainer';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import SshKeyTable from '@/components/domain/SshKeyTable';

export default function SshKeysPage() {
  const { data: keys, loading, error, refetch } = useSshKeys();
  const { addToast } = useToast();

  const handleDelete = async (id: number) => {
    try {
      await api.deleteSshKey(id);
      addToast('success', 'SSH key deleted successfully');
      refetch();
    } catch {
      addToast('error', 'Failed to delete SSH key');
    }
  };

  return (
    <PageContainer
      title="SSH Keys"
      loading={loading}
      error={error}
      action={
        <Link href="/ssh-keys/new">
          <Button>Add SSH Key</Button>
        </Link>
      }
    >
      {keys && keys.length > 0 ? (
        <SshKeyTable keys={keys} onDelete={handleDelete} />
      ) : (
        <EmptyState
          message="No SSH keys found"
          description="Get started by adding your first SSH key."
        />
      )}
    </PageContainer>
  );
}
