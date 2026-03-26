'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import PageContainer from '@/components/PageContainer';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import ProviderTable from '@/components/domain/ProviderTable';
import Pagination from '@/components/ui/Pagination';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import TableSkeleton from '@/components/ui/TableSkeleton';
import { useProviders } from '@/hooks/useProviders';
import { useDebounce } from '@/hooks/useDebounce';
import { useUrlState } from '@/hooks/useUrlState';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { exportToCsv } from '@/lib/export';
import type { Provider } from '@/lib/types';

const PAGE_SIZE = 100;

const providerCsvColumns = [
  { key: 'name' as const, label: 'Name' },
  { key: 'website' as const, label: 'Website' },
  { key: 'support_contact' as const, label: 'Support Contact' },
  { key: 'server_count' as const, label: 'Server Count' },
];

function ProvidersPageContent() {
  const [urlState, setUrlState] = useUrlState({
    search: '',
    page: '0',
  });
  const [searchTerm, setSearchTerm] = useState(urlState.search);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [exporting, setExporting] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 300);
  const page = Number(urlState.page) || 0;
  const { addToast } = useToast();

  useEffect(() => {
    setUrlState({ search: debouncedSearch, page: '0' });
  }, [debouncedSearch]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [debouncedSearch, page]);

  const params = {
    search: debouncedSearch || undefined,
    skip: page * PAGE_SIZE,
    limit: PAGE_SIZE,
  };
  const { data: providers, total, loading, error, refetch } = useProviders(params);

  function handleExportCsv() {
    if (!providers || providers.length === 0) {
      addToast('error', 'No data to export');
      return;
    }
    setExporting(true);
    exportToCsv<Provider>(providers, providerCsvColumns, 'providers.csv');
    addToast('success', `Exported ${providers.length} item(s)`);
    setExporting(false);
  }

  async function handleExportAll() {
    setExporting(true);
    try {
      const result = await api.listProviders({ ...params, skip: 0, limit: 500 });
      exportToCsv<Provider>(result.items, providerCsvColumns, 'providers-all.csv');
      addToast('success', `Exported ${result.items.length} item(s)`);
      if (result.total > 500) {
        addToast('error', `Warning: Only 500 of ${result.total} items exported. Full export not available.`);
      }
    } catch {
      addToast('error', 'Failed to export all providers');
    } finally {
      setExporting(false);
    }
  }

  async function handleBulkDelete() {
    try {
      await api.bulkDeleteProviders(Array.from(selectedIds));
      addToast('success', `Deleted ${selectedIds.size} provider(s)`);
      setSelectedIds(new Set());
      setShowBulkDelete(false);
      refetch();
    } catch {
      addToast('error', 'Failed to delete providers');
    }
  }

  return (
    <PageContainer
      title="Providers"
      error={error}
      onRetry={refetch}
      action={
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button variant="danger" onClick={() => setShowBulkDelete(true)}>Delete ({selectedIds.size})</Button>
          )}
          <Button variant="secondary" onClick={handleExportCsv} disabled={exporting}>{exporting ? 'Exporting...' : `Export Page (${providers?.length ?? 0})`}</Button>
          <Button variant="secondary" onClick={handleExportAll} disabled={exporting}>{exporting ? 'Exporting...' : `Export All (${total > 500 ? '500/' : ''}${total})`}</Button>
          <Link href="/providers/new">
            <Button>Add Provider</Button>
          </Link>
        </div>
      }
    >
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            placeholder="Search providers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setUrlState({ search: '', page: '0' });
              setSearchTerm('');
            }}
          >
            Clear filters
            <span className="ml-1 rounded-full bg-gray-200 px-1.5 py-0.5 text-xs">
              {[searchTerm].filter(Boolean).length}
            </span>
          </Button>
        )}
      </div>
      {loading ? (
        <TableSkeleton columns={4} rows={8} />
      ) : providers && providers.length > 0 ? (
        <>
          <ProviderTable providers={providers} onDelete={refetch} selectable selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={(p) => setUrlState({ page: String(p) })} />
        </>
      ) : (
        <EmptyState
          message={searchTerm ? 'No providers match your filters' : 'No providers yet'}
          description={searchTerm ? 'Try adjusting your filters.' : 'Get started by adding your first provider.'}
          actionLabel={searchTerm ? undefined : 'Add Provider'}
          onAction={searchTerm ? undefined : () => {
            window.location.href = '/providers/new';
          }}
        />
      )}

      <ConfirmDialog
        open={showBulkDelete}
        title="Delete Providers"
        message={`Are you sure you want to delete ${selectedIds.size} provider(s)? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkDelete(false)}
      />
    </PageContainer>
  );
}

export default function ProvidersPage() {
  return (
    <Suspense>
      <ProvidersPageContent />
    </Suspense>
  );
}
