'use client';

import { useState, useEffect, Suspense } from 'react';
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
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import TableSkeleton from '@/components/ui/TableSkeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { useUrlState } from '@/hooks/useUrlState';
import { exportToCsv } from '@/lib/export';
import type { SshKey } from '@/lib/types';

const PAGE_SIZE = 100;

const sshKeyCsvColumns = [
  { key: 'name' as const, label: 'Name' },
  { key: 'key_type' as const, label: 'Key Type' },
  { key: 'fingerprint' as const, label: 'Fingerprint' },
  { key: 'public_key' as const, label: 'Public Key' },
  { key: 'comment' as const, label: 'Comment' },
  { key: 'notes' as const, label: 'Notes' },
];

function SshKeysPageContent() {
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
  const { data: keys, total, loading, error, refetch } = useSshKeys(params);
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

  function handleExportCsv() {
    if (!keys || keys.length === 0) {
      addToast('error', 'No data to export');
      return;
    }
    setExporting(true);
    exportToCsv<SshKey>(keys, sshKeyCsvColumns, 'ssh-keys.csv');
    addToast('success', `Exported ${keys.length} item(s)`);
    setExporting(false);
  }

  async function handleExportAll() {
    setExporting(true);
    try {
      const result = await api.listSshKeys({ ...params, skip: 0, limit: 500 });
      exportToCsv<SshKey>(result.items, sshKeyCsvColumns, 'ssh-keys-all.csv');
      addToast('success', `Exported ${result.items.length} item(s)`);
      if (result.total > 500) {
        addToast('error', `Warning: Only 500 of ${result.total} items exported. Full export not available.`);
      }
    } catch {
      addToast('error', 'Failed to export all SSH keys');
    } finally {
      setExporting(false);
    }
  }

  async function handleBulkDelete() {
    try {
      await api.bulkDeleteSshKeys(Array.from(selectedIds));
      addToast('success', `Deleted ${selectedIds.size} SSH key(s)`);
      setSelectedIds(new Set());
      setShowBulkDelete(false);
      refetch();
    } catch {
      addToast('error', 'Failed to delete SSH keys');
    }
  }

  return (
    <PageContainer
      title="SSH Keys"
      error={error}
      onRetry={refetch}
      action={
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button variant="danger" onClick={() => setShowBulkDelete(true)}>Delete ({selectedIds.size})</Button>
          )}
          <Button variant="secondary" onClick={handleExportCsv} disabled={exporting}>{exporting ? 'Exporting...' : `Export Page (${keys?.length ?? 0})`}</Button>
          <Button variant="secondary" onClick={handleExportAll} disabled={exporting}>{exporting ? 'Exporting...' : `Export All (${total > 500 ? '500/' : ''}${total})`}</Button>
          <Link href="/ssh-keys/new">
            <Button>Add SSH Key</Button>
          </Link>
        </div>
      }
    >
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            placeholder="Search SSH keys..."
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
      ) : keys && keys.length > 0 ? (
        <>
          <SshKeyTable keys={keys} onDelete={handleDelete} selectable selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={(p) => setUrlState({ page: String(p) })} />
        </>
      ) : (
        <EmptyState
          message={searchTerm ? 'No SSH keys match your filters' : 'No SSH keys yet'}
          description={searchTerm ? 'Try adjusting your filters.' : 'Get started by adding your first SSH key.'}
        />
      )}

      <ConfirmDialog
        open={showBulkDelete}
        title="Delete SSH Keys"
        message={`Are you sure you want to delete ${selectedIds.size} SSH key(s)? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkDelete(false)}
      />
    </PageContainer>
  );
}

export default function SshKeysPage() {
  return (
    <Suspense>
      <SshKeysPageContent />
    </Suspense>
  );
}
