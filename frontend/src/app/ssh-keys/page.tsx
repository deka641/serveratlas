'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSshKeys } from '@/hooks/useSshKeys';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import PageContainer from '@/components/PageContainer';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import SshKeyTable from '@/components/domain/SshKeyTable';
import { useDebounce } from '@/hooks/useDebounce';

export default function SshKeysPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const { data: keys, loading, error, refetch } = useSshKeys({
    search: debouncedSearch || undefined,
  });
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
      onRetry={refetch}
      action={
        <Link href="/ssh-keys/new">
          <Button>Add SSH Key</Button>
        </Link>
      }
    >
      <div className="mb-4">
        <Input
          placeholder="Search SSH keys..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {keys && keys.length > 0 ? (
        <SshKeyTable keys={keys} onDelete={handleDelete} />
      ) : !loading ? (
        <EmptyState
          message={searchTerm ? 'No SSH keys match your search' : 'No SSH keys found'}
          description={searchTerm ? 'Try a different search term.' : 'Get started by adding your first SSH key.'}
        />
      ) : null}
    </PageContainer>
  );
}
