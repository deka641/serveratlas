'use client';

import { useState } from 'react';
import Link from 'next/link';
import PageContainer from '@/components/PageContainer';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import ProviderTable from '@/components/domain/ProviderTable';
import { useProviders } from '@/hooks/useProviders';
import { useDebounce } from '@/hooks/useDebounce';

export default function ProvidersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const { data: providers, loading, error, refetch } = useProviders({
    search: debouncedSearch || undefined,
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
        <ProviderTable providers={providers} onDelete={refetch} />
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
