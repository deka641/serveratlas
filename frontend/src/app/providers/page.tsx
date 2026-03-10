'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageContainer from '@/components/PageContainer';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import ProviderTable from '@/components/domain/ProviderTable';
import Pagination from '@/components/ui/Pagination';
import { useProviders } from '@/hooks/useProviders';
import { useDebounce } from '@/hooks/useDebounce';

const PAGE_SIZE = 100;

export default function ProvidersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [page, setPage] = useState(0);

  useEffect(() => { setPage(0); }, [debouncedSearch]);

  const { data: providers, total, loading, error, refetch } = useProviders({
    search: debouncedSearch || undefined,
    skip: page * PAGE_SIZE,
    limit: PAGE_SIZE,
  });

  return (
    <PageContainer
      title="Providers"
      loading={loading}
      error={error}
      onRetry={refetch}
      action={
        <Link href="/providers/new">
          <Button>Add Provider</Button>
        </Link>
      }
    >
      <div className="mb-4">
        <Input
          placeholder="Search providers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {providers && providers.length > 0 ? (
        <>
          <ProviderTable providers={providers} onDelete={refetch} />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </>
      ) : !loading ? (
        <EmptyState
          message={searchTerm ? 'No providers match your search' : 'No providers yet'}
          description={searchTerm ? 'Try a different search term.' : 'Get started by adding your first provider.'}
          actionLabel={searchTerm ? undefined : 'Add Provider'}
          onAction={searchTerm ? undefined : () => {
            window.location.href = '/providers/new';
          }}
        />
      ) : null}
    </PageContainer>
  );
}
