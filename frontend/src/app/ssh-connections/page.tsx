'use client';

import { useState, useEffect, Suspense } from 'react';
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
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useDebounce } from '@/hooks/useDebounce';
import { useUrlState } from '@/hooks/useUrlState';
import { exportToCsv } from '@/lib/export';
import type { SshConnection } from '@/lib/types';

const PAGE_SIZE = 100;

const sshConnCsvColumns = [
  { key: 'source_server_name' as const, label: 'Source Server' },
  { key: 'target_server_name' as const, label: 'Target Server' },
  { key: 'ssh_user' as const, label: 'SSH User' },
  { key: 'ssh_port' as const, label: 'Port' },
  { key: 'ssh_key_name' as const, label: 'SSH Key' },
  { key: 'purpose' as const, label: 'Purpose' },
];

function SshConnectionsPageContent() {
  const [urlState, setUrlState] = useUrlState({
    search: '',
    page: '0',
  });
  const [searchTerm, setSearchTerm] = useState(urlState.search);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 300);
  const page = Number(urlState.page) || 0;

  useEffect(() => {
    setUrlState({ search: debouncedSearch, page: '0' });
  }, [debouncedSearch]);

  const params = {
    search: debouncedSearch || undefined,
    skip: page * PAGE_SIZE,
    limit: PAGE_SIZE,
  };
  const { data: connections, total, loading, error, refetch } = useSshConnections(params);
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

  function handleExportCsv() {
    if (!connections || connections.length === 0) return;
    exportToCsv<SshConnection>(connections, sshConnCsvColumns, 'ssh-connections.csv');
  }

  async function handleExportAll() {
    try {
      const result = await api.listSshConnections({ ...params, skip: 0, limit: 500 });
      exportToCsv<SshConnection>(result.items, sshConnCsvColumns, 'ssh-connections-all.csv');
    } catch {
      addToast('error', 'Failed to export all SSH connections');
    }
  }

  async function handleBulkDelete() {
    try {
      await api.bulkDeleteSshConnections(Array.from(selectedIds));
      addToast('success', `Deleted ${selectedIds.size} connection(s)`);
      setSelectedIds(new Set());
      setShowBulkDelete(false);
      refetch();
    } catch {
      addToast('error', 'Failed to delete SSH connections');
    }
  }

  return (
    <PageContainer
      title="SSH Connections"
      loading={loading}
      error={error}
      onRetry={refetch}
      action={
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button variant="danger" onClick={() => setShowBulkDelete(true)}>Delete ({selectedIds.size})</Button>
          )}
          <Button variant="secondary" onClick={handleExportCsv}>Export CSV</Button>
          <Button variant="secondary" onClick={handleExportAll}>Export All</Button>
          <Link href="/ssh-connections/new">
            <Button>Add Connection</Button>
          </Link>
        </div>
      }
    >
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            placeholder="Search connections..."
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
      {connections && connections.length > 0 ? (
        <>
          <SshConnectionTable connections={connections} onDelete={handleDelete} selectable selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={(p) => setUrlState({ page: String(p) })} />
        </>
      ) : !loading ? (
        <EmptyState
          message={searchTerm ? 'No connections match your search' : 'No SSH connections found'}
          description={searchTerm ? 'Try a different search term.' : 'Get started by adding your first SSH connection.'}
        />
      ) : null}

      <ConfirmDialog
        open={showBulkDelete}
        title="Delete SSH Connections"
        message={`Are you sure you want to delete ${selectedIds.size} connection(s)? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkDelete(false)}
      />
    </PageContainer>
  );
}

export default function SshConnectionsPage() {
  return (
    <Suspense>
      <SshConnectionsPageContent />
    </Suspense>
  );
}
