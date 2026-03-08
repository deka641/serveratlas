'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { SshConnection, Backup } from '@/lib/types';
import { api } from '@/lib/api';
import { useServer } from '@/hooks/useServers';
import { useBackups } from '@/hooks/useBackups';
import { useToast } from '@/components/ui/Toast';
import PageContainer from '@/components/PageContainer';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import Table, { Column } from '@/components/ui/Table';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

type TabKey = 'overview' | 'applications' | 'ssh-keys' | 'connections' | 'backups';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'applications', label: 'Applications' },
  { key: 'ssh-keys', label: 'SSH Keys' },
  { key: 'connections', label: 'Connections' },
  { key: 'backups', label: 'Backups' },
];

export default function ServerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const id = Number(params.id);

  const { data: server, loading, error } = useServer(id);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Connections state (loaded on demand)
  const [connections, setConnections] = useState<SshConnection[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);

  // Backups
  const { data: backups, loading: backupsLoading } = useBackups({ source_server_id: id });

  const loadConnections = useCallback(async () => {
    setConnectionsLoading(true);
    try {
      const data = await api.getServerConnections(id);
      setConnections(data);
    } catch {
      addToast('error', 'Failed to load connections');
    } finally {
      setConnectionsLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    if (activeTab === 'connections') {
      loadConnections();
    }
  }, [activeTab, loadConnections]);

  async function handleDelete() {
    try {
      await api.deleteServer(id);
      addToast('success', 'Server deleted successfully');
      router.push('/servers');
    } catch {
      addToast('error', 'Failed to delete server');
    }
  }

  function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
      <div className="py-2">
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className="mt-1 text-sm text-gray-900">{value ?? '\u2014'}</dd>
      </div>
    );
  }

  return (
    <PageContainer
      title={server?.name ?? 'Server Details'}
      loading={loading}
      error={error}
      action={
        server && (
          <div className="flex items-center gap-2">
            <Link href={`/servers/${id}/edit`}>
              <Button variant="secondary">Edit</Button>
            </Link>
            <Button variant="danger" onClick={() => setShowDeleteDialog(true)}>
              Delete
            </Button>
          </div>
        )
      }
    >
      {server && (
        <>
          {/* Tab navigation */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="-mb-px flex gap-6">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card title="Basic Information">
                <dl className="divide-y divide-gray-100">
                  <DetailRow label="Name" value={server.name} />
                  <DetailRow label="Hostname" value={server.hostname} />
                  <DetailRow
                    label="Status"
                    value={<StatusBadge status={server.status} />}
                  />
                  <DetailRow label="Provider" value={server.provider_name} />
                  <DetailRow label="OS" value={server.os} />
                </dl>
              </Card>

              <Card title="Network">
                <dl className="divide-y divide-gray-100">
                  <DetailRow
                    label="IPv4"
                    value={
                      server.ip_v4 && (
                        <span className="font-mono text-sm">{server.ip_v4}</span>
                      )
                    }
                  />
                  <DetailRow
                    label="IPv6"
                    value={
                      server.ip_v6 && (
                        <span className="font-mono text-sm">{server.ip_v6}</span>
                      )
                    }
                  />
                </dl>
              </Card>

              <Card title="Hardware">
                <dl className="divide-y divide-gray-100">
                  <DetailRow
                    label="CPU Cores"
                    value={server.cpu_cores != null ? String(server.cpu_cores) : null}
                  />
                  <DetailRow
                    label="RAM"
                    value={server.ram_mb != null ? `${server.ram_mb} MB` : null}
                  />
                  <DetailRow
                    label="Disk"
                    value={server.disk_gb != null ? `${server.disk_gb} GB` : null}
                  />
                </dl>
              </Card>

              <Card title="Location">
                <dl className="divide-y divide-gray-100">
                  <DetailRow label="Location" value={server.location} />
                  <DetailRow label="Datacenter" value={server.datacenter} />
                </dl>
              </Card>

              <Card title="Cost">
                <dl className="divide-y divide-gray-100">
                  <DetailRow
                    label="Monthly Cost"
                    value={
                      server.monthly_cost != null
                        ? `${Number(server.monthly_cost).toFixed(2)} ${server.cost_currency ?? 'EUR'}`
                        : null
                    }
                  />
                </dl>
              </Card>

              <Card title="Access">
                <dl className="divide-y divide-gray-100">
                  <DetailRow label="Login User" value={server.login_user} />
                  <DetailRow label="Login Notes" value={server.login_notes} />
                </dl>
              </Card>

              {server.notes && (
                <Card title="Notes" className="lg:col-span-2">
                  <p className="whitespace-pre-wrap text-sm text-gray-700">
                    {server.notes}
                  </p>
                </Card>
              )}
            </div>
          )}

          {/* Applications Tab */}
          {activeTab === 'applications' && (
            <Card noPadding>
              <Table
                columns={
                  [
                    {
                      key: 'name',
                      label: 'Name',
                      render: (app) => (
                        <Link
                          href={`/applications/${app.id}`}
                          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {app.name}
                        </Link>
                      ),
                    },
                    { key: 'app_type', label: 'Type' },
                    {
                      key: 'port',
                      label: 'Port',
                      render: (app) =>
                        app.port != null ? String(app.port) : '\u2014',
                    },
                    {
                      key: 'status',
                      label: 'Status',
                      render: (app) => <StatusBadge status={app.status as string} />,
                    },
                    {
                      key: 'url',
                      label: 'URL',
                      render: (app) =>
                        app.url ? (
                          <a
                            href={app.url as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {app.url as string}
                          </a>
                        ) : (
                          '\u2014'
                        ),
                    },
                  ] as Column<Record<string, unknown>>[]
                }
                data={server.applications as unknown as Record<string, unknown>[]}
              />
            </Card>
          )}

          {/* SSH Keys Tab */}
          {activeTab === 'ssh-keys' && (
            <Card noPadding>
              <Table
                columns={
                  [
                    {
                      key: 'ssh_key_name',
                      label: 'Name',
                      render: (key) => (
                        <Link
                          href={`/ssh-keys/${key.ssh_key_id}`}
                          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {(key.ssh_key_name as string) ?? 'Unnamed'}
                        </Link>
                      ),
                    },
                    {
                      key: 'is_authorized',
                      label: 'Authorized?',
                      render: (key) => (key.is_authorized ? 'Yes' : 'No'),
                    },
                    {
                      key: 'is_host_key',
                      label: 'Host Key?',
                      render: (key) => (key.is_host_key ? 'Yes' : 'No'),
                    },
                    { key: 'notes', label: 'Notes' },
                  ] as Column<Record<string, unknown>>[]
                }
                data={server.ssh_keys as unknown as Record<string, unknown>[]}
              />
            </Card>
          )}

          {/* Connections Tab */}
          {activeTab === 'connections' && (
            <Card noPadding>
              {connectionsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <LoadingSpinner />
                </div>
              ) : (
                <Table
                  columns={
                    [
                      {
                        key: 'connection',
                        label: 'Connection',
                        render: (conn) => (
                          <span>
                            <span className="font-medium">
                              {conn.source_server_name as string}
                            </span>
                            {' \u2192 '}
                            <span className="font-medium">
                              {conn.target_server_name as string}
                            </span>
                          </span>
                        ),
                      },
                      { key: 'ssh_user', label: 'User' },
                      {
                        key: 'ssh_port',
                        label: 'Port',
                        render: (conn) => String(conn.ssh_port),
                      },
                      { key: 'purpose', label: 'Purpose' },
                    ] as Column<Record<string, unknown>>[]
                  }
                  data={connections as unknown as Record<string, unknown>[]}
                />
              )}
            </Card>
          )}

          {/* Backups Tab */}
          {activeTab === 'backups' && (
            <Card noPadding>
              {backupsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <LoadingSpinner />
                </div>
              ) : (
                <Table
                  columns={
                    [
                      { key: 'name', label: 'Name' },
                      { key: 'frequency', label: 'Frequency' },
                      {
                        key: 'last_run_status',
                        label: 'Last Status',
                        render: (backup: Record<string, unknown>) =>
                          backup.last_run_status ? (
                            <StatusBadge
                              status={backup.last_run_status as string}
                            />
                          ) : (
                            '\u2014'
                          ),
                      },
                      {
                        key: 'last_run_at',
                        label: 'Last Run',
                        render: (backup: Record<string, unknown>) =>
                          backup.last_run_at
                            ? new Date(backup.last_run_at as string).toLocaleString()
                            : 'Never',
                      },
                      {
                        key: 'target_server_name',
                        label: 'Target Server',
                      },
                      { key: 'storage_path', label: 'Storage Path' },
                    ] as Column<Record<string, unknown>>[]
                  }
                  data={(backups ?? []) as unknown as Record<string, unknown>[]}
                />
              )}
            </Card>
          )}

          <ConfirmDialog
            open={showDeleteDialog}
            title="Delete Server"
            message={`Are you sure you want to delete "${server.name}"? This will also remove associated applications, SSH key assignments, and connections.`}
            confirmLabel="Delete"
            onConfirm={handleDelete}
            onCancel={() => setShowDeleteDialog(false)}
          />
        </>
      )}
    </PageContainer>
  );
}
