'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useUrlState } from '@/hooks/useUrlState';
import { useDebounce } from '@/hooks/useDebounce';
import { useData } from '@/hooks/useData';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/formatters';
import { exportToCsv } from '@/lib/export';
import type { Activity } from '@/lib/types';
import PageContainer from '@/components/PageContainer';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import Table, { Column } from '@/components/ui/Table';
import ChangesSummary from '@/components/domain/ChangesSummary';

const PAGE_SIZE = 50;

const entityTypeOptions = [
  { value: '', label: 'All Entity Types' },
  { value: 'server', label: 'Server' },
  { value: 'provider', label: 'Provider' },
  { value: 'application', label: 'Application' },
  { value: 'backup', label: 'Backup' },
  { value: 'ssh_key', label: 'SSH Key' },
  { value: 'ssh_connection', label: 'SSH Connection' },
  { value: 'tag', label: 'Tag' },
];

const actionOptions = [
  { value: '', label: 'All Actions' },
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
  { value: 'deleted', label: 'Deleted' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'unassigned', label: 'Unassigned' },
];

function entityUrl(entityType: string, entityId: number): string | null {
  if (entityType === 'tag') return null;
  const pathMap: Record<string, string> = {
    ssh_key: 'ssh-keys',
    ssh_connection: 'ssh-connections',
  };
  const segment = pathMap[entityType] || `${entityType}s`;
  return `/${segment}/${entityId}`;
}

function ActionBadge({ action }: { action: string }) {
  const colorMap: Record<string, string> = {
    created: 'bg-green-100 text-green-800',
    updated: 'bg-blue-100 text-blue-800',
    deleted: 'bg-red-100 text-red-800',
    assigned: 'bg-purple-100 text-purple-800',
    unassigned: 'bg-orange-100 text-orange-800',
  };
  const color = colorMap[action] || 'bg-gray-100 text-gray-800';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {action.charAt(0).toUpperCase() + action.slice(1)}
    </span>
  );
}

function formatEntityType(entityType: string): string {
  const labelMap: Record<string, string> = {
    server: 'Server',
    provider: 'Provider',
    application: 'Application',
    backup: 'Backup',
    ssh_key: 'SSH Key',
    ssh_connection: 'SSH Connection',
    tag: 'Tag',
  };
  return labelMap[entityType] || entityType;
}

function truncateChanges(changes: string | null, maxLength = 80): string {
  if (!changes) return '\u2014';
  if (changes.length <= maxLength) return changes;
  return changes.slice(0, maxLength) + '\u2026';
}

const activityCsvColumns = [
  { key: 'created_at' as const, label: 'Date', formatter: (a: Activity) => formatDateTime(a.created_at) },
  { key: 'entity_type' as const, label: 'Entity Type', formatter: (a: Activity) => formatEntityType(a.entity_type) },
  { key: 'entity_name' as const, label: 'Entity Name' },
  { key: 'action' as const, label: 'Action' },
  { key: 'changes' as const, label: 'Changes', formatter: (a: Activity) => a.changes || '' },
];

function ActivitiesPageContent() {
  const [urlState, setUrlState] = useUrlState({
    entity_type: '',
    action: '',
    search: '',
    date_from: '',
    date_to: '',
    page: '0',
  });

  const [search, setSearch] = useState(urlState.search);
  const debouncedSearch = useDebounce(search, 300);
  const page = Number(urlState.page) || 0;

  useEffect(() => {
    setUrlState({ search: debouncedSearch, page: '0' });
  }, [debouncedSearch]);

  const params = useMemo(
    () => ({
      entity_type: urlState.entity_type || undefined,
      action: urlState.action || undefined,
      search: debouncedSearch || undefined,
      date_from: urlState.date_from || undefined,
      date_to: urlState.date_to || undefined,
      skip: page * PAGE_SIZE,
      limit: PAGE_SIZE,
    }),
    [urlState.entity_type, urlState.action, debouncedSearch, urlState.date_from, urlState.date_to, page]
  );

  const { data, loading, error, refetch } = useData(
    () => api.listActivities(params),
    [params.entity_type, params.action, params.search, params.date_from, params.date_to, params.skip, params.limit]
  );

  const activities = data?.items ?? null;
  const total = data?.total ?? 0;

  const hasActiveFilters = !!(urlState.entity_type || urlState.action || search || urlState.date_from || urlState.date_to);

  function handleClearFilters() {
    setSearch('');
    setUrlState({ entity_type: '', action: '', search: '', date_from: '', date_to: '', page: '0' });
  }

  function handleExportCsv() {
    if (!activities || activities.length === 0) return;
    exportToCsv<Activity>(activities, activityCsvColumns, 'activities.csv');
  }

  async function handleExportAll() {
    try {
      const result = await api.listActivities({ ...params, skip: 0, limit: 500 });
      exportToCsv<Activity>(result.items, activityCsvColumns, 'activities-all.csv');
    } catch {
      // silently fail
    }
  }

  const columns: Column<Activity>[] = [
    {
      key: 'created_at',
      label: 'Date',
      sortable: true,
      render: (activity) => formatDateTime(activity.created_at),
    },
    {
      key: 'action',
      label: 'Action',
      sortable: true,
      render: (activity) => <ActionBadge action={activity.action} />,
    },
    {
      key: 'entity_type',
      label: 'Entity Type',
      sortable: true,
      render: (activity) => formatEntityType(activity.entity_type),
    },
    {
      key: 'entity_name',
      label: 'Entity Name',
      sortable: true,
      render: (activity) => {
        const url = entityUrl(activity.entity_type, activity.entity_id);
        if (activity.action === 'deleted' || !url) {
          return <span className="text-gray-500">{activity.entity_name}</span>;
        }
        return (
          <Link
            href={url}
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            {activity.entity_name}
          </Link>
        );
      },
    },
    {
      key: 'changes',
      label: 'Changes',
      render: (activity) => <ChangesSummary changes={activity.changes} />,
    },
  ];

  return (
    <PageContainer
      title="Activities"
      loading={loading}
      error={error}
      onRetry={refetch}
      action={
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleExportCsv}>Export CSV</Button>
          <Button variant="secondary" onClick={handleExportAll}>Export All</Button>
        </div>
      }
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:flex-wrap">
        <div className="w-full sm:w-48">
          <Select
            label="Entity Type"
            options={entityTypeOptions}
            value={urlState.entity_type}
            onChange={(e) => setUrlState({ entity_type: e.target.value, page: '0' })}
          />
        </div>
        <div className="w-full sm:w-40">
          <Select
            label="Action"
            options={actionOptions}
            value={urlState.action}
            onChange={(e) => setUrlState({ action: e.target.value, page: '0' })}
          />
        </div>
        <div className="w-full sm:w-48">
          <Input
            label="From"
            type="date"
            value={urlState.date_from}
            onChange={(e) => setUrlState({ date_from: e.target.value, page: '0' })}
          />
        </div>
        <div className="w-full sm:w-48">
          <Input
            label="To"
            type="date"
            value={urlState.date_to}
            onChange={(e) => setUrlState({ date_to: e.target.value, page: '0' })}
          />
        </div>
        <div className="w-full sm:w-64">
          <Input
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activities..."
          />
        </div>
        {hasActiveFilters && (
          <div className="flex items-end">
            <Button variant="secondary" onClick={handleClearFilters}>
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {activities && activities.length === 0 ? (
        <EmptyState
          message="No activities found"
          description={
            hasActiveFilters
              ? 'Try adjusting your filters.'
              : 'Get started by adding your first server.'
          }
        />
      ) : (
        <>
          <Table<Activity> columns={columns} data={activities ?? []} />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={(p) => setUrlState({ page: String(p) })}
          />
        </>
      )}
    </PageContainer>
  );
}

export default function ActivitiesPage() {
  return (
    <Suspense>
      <ActivitiesPageContent />
    </Suspense>
  );
}
