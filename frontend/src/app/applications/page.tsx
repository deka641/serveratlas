'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApplications } from '@/hooks/useApplications';
import { useServers } from '@/hooks/useServers';
import { api } from '@/lib/api';
import type { AppStatus } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';
import PageContainer from '@/components/PageContainer';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import EmptyState from '@/components/ui/EmptyState';
import ApplicationTable from '@/components/domain/ApplicationTable';

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
  const { data: servers } = useServers();
  const { data: applications, loading, error, refetch } = useApplications({
    status: statusFilter || undefined,
    server_id: serverFilter ? Number(serverFilter) : undefined,
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

  const serverFilterOptions = [
    { value: '', label: 'All Servers' },
    ...(servers || []).map((s) => ({ value: String(s.id), label: s.name })),
  ];

  return (
    <PageContainer
      title="Applications"
      loading={loading}
      error={error}
      action={
        <Link href="/applications/new">
          <Button>Add Application</Button>
        </Link>
      }
    >
      <div className="mb-4 flex items-center gap-4">
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
        <ApplicationTable applications={applications} onDelete={handleDelete} />
      ) : (
        <EmptyState
          message="No applications found"
          description="Get started by adding your first application."
        />
      )}
    </PageContainer>
  );
}
