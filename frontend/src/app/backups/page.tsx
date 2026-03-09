'use client';

import { useState } from 'react';
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
import { useDebounce } from '@/hooks/useDebounce';

const statusFilterOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
  { value: 'running', label: 'Running' },
  { value: 'never_run', label: 'Never Run' },
];

export default function BackupsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [serverFilter, setServerFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const { data: servers } = useServers();
  const { data: backups, loading, error, refetch } = useBackups({
    status: statusFilter || undefined,
    source_server_id: serverFilter ? Number(serverFilter) : undefined,
    search: debouncedSearch || undefined,
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

  const serverFilterOptions = [
    { value: '', label: 'All Servers' },
    ...(servers || []).map((s) => ({ value: String(s.id), label: s.name })),
  ];

  return (
    <PageContainer
      title="Backups"
      loading={loading}
      error={error}
      onRetry={refetch}
      action={
        <Link href="/backups/new">
          <Button>Add Backup</Button>
        </Link>
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
            value={serverFilter}
            onChange={(e) => setServerFilter(e.target.value)}
            options={serverFilterOptions}
          />
        </div>
        <div className="w-48">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={statusFilterOptions}
          />
        </div>
      </div>

      {backups && backups.length > 0 ? (
        <BackupTable backups={backups} onDelete={handleDelete} />
      ) : !loading ? (
        <EmptyState
          message={searchTerm || statusFilter || serverFilter ? 'No backups match your filters' : 'No backups found'}
          description={searchTerm || statusFilter || serverFilter ? 'Try different search criteria.' : 'Get started by adding your first backup.'}
        />
      ) : null}
    </PageContainer>
  );
}
