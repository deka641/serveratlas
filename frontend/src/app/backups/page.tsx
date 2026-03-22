'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useBackups } from '@/hooks/useBackups';
import { useServers } from '@/hooks/useServers';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import PageContainer from '@/components/PageContainer';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import EmptyState from '@/components/ui/EmptyState';
import BackupTable from '@/components/domain/BackupTable';
import Pagination from '@/components/ui/Pagination';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import TableSkeleton from '@/components/ui/TableSkeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { useUrlState } from '@/hooks/useUrlState';
import { exportToCsv } from '@/lib/export';
import { formatDateTime } from '@/lib/formatters';
import type { Backup } from '@/lib/types';

const PAGE_SIZE = 100;

const statusFilterOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
  { value: 'running', label: 'Running' },
  { value: 'never_run', label: 'Never Run' },
];

function BackupsPageContent() {
  const [urlState, setUrlState] = useUrlState({
    status: '',
    server: '',
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
  }, [urlState.status, urlState.server, debouncedSearch, page]);

  const { data: servers } = useServers();
  const { data: backups, total, loading, error, refetch } = useBackups({
    status: urlState.status || undefined,
    source_server_id: urlState.server ? Number(urlState.server) : undefined,
    search: debouncedSearch || undefined,
    skip: page * PAGE_SIZE,
    limit: PAGE_SIZE,
  });
  const { addToast } = useToast();

  const handleDelete = async (id: number) => {
    try {
      await api.deleteBackup(id);
      addToast('success', 'Backup deleted successfully');
      refetch();
    } catch {
      addToast('error', 'Failed to delete backup');
    }
  };

  const backupCsvColumns = [
    { key: 'name' as const, label: 'Name' },
    { key: 'source_server_name' as const, label: 'Source Server' },
    { key: 'target_server_name' as const, label: 'Target Server' },
    { key: 'application_name' as const, label: 'Application' },
    { key: 'frequency' as const, label: 'Frequency' },
    { key: 'retention_days' as const, label: 'Retention (days)' },
    { key: 'last_run_status' as const, label: 'Status' },
    { key: 'last_run_at' as const, label: 'Last Run', formatter: (b: Backup) => formatDateTime(b.last_run_at) },
    { key: 'storage_path' as const, label: 'Storage Path' },
  ];

  function handleExportCsv() {
    if (!backups || backups.length === 0) {
      addToast('error', 'No data to export');
      return;
    }
    setExporting(true);
    exportToCsv<Backup>(backups, backupCsvColumns, 'backups.csv');
    addToast('success', `Exported ${backups.length} item(s)`);
    setExporting(false);
  }

  async function handleExportAll() {
    setExporting(true);
    try {
      const result = await api.listBackups({
        status: urlState.status || undefined,
        source_server_id: urlState.server ? Number(urlState.server) : undefined,
        search: debouncedSearch || undefined,
        skip: 0,
        limit: 500,
      });
      exportToCsv<Backup>(result.items, backupCsvColumns, 'backups-all.csv');
      addToast('success', `Exported ${result.items.length} item(s)`);
      if (result.total > 500) {
        addToast('error', `Warning: Only 500 of ${result.total} items exported. Full export not available.`);
      }
    } catch {
      addToast('error', 'Failed to export all backups');
    } finally {
      setExporting(false);
    }
  }

  async function handleBulkDelete() {
    try {
      await api.bulkDeleteBackups(Array.from(selectedIds));
      addToast('success', `Deleted ${selectedIds.size} backup(s)`);
      setSelectedIds(new Set());
      setShowBulkDelete(false);
      refetch();
    } catch {
      addToast('error', 'Failed to delete backups');
    }
  }

  const serverFilterOptions = [
    { value: '', label: 'All Servers' },
    ...(servers || []).map((s) => ({ value: String(s.id), label: s.name })),
  ];

  return (
    <PageContainer
      title="Backups"
      error={error}
      onRetry={refetch}
      action={
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button variant="danger" onClick={() => setShowBulkDelete(true)}>Delete ({selectedIds.size})</Button>
          )}
          <Button variant="secondary" onClick={handleExportCsv} disabled={exporting}>{exporting ? 'Exporting...' : 'Export CSV'}</Button>
          <Button variant="secondary" onClick={handleExportAll} disabled={exporting}>{exporting ? 'Exporting...' : 'Export All'}</Button>
          <Link href="/backups/new">
            <Button>Add Backup</Button>
          </Link>
        </div>
      }
    >
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            placeholder="Search backups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Select
            value={urlState.server}
            onChange={(e) => setUrlState({ server: e.target.value, page: '0' })}
            options={serverFilterOptions}
          />
        </div>
        <div className="w-48">
          <Select
            value={urlState.status}
            onChange={(e) => setUrlState({ status: e.target.value, page: '0' })}
            options={statusFilterOptions}
          />
        </div>
        {(urlState.status || urlState.server || searchTerm) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setUrlState({ status: '', server: '', search: '', page: '0' });
              setSearchTerm('');
            }}
          >
            Clear filters
            <span className="ml-1 rounded-full bg-gray-200 px-1.5 py-0.5 text-xs">
              {[urlState.status, urlState.server, searchTerm].filter(Boolean).length}
            </span>
          </Button>
        )}
      </div>

      {loading ? (
        <TableSkeleton columns={8} rows={8} />
      ) : backups && backups.length > 0 ? (
        <>
          <BackupTable backups={backups} onDelete={handleDelete} selectable selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={(p) => setUrlState({ page: String(p) })} />
        </>
      ) : (
        <EmptyState
          message={searchTerm || urlState.status || urlState.server ? 'No backups match your filters' : 'No backups found'}
          description={searchTerm || urlState.status || urlState.server ? 'Try different search criteria.' : 'Get started by adding your first backup.'}
        />
      )}

      <ConfirmDialog
        open={showBulkDelete}
        title="Delete Backups"
        message={`Are you sure you want to delete ${selectedIds.size} backup(s)? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkDelete(false)}
      />
    </PageContainer>
  );
}

export default function BackupsPage() {
  return (
    <Suspense>
      <BackupsPageContent />
    </Suspense>
  );
}
