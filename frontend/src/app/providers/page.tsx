'use client';

import Link from 'next/link';
import PageContainer from '@/components/PageContainer';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import ProviderTable from '@/components/domain/ProviderTable';
import { useProviders } from '@/hooks/useProviders';

export default function ProvidersPage() {
  const { data: providers, loading, error, refetch } = useProviders();

  return (
    <PageContainer
      title="Providers"
      loading={loading}
      error={error}
      action={
        <Link href="/providers/new">
          <Button>Add Provider</Button>
        </Link>
      }
    >
      {providers && providers.length > 0 ? (
        <ProviderTable providers={providers} onDelete={refetch} />
      ) : (
        <EmptyState
          message="No providers yet"
          description="Add your first hosting provider to get started."
          actionLabel="Add Provider"
          onAction={() => {
            window.location.href = '/providers/new';
          }}
        />
      )}
    </PageContainer>
  );
}
