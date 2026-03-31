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
import DropdownMenu from '@/components/ui/DropdownMenu';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import ServerTable from '@/components/domain/ServerTable';
import Pagination from '@/components/ui/Pagination';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import TableSkeleton from '@/components/ui/TableSkeleton';
import TagPickerModal from '@/components/domain/TagPickerModal';
import BulkEditModal from '@/components/domain/BulkEditModal';
import ServerImportModal from '@/components/domain/ServerImportModal';
import SlidePanel from '@/components/ui/SlidePanel';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';
import StatusBadge from '@/components/ui/StatusBadge';
import { exportToCsv } from '@/lib/export';
import type { Server, ServerDetail, Tag } from '@/lib/types';
import { formatCost, formatDateTime, formatRAM, formatDisk } from '@/lib/formatters';

function useTagOptions() {
  const [tags, setTags] = useState<Tag[]>([]);
  useEffect(() => {
    api.listTags().then((res) => setTags(res.items)).catch((e) => console.error('Failed to load tags:', e));
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
  { value: 'stale', label: 'Stale (>90d)' },
];

function ServersPageContent() {
  const router = useRouter();
  const { addToast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [batchChecking, setBatchChecking] = useState(false);
  const [previewServerId, setPreviewServerId] = useState<number | null>(null);
  const [previewServer, setPreviewServer] = useState<ServerDetail | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [urlState, setUrlState] = useUrlState({
    status: '',
    provider: '',
    tag: '',
    search: '',
    page: '0',
    ram_min: '',
    ram_max: '',
    cpu_min: '',
    cpu_max: '',
    disk_min: '',
    disk_max: '',
    cost_min: '',
    cost_max: '',
  });
  const [search, setSearch] = useState(urlState.search);
  const debouncedSearch = useDebounce(search, 300);
  const searchRef = useRef<HTMLInputElement>(null);
  const page = Number(urlState.page) || 0;

  useEffect(() => {
    setUrlState({ search: debouncedSearch, page: '0' });
  }, [debouncedSearch]);

  // Clear stale selections when filters/search/page change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [urlState.status, urlState.provider, urlState.tag, debouncedSearch, page]);

  // Ctrl+K is now handled by the global CommandPalette

  const tagFilterOptions = useTagOptions();

  const hasAdvancedFilters = !!(urlState.ram_min || urlState.ram_max || urlState.cpu_min || urlState.cpu_max || urlState.disk_min || urlState.disk_max || urlState.cost_min || urlState.cost_max);

  const params = useMemo(
    () => ({
      status: urlState.status && urlState.status !== 'stale' ? urlState.status : undefined,
      stale: urlState.status === 'stale' ? true : undefined,
      provider_id: urlState.provider ? Number(urlState.provider) : undefined,
      tag_id: urlState.tag ? Number(urlState.tag) : undefined,
      search: debouncedSearch || undefined,
      skip: page * PAGE_SIZE,
      limit: PAGE_SIZE,
      ram_min: urlState.ram_min ? Number(urlState.ram_min) : undefined,
      ram_max: urlState.ram_max ? Number(urlState.ram_max) : undefined,
      cpu_min: urlState.cpu_min ? Number(urlState.cpu_min) : undefined,
      cpu_max: urlState.cpu_max ? Number(urlState.cpu_max) : undefined,
      disk_min: urlState.disk_min ? Number(urlState.disk_min) : undefined,
      disk_max: urlState.disk_max ? Number(urlState.disk_max) : undefined,
      cost_min: urlState.cost_min ? Number(urlState.cost_min) : undefined,
      cost_max: urlState.cost_max ? Number(urlState.cost_max) : undefined,
    }),
    [urlState.status, urlState.provider, urlState.tag, debouncedSearch, page,
     urlState.ram_min, urlState.ram_max, urlState.cpu_min, urlState.cpu_max,
     urlState.disk_min, urlState.disk_max, urlState.cost_min, urlState.cost_max]
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
    { key: 'ip_v4' as const, label: 'IPv4' },
    { key: 'ip_v6' as const, label: 'IPv6' },
    { key: 'provider_name' as const, label: 'Provider' },
    { key: 'status' as const, label: 'Status' },
    { key: 'os' as const, label: 'OS' },
    { key: 'cpu_cores' as const, label: 'CPU Cores' },
    { key: 'ram_mb' as const, label: 'RAM', formatter: (s: Server) => formatRAM(s.ram_mb) },
    { key: 'disk_gb' as const, label: 'Disk', formatter: (s: Server) => formatDisk(s.disk_gb) },
    { key: 'location' as const, label: 'Location' },
    { key: 'datacenter' as const, label: 'Datacenter' },
    { key: 'monthly_cost' as const, label: 'Monthly Cost', formatter: (s: Server) => formatCost(s.monthly_cost, s.cost_currency) },
    { key: 'last_check_status' as const, label: 'Health Status' },
    { key: 'last_checked_at' as const, label: 'Last Health Check', formatter: (s: Server) => s.last_checked_at ? formatDateTime(s.last_checked_at) : '' },
    { key: 'login_user' as const, label: 'Login User' },
    { key: 'tags' as const, label: 'Tags', formatter: (s: Server) => (s.tags || []).map((t) => t.name).join(', ') },
    { key: 'notes' as const, label: 'Notes' },
  ];

  function handleExportCsv() {
    if (!servers || servers.length === 0) {
      addToast('error', 'No data to export');
      return;
    }
    setExporting(true);
    exportToCsv<Server>(servers, serverCsvColumns, 'servers.csv');
    addToast('success', `Exported ${servers.length} item(s)`);
    setExporting(false);
  }

  async function handleExportAll() {
    setExporting(true);
    try {
      const result = await api.listServers({ ...params, skip: 0, limit: 500 });
      exportToCsv<Server>(result.items, serverCsvColumns, 'servers-all.csv');
      addToast('success', `Exported ${result.items.length} item(s)`);
      if (result.total > 500) {
        addToast('error', `Warning: Only 500 of ${result.total} items exported. Full export not available.`);
      }
    } catch {
      addToast('error', 'Failed to export all servers');
    } finally {
      setExporting(false);
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

  async function handleBatchHealthCheck() {
    setBatchChecking(true);
    try {
      const result = await api.batchHealthCheck();
      addToast('success', `Health check: ${result.healthy} healthy, ${result.unhealthy} unhealthy, ${result.skipped} skipped`);
      refetch();
    } catch {
      addToast('error', 'Batch health check failed');
    } finally {
      setBatchChecking(false);
    }
  }

  async function handleBulkAudit() {
    try {
      const result = await api.bulkMarkAudited(Array.from(selectedIds));
      addToast('success', `Marked ${result.updated} server(s) as audited`);
      setSelectedIds(new Set());
      refetch();
    } catch {
      addToast('error', 'Failed to mark servers as audited');
    }
  }

  function handleCompare() {
    const ids = Array.from(selectedIds).slice(0, 5);
    router.push(`/servers/compare?ids=${ids.join(',')}`);
  }

  function handlePreview(serverId: number) {
    setPreviewServerId(serverId);
    setPreviewLoading(true);
    api.getServer(serverId)
      .then(setPreviewServer)
      .catch(() => addToast('error', 'Failed to load server preview'))
      .finally(() => setPreviewLoading(false));
  }

  return (
    <PageContainer
      title="Servers"
      error={error}
      onRetry={refetch}
      action={
        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.size >= 2 && selectedIds.size <= 5 && (
            <Button variant="secondary" onClick={handleCompare}>Compare ({selectedIds.size})</Button>
          )}
          {selectedIds.size > 0 && (
            <Button variant="secondary" onClick={() => setShowTagPicker(true)}>Tag ({selectedIds.size})</Button>
          )}
          {selectedIds.size > 0 && (
            <Button variant="secondary" onClick={() => setShowBulkEdit(true)}>Edit ({selectedIds.size})</Button>
          )}
          {selectedIds.size > 0 && (
            <Button variant="secondary" onClick={handleBulkAudit}>Audit ({selectedIds.size})</Button>
          )}
          {selectedIds.size > 0 && (
            <Button variant="danger" onClick={() => setShowBulkDelete(true)}>Delete ({selectedIds.size})</Button>
          )}
          <DropdownMenu label="More" variant="secondary">
            <DropdownMenu.Item onClick={handleBatchHealthCheck} disabled={batchChecking}>
              {batchChecking ? 'Checking...' : 'Check All'}
            </DropdownMenu.Item>
            <DropdownMenu.Item onClick={handleExportCsv} disabled={exporting}>
              {exporting ? 'Exporting...' : `Export Page (${servers?.length ?? 0})`}
            </DropdownMenu.Item>
            <DropdownMenu.Item onClick={handleExportAll} disabled={exporting}>
              {exporting ? 'Exporting...' : `Export All (${total})`}
            </DropdownMenu.Item>
            <DropdownMenu.Item onClick={() => setShowImport(true)}>
              Import CSV
            </DropdownMenu.Item>
          </DropdownMenu>
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
        {(urlState.status || urlState.provider || urlState.tag || search || hasAdvancedFilters) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setUrlState({ status: '', provider: '', tag: '', search: '', page: '0', ram_min: '', ram_max: '', cpu_min: '', cpu_max: '', disk_min: '', disk_max: '', cost_min: '', cost_max: '' });
              setSearch('');
            }}
          >
            Clear filters
            <span className="ml-1 rounded-full bg-gray-200 px-1.5 py-0.5 text-xs">
              {[urlState.status, urlState.provider, urlState.tag, search, ...Object.entries(urlState).filter(([k, v]) => k.includes('min') || k.includes('max')).map(([, v]) => v)].filter(Boolean).length}
            </span>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
        >
          {showAdvancedFilters ? 'Hide' : 'Advanced'} Filters
          {hasAdvancedFilters && <span className="ml-1 inline-block h-2 w-2 rounded-full bg-blue-500" />}
        </Button>
      </div>

      {showAdvancedFilters && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="mb-3 text-xs font-medium text-gray-500 uppercase">Numeric Range Filters</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">RAM (MB) min</label>
              <input type="number" className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" placeholder="Min"
                value={urlState.ram_min} onChange={(e) => setUrlState({ ram_min: e.target.value, page: '0' })} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">RAM (MB) max</label>
              <input type="number" className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" placeholder="Max"
                value={urlState.ram_max} onChange={(e) => setUrlState({ ram_max: e.target.value, page: '0' })} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">CPU min</label>
              <input type="number" className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" placeholder="Min"
                value={urlState.cpu_min} onChange={(e) => setUrlState({ cpu_min: e.target.value, page: '0' })} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">CPU max</label>
              <input type="number" className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" placeholder="Max"
                value={urlState.cpu_max} onChange={(e) => setUrlState({ cpu_max: e.target.value, page: '0' })} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Disk (GB) min</label>
              <input type="number" className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" placeholder="Min"
                value={urlState.disk_min} onChange={(e) => setUrlState({ disk_min: e.target.value, page: '0' })} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Disk (GB) max</label>
              <input type="number" className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" placeholder="Max"
                value={urlState.disk_max} onChange={(e) => setUrlState({ disk_max: e.target.value, page: '0' })} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Cost min</label>
              <input type="number" step="0.01" className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" placeholder="Min"
                value={urlState.cost_min} onChange={(e) => setUrlState({ cost_min: e.target.value, page: '0' })} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Cost max</label>
              <input type="number" step="0.01" className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" placeholder="Max"
                value={urlState.cost_max} onChange={(e) => setUrlState({ cost_max: e.target.value, page: '0' })} />
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <TableSkeleton columns={9} rows={8} />
      ) : servers && servers.length === 0 ? (
        <EmptyState
          message={urlState.status || urlState.provider || urlState.tag || search ? 'No servers match your filters' : 'No servers yet'}
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
            onPreview={handlePreview}
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

      <TagPickerModal
        open={showTagPicker}
        onClose={() => setShowTagPicker(false)}
        serverIds={Array.from(selectedIds)}
        onComplete={() => { refetch(); setSelectedIds(new Set()); }}
      />

      <ServerImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onComplete={refetch}
      />

      <BulkEditModal
        open={showBulkEdit}
        onClose={() => setShowBulkEdit(false)}
        serverIds={Array.from(selectedIds)}
        onComplete={() => { refetch(); setSelectedIds(new Set()); }}
      />

      <SlidePanel
        open={previewServerId !== null}
        onClose={() => { setPreviewServerId(null); setPreviewServer(null); }}
        title={previewServer?.name ?? 'Server Preview'}
      >
        {previewLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-32 rounded bg-gray-200" />
            <div className="h-24 rounded bg-gray-100" />
          </div>
        ) : previewServer ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <StatusBadge status={previewServer.status} />
              {previewServer.last_check_status && (
                <span className={`text-xs font-medium ${previewServer.last_check_status === 'healthy' ? 'text-green-700' : previewServer.last_check_status === 'unhealthy' ? 'text-red-700' : 'text-gray-500'}`}>
                  {previewServer.last_check_status === 'healthy' ? 'Healthy' : previewServer.last_check_status === 'unhealthy' ? 'Unhealthy' : 'Unknown'}
                </span>
              )}
            </div>
            {previewServer.ip_v4 && <p className="text-sm text-gray-600"><span className="font-medium">IP:</span> {previewServer.ip_v4}</p>}
            {previewServer.provider_name && <p className="text-sm text-gray-600"><span className="font-medium">Provider:</span> {previewServer.provider_name}</p>}
            {previewServer.location && <p className="text-sm text-gray-600"><span className="font-medium">Location:</span> {previewServer.location}</p>}
            {previewServer.documentation ? (
              <div>
                <h4 className="mb-1 text-sm font-medium text-gray-700">Documentation</h4>
                <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
                  <MarkdownRenderer content={previewServer.documentation} />
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No documentation</p>
            )}
            <div className="flex gap-2 border-t pt-3">
              <Link href={`/servers/${previewServer.id}`}>
                <Button size="sm">View Details</Button>
              </Link>
              <Link href={`/servers/${previewServer.id}/edit`}>
                <Button variant="secondary" size="sm">Edit</Button>
              </Link>
            </div>
          </div>
        ) : null}
      </SlidePanel>
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
