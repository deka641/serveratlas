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
import TableSkeleton from '@/components/ui/TableSkeleton';
import ChangesSummary from '@/components/domain/ChangesSummary';
import { useToast } from '@/components/ui/Toast';

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

function ExpandableChanges({ changes }: { changes: string | null }) {
  const [expanded, setExpanded] = useState(false);
  if (!changes) return <span className="text-gray-400">&mdash;</span>;

  const isLong = changes.length > 60;

  if (!isLong) return <ChangesSummary changes={changes} />;

  return (
    <div>
      {expanded ? (
        <div>
          <ChangesSummary changes={changes} />
          <button onClick={() => setExpanded(false)} className="mt-1 text-xs text-blue-600 hover:underline">
            Collapse
          </button>
        </div>
      ) : (
        <button onClick={() => setExpanded(true)} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          Show changes
        </button>
      )}
    </div>
  );
}

function ActivitiesPageContent() {
  const { addToast } = useToast();
  const [activityStats, setActivityStats] = useState<{ total_count: number; oldest_entry: string | null } | null>(null);
  const [showCleanup, setShowCleanup] = useState(false);
  const [cleanupDays, setCleanupDays] = useState('90');
  const [cleaning, setCleaning] = useState(false);
  const [exporting, setExporting] = useState(false);

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

  useEffect(() => {
    api.getActivityStats().then(setActivityStats).catch(() => {});
  }, []);

  async function handleCleanup() {
    setCleaning(true);
    try {
      const result = await api.cleanupActivities(Number(cleanupDays));
      addToast('success', `Cleaned up ${result.deleted_count} old activities`);
      setShowCleanup(false);
      refetch();
      api.getActivityStats().then(setActivityStats).catch(() => {});
    } catch {
      addToast('error', 'Failed to cleanup activities');
    } finally {
      setCleaning(false);
    }
  }

  const hasActiveFilters = !!(urlState.entity_type || urlState.action || search || urlState.date_from || urlState.date_to);

  function handleClearFilters() {
    setSearch('');
    setUrlState({ entity_type: '', action: '', search: '', date_from: '', date_to: '', page: '0' });
  }

  function handleExportCsv() {
    if (!activities || activities.length === 0) {
      addToast('error', 'No data to export');
      return;
    }
    setExporting(true);
    exportToCsv<Activity>(activities, activityCsvColumns, 'activities.csv');
    addToast('success', `Exported ${activities.length} item(s)`);
    setExporting(false);
  }

  async function handleExportAll() {
    setExporting(true);
    try {
      const result = await api.listActivities({ ...params, skip: 0, limit: 500 });
      exportToCsv<Activity>(result.items, activityCsvColumns, 'activities-all.csv');
      addToast('success', `Exported ${result.items.length} item(s)`);
      if (result.total > 500) {
        addToast('error', `Warning: Only 500 of ${result.total} items exported. Full export not available.`);
      }
    } catch {
      addToast('error', 'Failed to export activities');
    } finally {
      setExporting(false);
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
      render: (activity) => <ExpandableChanges changes={activity.changes} />,
    },
  ];

  return (
    <PageContainer
      title="Activities"
      error={error}
      onRetry={refetch}
      action={
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setShowCleanup(!showCleanup)}>Manage</Button>
          <Button variant="secondary" onClick={handleExportCsv} disabled={exporting}>{exporting ? 'Exporting...' : `Export Page (${activities?.length ?? 0})`}</Button>
          <Button variant="secondary" onClick={handleExportAll} disabled={exporting}>{exporting ? 'Exporting...' : `Export All (${total > 500 ? '500/' : ''}${total})`}</Button>
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
        <div className="flex items-end gap-1">
          {[
            { label: 'Today', days: 0 },
            { label: '7d', days: 7 },
            { label: '30d', days: 30 },
            { label: '90d', days: 90 },
          ].map(({ label, days }) => {
            const from = new Date();
            from.setDate(from.getDate() - days);
            const fromStr = from.toISOString().slice(0, 10);
            const todayStr = new Date().toISOString().slice(0, 10);
            const isActive = urlState.date_from === fromStr && urlState.date_to === todayStr;
            return (
              <button
                key={label}
                onClick={() => setUrlState({ date_from: fromStr, date_to: todayStr, page: '0' })}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            );
          })}
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

      {showCleanup && activityStats && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Activity Log Management</h3>
          <div className="mb-3 flex gap-6 text-sm">
            <div>
              <span className="text-gray-500">Total Activities:</span>{' '}
              <span className="font-medium">{activityStats.total_count.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-500">Oldest Entry:</span>{' '}
              <span className="font-medium">{activityStats.oldest_entry ? formatDateTime(activityStats.oldest_entry) : 'N/A'}</span>
            </div>
          </div>
          <div className="flex items-end gap-3">
            <div className="w-40">
              <Select
                label="Delete older than"
                value={cleanupDays}
                onChange={(e) => setCleanupDays(e.target.value)}
                options={[
                  { value: '90', label: '90 days' },
                  { value: '180', label: '180 days' },
                  { value: '365', label: '365 days' },
                ]}
              />
            </div>
            <Button variant="danger" onClick={handleCleanup} disabled={cleaning}>
              {cleaning ? 'Cleaning...' : 'Cleanup'}
            </Button>
            <Button variant="ghost" onClick={() => setShowCleanup(false)}>
              Close
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <TableSkeleton columns={5} rows={8} />
      ) : activities && activities.length === 0 ? (
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
