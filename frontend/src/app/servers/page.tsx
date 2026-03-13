'use client';

import { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useServers } from '@/hooks/useServers';
import { useProviders } from '@/hooks/useProviders';
import { useDebounce } from '@/hooks/useDebounce';
import { useUrlState } from '@/hooks/useUrlState';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import PageContainer from '@/components/PageContainer';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import ServerTable from '@/components/domain/ServerTable';
import Pagination from '@/components/ui/Pagination';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { exportToCsv } from '@/lib/export';
import type { Server, Tag } from '@/lib/types';
import { formatCost } from '@/lib/formatters';
import { formatRAM, formatDisk } from '@/lib/formatters';

function useTagOptions() {
  const [tags, setTags] = useState<Tag[]>([]);
  useEffect(() => {
    api.listTags().then(setTags).catch((e) => console.error('Failed to load tags:', e));
  }, []);
  return useMemo(
    () => [
      { value: '', label: 'All Tags' },
      ...tags.map((t) => ({ value: String(t.id), label: t.name })),
    ],
    [tags]
  );
}

const PAGE_SIZE = 100;

const statusFilterOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'decommissioned', label: 'Decommissioned' },
];

function ServersPageContent() {
  const router = useRouter();
  const { addToast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [urlState, setUrlState] = useUrlState({
    status: '',
    provider: '',
    tag: '',
    search: '',
    page: '0',
  });
  const [search, setSearch] = useState(urlState.search);
  const debouncedSearch = useDebounce(search, 300);
  const searchRef = useRef<HTMLInputElement>(null);
  const page = Number(urlState.page) || 0;

  useEffect(() => {
    setUrlState({ search: debouncedSearch, page: '0' });
  }, [debouncedSearch]);

  // Ctrl+K is now handled by the global CommandPalette

  const tagFilterOptions = useTagOptions();

  const params = useMemo(
    () => ({
      status: urlState.status || undefined,
      provider_id: urlState.provider ? Number(urlState.provider) : undefined,
      tag_id: urlState.tag ? Number(urlState.tag) : undefined,
      search: debouncedSearch || undefined,
      skip: page * PAGE_SIZE,
      limit: PAGE_SIZE,
    }),
    [urlState.status, urlState.provider, urlState.tag, debouncedSearch, page]
  );

  const { data: servers, total, loading, error, refetch } = useServers(params);
  const { data: providers } = useProviders();

  const providerFilterOptions = useMemo(
    () => [
      { value: '', label: 'All Providers' },
      ...(providers ?? []).map((p) => ({
        value: String(p.id),
        label: p.name,
      })),
    ],
    [providers]
  );

  async function handleDelete(id: number) {
    try {
      await api.deleteServer(id);
      addToast('success', 'Server deleted successfully');
      refetch();
    } catch {
      addToast('error', 'Failed to delete server');
    }
  }

  const serverCsvColumns = [
    { key: 'name' as const, label: 'Name' },
    { key: 'hostname' as const, label: 'Hostname' },
    { key: 'ip_v4' as const, label: 'IP' },
    { key: 'provider_name' as const, label: 'Provider' },
    { key: 'status' as const, label: 'Status' },
    { key: 'os' as const, label: 'OS' },
    { key: 'cpu_cores' as const, label: 'CPU Cores' },
    { key: 'ram_mb' as const, label: 'RAM', formatter: (s: Server) => formatRAM(s.ram_mb) },
    { key: 'disk_gb' as const, label: 'Disk', formatter: (s: Server) => formatDisk(s.disk_gb) },
    { key: 'location' as const, label: 'Location' },
    { key: 'monthly_cost' as const, label: 'Monthly Cost', formatter: (s: Server) => formatCost(s.monthly_cost, s.cost_currency) },
  ];

  function handleExportCsv() {
    if (!servers || servers.length === 0) return;
    exportToCsv<Server>(servers, serverCsvColumns, 'servers.csv');
  }

  async function handleExportAll() {
    try {
      const result = await api.listServers({ ...params, skip: 0, limit: 500 });
      exportToCsv<Server>(result.items, serverCsvColumns, 'servers-all.csv');
    } catch {
      addToast('error', 'Failed to export all servers');
    }
  }

  async function handleBulkDelete() {
    try {
      await api.bulkDeleteServers(Array.from(selectedIds));
      addToast('success', `Deleted ${selectedIds.size} server(s)`);
      setSelectedIds(new Set());
      setShowBulkDelete(false);
      refetch();
    } catch {
      addToast('error', 'Failed to delete servers');
    }
  }

  function handleCompare() {
    const ids = Array.from(selectedIds).slice(0, 5);
    router.push(`/servers/compare?ids=${ids.join(',')}`);
  }

  return (
    <PageContainer
      title="Servers"
      loading={loading}
      error={error}
      onRetry={refetch}
      action={
        <div className="flex items-center gap-2">
          {selectedIds.size >= 2 && selectedIds.size <= 5 && (
            <Button variant="secondary" onClick={handleCompare}>Compare ({selectedIds.size})</Button>
          )}
          {selectedIds.size > 0 && (
            <Button variant="danger" onClick={() => setShowBulkDelete(true)}>Delete ({selectedIds.size})</Button>
          )}
          <Button variant="secondary" onClick={handleExportCsv}>Export CSV</Button>
          <Button variant="secondary" onClick={handleExportAll}>Export All</Button>
          <Link href="/servers/new">
            <Button>Add Server</Button>
          </Link>
        </div>
      }
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="w-full sm:w-48">
          <Select
            label="Status"
            options={statusFilterOptions}
            value={urlState.status}
            onChange={(e) => setUrlState({ status: e.target.value, page: '0' })}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            label="Provider"
            options={providerFilterOptions}
            value={urlState.provider}
            onChange={(e) => setUrlState({ provider: e.target.value, page: '0' })}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            label="Tag"
            options={tagFilterOptions}
            value={urlState.tag}
            onChange={(e) => setUrlState({ tag: e.target.value, page: '0' })}
          />
        </div>
        <div className="w-full sm:w-64">
          <Input
            ref={searchRef}
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search servers..."
          />
        </div>
        {(urlState.status || urlState.provider || urlState.tag || search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setUrlState({ status: '', provider: '', tag: '', search: '', page: '0' });
              setSearch('');
            }}
          >
            Clear filters
            <span className="ml-1 rounded-full bg-gray-200 px-1.5 py-0.5 text-xs">
              {[urlState.status, urlState.provider, urlState.tag, search].filter(Boolean).length}
            </span>
          </Button>
        )}
      </div>

      {servers && servers.length === 0 ? (
        <EmptyState
          message="No servers found"
          description={
            urlState.status || urlState.provider || urlState.tag || search
              ? 'Try adjusting your filters.'
              : 'Get started by adding your first server.'
          }
        />
      ) : (
        <>
          <ServerTable
            servers={servers ?? []}
            onDelete={handleDelete}
            selectable
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={(p) => setUrlState({ page: String(p) })} />
        </>
      )}

      <ConfirmDialog
        open={showBulkDelete}
        title="Delete Servers"
        message={`Are you sure you want to delete ${selectedIds.size} server(s)? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkDelete(false)}
      />
    </PageContainer>
  );
}

export default function ServersPage() {
  return (
    <Suspense>
      <ServersPageContent />
    </Suspense>
  );
}
