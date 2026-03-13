'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useApplications } from '@/hooks/useApplications';
import { useServers } from '@/hooks/useServers';
import { api } from '@/lib/api';
import type { Application } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';
import PageContainer from '@/components/PageContainer';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import EmptyState from '@/components/ui/EmptyState';
import ApplicationTable from '@/components/domain/ApplicationTable';
import Pagination from '@/components/ui/Pagination';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useDebounce } from '@/hooks/useDebounce';
import { useUrlState } from '@/hooks/useUrlState';
import { exportToCsv } from '@/lib/export';

const PAGE_SIZE = 100;

const statusFilterOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'running', label: 'Running' },
  { value: 'stopped', label: 'Stopped' },
  { value: 'error', label: 'Error' },
  { value: 'deploying', label: 'Deploying' },
];

const appCsvColumns = [
  { key: 'name' as const, label: 'Name' },
  { key: 'server_name' as const, label: 'Server' },
  { key: 'app_type' as const, label: 'Type' },
  { key: 'port' as const, label: 'Port' },
  { key: 'status' as const, label: 'Status' },
  { key: 'url' as const, label: 'URL' },
];

function ApplicationsPageContent() {
  const [urlState, setUrlState] = useUrlState({
    status: '',
    server: '',
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

  const { data: servers } = useServers();
  const params = {
    status: urlState.status || undefined,
    server_id: urlState.server ? Number(urlState.server) : undefined,
    search: debouncedSearch || undefined,
    skip: page * PAGE_SIZE,
    limit: PAGE_SIZE,
  };
  const { data: applications, total, loading, error, refetch } = useApplications(params);
  const { addToast } = useToast();

  const handleDelete = async (id: number) => {
    try {
      await api.deleteApplication(id);
      addToast('success', 'Application deleted successfully');
      refetch();
    } catch {
      addToast('error', 'Failed to delete application');
    }
  };

  function handleExportCsv() {
    if (!applications || applications.length === 0) return;
    exportToCsv<Application>(applications, appCsvColumns, 'applications.csv');
  }

  async function handleExportAll() {
    try {
      const result = await api.listApplications({ ...params, skip: 0, limit: 500 });
      exportToCsv<Application>(result.items, appCsvColumns, 'applications-all.csv');
    } catch {
      addToast('error', 'Failed to export all applications');
    }
  }

  async function handleBulkDelete() {
    try {
      await api.bulkDeleteApplications(Array.from(selectedIds));
      addToast('success', `Deleted ${selectedIds.size} application(s)`);
      setSelectedIds(new Set());
      setShowBulkDelete(false);
      refetch();
    } catch {
      addToast('error', 'Failed to delete applications');
    }
  }

  const serverFilterOptions = [
    { value: '', label: 'All Servers' },
    ...(servers || []).map((s) => ({ value: String(s.id), label: s.name })),
  ];

  return (
    <PageContainer
      title="Applications"
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
          <Link href="/applications/new">
            <Button>Add Application</Button>
          </Link>
        </div>
      }
    >
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            placeholder="Search applications..."
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

      {applications && applications.length > 0 ? (
        <>
          <ApplicationTable applications={applications} onDelete={handleDelete} selectable selectedIds={selectedIds} onSelectionChange={setSelectedIds} />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={(p) => setUrlState({ page: String(p) })} />
        </>
      ) : !loading ? (
        <EmptyState
          message={searchTerm || urlState.status || urlState.server ? 'No applications match your filters' : 'No applications found'}
          description={searchTerm || urlState.status || urlState.server ? 'Try different search criteria.' : 'Get started by adding your first application.'}
        />
      ) : null}

      <ConfirmDialog
        open={showBulkDelete}
        title="Delete Applications"
        message={`Are you sure you want to delete ${selectedIds.size} application(s)? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkDelete(false)}
      />
    </PageContainer>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense>
      <ApplicationsPageContent />
    </Suspense>
  );
}
