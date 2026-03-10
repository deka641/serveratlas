'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSshConnections } from '@/hooks/useSshConnections';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import PageContainer from '@/components/PageContainer';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import SshConnectionTable from '@/components/domain/SshConnectionTable';
import Pagination from '@/components/ui/Pagination';
import { useDebounce } from '@/hooks/useDebounce';

const PAGE_SIZE = 100;

export default function SshConnectionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [page, setPage] = useState(0);

  useEffect(() => { setPage(0); }, [debouncedSearch]);

  const { data: connections, total, loading, error, refetch } = useSshConnections({
    search: debouncedSearch || undefined,
    skip: page * PAGE_SIZE,
    limit: PAGE_SIZE,
  });
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
      onRetry={refetch}
      action={
        <Link href="/ssh-connections/new">
          <Button>Add Connection</Button>
        </Link>
      }
    >
      <div className="mb-4">
        <Input
          placeholder="Search connections..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {connections && connections.length > 0 ? (
        <>
          <SshConnectionTable connections={connections} onDelete={handleDelete} />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </>
      ) : !loading ? (
        <EmptyState
          message={searchTerm ? 'No connections match your search' : 'No SSH connections found'}
          description={searchTerm ? 'Try a different search term.' : 'Get started by adding your first SSH connection.'}
        />
      ) : null}
    </PageContainer>
  );
}
