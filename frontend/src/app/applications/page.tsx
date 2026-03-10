'use client';

import { useState, useEffect } from 'react';
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
import { useDebounce } from '@/hooks/useDebounce';
import { exportToCsv } from '@/lib/export';

const PAGE_SIZE = 100;

const statusFilterOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'running', label: 'Running' },
  { value: 'stopped', label: 'Stopped' },
  { value: 'error', label: 'Error' },
  { value: 'deploying', label: 'Deploying' },
];

export default function ApplicationsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [serverFilter, setServerFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [page, setPage] = useState(0);

  useEffect(() => { setPage(0); }, [statusFilter, serverFilter, debouncedSearch]);

  const { data: servers } = useServers();
  const { data: applications, total, loading, error, refetch } = useApplications({
    status: statusFilter || undefined,
    server_id: serverFilter ? Number(serverFilter) : undefined,
    search: debouncedSearch || undefined,
    skip: page * PAGE_SIZE,
    limit: PAGE_SIZE,
  });
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
    exportToCsv<Application>(applications, [
      { key: 'name', label: 'Name' },
      { key: 'server_name', label: 'Server' },
      { key: 'app_type', label: 'Type' },
      { key: 'port', label: 'Port' },
      { key: 'status', label: 'Status' },
      { key: 'url', label: 'URL' },
    ], 'applications.csv');
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
          <Button variant="secondary" onClick={handleExportCsv}>Export CSV</Button>
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

      {applications && applications.length > 0 ? (
        <>
          <ApplicationTable applications={applications} onDelete={handleDelete} />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </>
      ) : !loading ? (
        <EmptyState
          message={searchTerm || statusFilter || serverFilter ? 'No applications match your filters' : 'No applications found'}
          description={searchTerm || statusFilter || serverFilter ? 'Try different search criteria.' : 'Get started by adding your first application.'}
        />
      ) : null}
    </PageContainer>
  );
}
