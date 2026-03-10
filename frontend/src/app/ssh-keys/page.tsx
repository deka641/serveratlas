'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSshKeys } from '@/hooks/useSshKeys';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import PageContainer from '@/components/PageContainer';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import SshKeyTable from '@/components/domain/SshKeyTable';
import Pagination from '@/components/ui/Pagination';
import { useDebounce } from '@/hooks/useDebounce';

const PAGE_SIZE = 100;

export default function SshKeysPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [page, setPage] = useState(0);

  useEffect(() => { setPage(0); }, [debouncedSearch]);

  const { data: keys, total, loading, error, refetch } = useSshKeys({
    search: debouncedSearch || undefined,
    skip: page * PAGE_SIZE,
    limit: PAGE_SIZE,
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
        <>
          <SshKeyTable keys={keys} onDelete={handleDelete} />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </>
      ) : !loading ? (
        <EmptyState
          message={searchTerm ? 'No SSH keys match your search' : 'No SSH keys found'}
          description={searchTerm ? 'Try a different search term.' : 'Get started by adding your first SSH key.'}
        />
      ) : null}
    </PageContainer>
  );
}
