'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useServers } from '@/hooks/useServers';
import { useProviders } from '@/hooks/useProviders';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import PageContainer from '@/components/PageContainer';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import ServerTable from '@/components/domain/ServerTable';

const statusFilterOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'decommissioned', label: 'Decommissioned' },
];

export default function ServersPage() {
  const { addToast } = useToast();
  const [statusFilter, setStatusFilter] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const params = useMemo(
    () => ({
      status: statusFilter || undefined,
      provider_id: providerFilter ? Number(providerFilter) : undefined,
      search: debouncedSearch || undefined,
    }),
    [statusFilter, providerFilter, debouncedSearch]
  );

  const { data: servers, loading, error, refetch } = useServers(params);
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

  return (
    <PageContainer
      title="Servers"
      loading={loading}
      error={error}
      onRetry={refetch}
      action={
        <Link href="/servers/new">
          <Button>Add Server</Button>
        </Link>
      }
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="w-full sm:w-48">
          <Select
            label="Status"
            options={statusFilterOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            label="Provider"
            options={providerFilterOptions}
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-64">
          <Input
            ref={searchRef}
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search servers... (Ctrl+K)"
          />
        </div>
      </div>

      {servers && servers.length === 0 ? (
        <EmptyState
          message="No servers found"
          description={
            statusFilter || providerFilter || search
              ? 'Try adjusting your filters.'
              : 'Get started by adding your first server.'
          }
        />
      ) : (
        <ServerTable servers={servers ?? []} onDelete={handleDelete} />
      )}
    </PageContainer>
  );
}
