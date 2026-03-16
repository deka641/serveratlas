'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { SshConnection, Backup, ServerSshKey, SshKey, Application, Tag, Activity } from '@/lib/types';
import { api } from '@/lib/api';
import { formatCost, formatDateTime, formatRAM, formatDisk } from '@/lib/formatters';
import { useServer } from '@/hooks/useServers';
import { useBackups } from '@/hooks/useBackups';
import { useToast } from '@/components/ui/Toast';
import PageContainer from '@/components/PageContainer';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import Table, { Column } from '@/components/ui/Table';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import CopyableText from '@/components/ui/CopyableText';
import DetailSkeleton from '@/components/ui/DetailSkeleton';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';
import ChangesSummary from '@/components/domain/ChangesSummary';

type TabKey = 'overview' | 'applications' | 'ssh-keys' | 'connections' | 'backups';

interface TabDef {
  key: TabKey;
  label: string;
  count?: number;
}

export default function ServerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const id = Number(params.id);

  const { data: server, loading, error, refetch } = useServer(id);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Connections state (loaded on demand)
  const [connections, setConnections] = useState<SshConnection[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);

  // Backups
  const { data: backups, loading: backupsLoading } = useBackups({ source_server_id: id });

  const tabs: TabDef[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'applications', label: 'Applications', count: server?.applications?.length ?? 0 },
    { key: 'ssh-keys', label: 'SSH Keys', count: server?.ssh_keys?.length ?? 0 },
    { key: 'connections', label: 'Connections', count: connections.length },
    { key: 'backups', label: 'Backups', count: backups?.length ?? 0 },
  ];

  // SSH Key management state
  const [showAddKeyModal, setShowAddKeyModal] = useState(false);
  const [availableKeys, setAvailableKeys] = useState<SshKey[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [isHostKey, setIsHostKey] = useState(false);
  const [addingKey, setAddingKey] = useState(false);
  const [removeKeyTarget, setRemoveKeyTarget] = useState<ServerSshKey | null>(null);

  // Tag management state
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [creatingTag, setCreatingTag] = useState(false);

  // Health check state
  const [healthCheckRunning, setHealthCheckRunning] = useState(false);

  // Activity history state
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

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

  const loadAvailableKeys = useCallback(async () => {
    try {
      const result = await api.listSshKeys({ limit: 500 });
      const allKeys = result.items;
      const assignedIds = new Set((server?.ssh_keys ?? []).map((k) => k.ssh_key_id));
      setAvailableKeys(allKeys.filter((k) => !assignedIds.has(k.id)));
    } catch {
      addToast('error', 'Failed to load SSH keys');
    }
  }, [server?.ssh_keys, addToast]);

  useEffect(() => {
    if (showAddKeyModal) {
      loadAvailableKeys();
    }
  }, [showAddKeyModal, loadAvailableKeys]);

  // Load all tags for the dropdown
  const loadAllTags = useCallback(async () => {
    setTagsLoading(true);
    try {
      const result = await api.listTags();
      setAllTags(result.items);
    } catch {
      addToast('error', 'Failed to load tags');
    } finally {
      setTagsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (server) {
      loadAllTags();
    }
  }, [server?.id, loadAllTags]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load activity history
  const loadActivities = useCallback(async () => {
    setActivitiesLoading(true);
    try {
      const result = await api.listActivities({ entity_type: 'server', entity_id: id, limit: 20 });
      setActivities(result.items);
    } catch {
      addToast('error', 'Failed to load activity history');
    } finally {
      setActivitiesLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    if (server) {
      loadActivities();
    }
  }, [server?.id, loadActivities]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAddTag() {
    if (!selectedTagId) return;
    try {
      await api.addTagToServer(id, Number(selectedTagId));
      addToast('success', 'Tag added');
      setSelectedTagId('');
      refetch();
      loadActivities();
    } catch {
      addToast('error', 'Failed to add tag');
    }
  }

  async function handleRemoveTag(tagId: number) {
    try {
      await api.removeTagFromServer(id, tagId);
      addToast('success', 'Tag removed');
      refetch();
      loadActivities();
    } catch {
      addToast('error', 'Failed to remove tag');
    }
  }

  async function handleCreateTag() {
    const trimmed = newTagName.trim();
    if (!trimmed) return;
    setCreatingTag(true);
    try {
      const tag = await api.createTag({ name: trimmed });
      addToast('success', `Tag "${tag.name}" created`);
      setNewTagName('');
      setAllTags((prev) => [...prev, tag]);
    } catch {
      addToast('error', 'Failed to create tag');
    } finally {
      setCreatingTag(false);
    }
  }

  async function handleRunHealthCheck() {
    setHealthCheckRunning(true);
    try {
      await api.runHealthCheck(id);
      addToast('success', 'Health check completed');
      refetch();
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : 'Health check failed');
    } finally {
      setHealthCheckRunning(false);
    }
  }

  async function handleDelete() {
    try {
      await api.deleteServer(id);
      addToast('success', 'Server deleted successfully');
      router.push('/servers');
    } catch {
      addToast('error', 'Failed to delete server');
    }
  }

  async function handleAddSshKey() {
    if (!selectedKeyId) return;
    setAddingKey(true);
    try {
      await api.addServerSshKey(id, Number(selectedKeyId), {
        is_authorized: isAuthorized,
        is_host_key: isHostKey,
      });
      addToast('success', 'SSH key added');
      setShowAddKeyModal(false);
      setSelectedKeyId('');
      setIsAuthorized(true);
      setIsHostKey(false);
      refetch();
    } catch {
      addToast('error', 'Failed to add SSH key');
    } finally {
      setAddingKey(false);
    }
  }

  async function handleRemoveSshKey() {
    if (!removeKeyTarget) return;
    try {
      await api.removeServerSshKey(id, removeKeyTarget.ssh_key_id);
      addToast('success', 'SSH key removed');
      setRemoveKeyTarget(null);
      refetch();
    } catch {
      addToast('error', 'Failed to remove SSH key');
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

  // Typed column definitions
  const applicationColumns: Column<Application>[] = [
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
      render: (app) => <StatusBadge status={app.status} />,
    },
    {
      key: 'url',
      label: 'URL',
      render: (app) =>
        app.url ? (
          <a
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {app.url}
          </a>
        ) : (
          '\u2014'
        ),
    },
  ];

  const sshKeyColumns: Column<ServerSshKey>[] = [
    {
      key: 'ssh_key_name',
      label: 'Name',
      render: (key) => (
        <Link
          href={`/ssh-keys/${key.ssh_key_id}`}
          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
        >
          {key.ssh_key_name ?? 'Unnamed'}
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
    {
      key: 'actions',
      label: '',
      render: (key) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600 hover:text-red-800"
          onClick={() => setRemoveKeyTarget(key)}
        >
          Remove
        </Button>
      ),
    },
  ];

  const connectionColumns: Column<SshConnection>[] = [
    {
      key: 'connection',
      label: 'Connection',
      render: (conn) => (
        <span>
          <span className="font-medium">{conn.source_server_name}</span>
          {' \u2192 '}
          <span className="font-medium">{conn.target_server_name}</span>
        </span>
      ),
    },
    {
      key: 'ssh_user',
      label: 'User',
      render: (conn) => conn.ssh_user ?? '\u2014',
    },
    {
      key: 'ssh_port',
      label: 'Port',
      render: (conn) => String(conn.ssh_port),
    },
    {
      key: 'purpose',
      label: 'Purpose',
      render: (conn) => conn.purpose ?? '\u2014',
    },
  ];

  const backupColumns: Column<Backup>[] = [
    {
      key: 'name',
      label: 'Name',
      render: (backup: Backup) => (
        <Link
          href={`/backups/${backup.id}`}
          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
        >
          {backup.name}
        </Link>
      ),
    },
    { key: 'frequency', label: 'Frequency' },
    {
      key: 'last_run_status',
      label: 'Last Status',
      render: (backup) =>
        backup.last_run_status ? (
          <StatusBadge status={backup.last_run_status} />
        ) : (
          '\u2014'
        ),
    },
    {
      key: 'last_run_at',
      label: 'Last Run',
      render: (backup) =>
        backup.last_run_at
          ? formatDateTime(backup.last_run_at)
          : 'Never',
    },
    {
      key: 'target_server_name',
      label: 'Target Server',
      render: (backup) => backup.target_server_name ?? '\u2014',
    },
    { key: 'storage_path', label: 'Storage Path' },
  ];

  return (
    <PageContainer
      title={server?.name ?? 'Server Details'}
      breadcrumbs={[{ label: 'Servers', href: '/servers' }, { label: server?.name ?? 'Server' }]}
      error={error}
      onRetry={refetch}
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
      {loading ? <DetailSkeleton cards={7} fieldsPerCard={3} /> : server && (
        <>
          {/* Tab navigation */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="-mb-px flex gap-6 overflow-x-auto">
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
                  {tab.count !== undefined && (
                    <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
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
                      server.ip_v4 ? (
                        <CopyableText text={server.ip_v4} className="font-mono text-sm" />
                      ) : null
                    }
                  />
                  <DetailRow
                    label="IPv6"
                    value={
                      server.ip_v6 ? (
                        <CopyableText text={server.ip_v6} className="font-mono text-sm" />
                      ) : null
                    }
                  />
                  <DetailRow
                    label="Hostname"
                    value={
                      server.hostname ? (
                        <CopyableText text={server.hostname} className="font-mono text-sm" />
                      ) : null
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
                    value={formatRAM(server.ram_mb)}
                  />
                  <DetailRow
                    label="Disk"
                    value={formatDisk(server.disk_gb)}
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
                        ? formatCost(server.monthly_cost, server.cost_currency)
                        : null
                    }
                  />
                </dl>
              </Card>

              <Card title="Health Check">
                <dl className="divide-y divide-gray-100">
                  <DetailRow
                    label="Status"
                    value={
                      <span className="flex items-center gap-2">
                        <span
                          className={`inline-block h-2.5 w-2.5 rounded-full ${
                            server.last_check_status === 'healthy' ? 'bg-green-500' :
                            server.last_check_status === 'unhealthy' ? 'bg-red-500' :
                            'bg-gray-300'
                          }`}
                          title={
                            server.last_check_status === 'healthy' ? 'Healthy' :
                            server.last_check_status === 'unhealthy' ? 'Unhealthy' :
                            'Unknown'
                          }
                          aria-label={
                            server.last_check_status === 'healthy' ? 'Healthy' :
                            server.last_check_status === 'unhealthy' ? 'Unhealthy' :
                            'Unknown'
                          }
                        />
                        <span className={
                          server.last_check_status === 'healthy' ? 'text-green-700' :
                          server.last_check_status === 'unhealthy' ? 'text-red-700' :
                          'text-gray-500'
                        }>
                          {server.last_check_status === 'healthy' ? 'Healthy' :
                           server.last_check_status === 'unhealthy' ? 'Unhealthy' :
                           'Unknown'}
                        </span>
                      </span>
                    }
                  />
                  <DetailRow label="Last Checked" value={server.last_checked_at ? formatDateTime(server.last_checked_at) : 'Never'} />
                  <DetailRow label="Response Time" value={server.response_time_ms != null ? `${server.response_time_ms} ms` : null} />
                </dl>
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleRunHealthCheck}
                    disabled={healthCheckRunning || (!server.ip_v4 && !server.hostname)}
                  >
                    {healthCheckRunning ? 'Checking...' : 'Run Health Check'}
                  </Button>
                </div>
              </Card>

              <Card title="Access">
                <dl className="divide-y divide-gray-100">
                  <DetailRow label="Login User" value={server.login_user} />
                  <DetailRow label="Login Notes" value={server.login_notes} />
                  {(server.ip_v4 || server.hostname) && (
                    <DetailRow
                      label="SSH Command"
                      value={
                        <CopyableText
                          text={`ssh ${server.login_user || 'root'}@${server.ip_v4 || server.hostname}`}
                          className="font-mono text-sm"
                        />
                      }
                    />
                  )}
                </dl>
              </Card>

              <Card title="Notes" className="lg:col-span-2">
                {server.notes ? (
                  <MarkdownRenderer content={server.notes} />
                ) : (
                  <p className="text-sm text-gray-500">{'\u2014'}</p>
                )}
              </Card>
            </div>

            {/* Backup Coverage Card */}
            {server.applications.length > 0 && (
              <Card title="Backup Coverage" className="mt-6">
                {(() => {
                  const backupList = backups ?? [];
                  const coveredAppIds = new Set(backupList.filter(b => b.application_id).map(b => b.application_id));
                  const uncoveredApps = server.applications.filter(app => !coveredAppIds.has(app.id));
                  const coveredCount = server.applications.length - uncoveredApps.length;
                  return (
                    <>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">{coveredCount}</span> of{' '}
                        <span className="font-medium">{server.applications.length}</span>{' '}
                        application{server.applications.length !== 1 ? 's' : ''} covered by backups.
                      </p>
                      {uncoveredApps.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-amber-700">Uncovered applications:</p>
                          <ul className="mt-1 space-y-1">
                            {uncoveredApps.map((app) => (
                              <li key={app.id} className="flex items-center justify-between text-sm">
                                <span className="text-gray-700">{app.name}</span>
                                <Link
                                  href={`/backups/new?application_id=${app.id}&source_server_id=${id}`}
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  Create Backup
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {uncoveredApps.length === 0 && (
                        <p className="mt-1 text-sm text-green-700">All applications are covered by backups.</p>
                      )}
                    </>
                  );
                })()}
              </Card>
            )}

            {/* Tags Section */}
            <Card title="Tags" className="mt-6">
              {/* Current tags */}
              <div className="mb-4 flex flex-wrap gap-2">
                {(server.tags ?? []).length === 0 && (
                  <p className="text-sm text-gray-500">No tags yet.</p>
                )}
                {(server.tags ?? []).map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag.id)}
                      className="ml-1 inline-flex items-center justify-center rounded-full p-0.5 hover:bg-white/20 focus:outline-none"
                      aria-label={`Remove tag ${tag.name}`}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>

              {/* Add existing tag */}
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Select
                    label="Add existing tag"
                    options={
                      allTags
                        .filter((t) => !(server.tags ?? []).some((st) => st.id === t.id))
                        .map((t) => ({ value: String(t.id), label: t.name }))
                    }
                    value={selectedTagId}
                    onChange={(e) => setSelectedTagId(e.target.value)}
                    placeholder="Select a tag..."
                    disabled={tagsLoading}
                  />
                </div>
                <Button
                  size="md"
                  onClick={handleAddTag}
                  disabled={!selectedTagId}
                >
                  Add
                </Button>
              </div>

              {/* Create new tag */}
              <div className="mt-4 flex items-end gap-2 border-t border-gray-100 pt-4">
                <div className="flex-1">
                  <Input
                    label="Create new tag"
                    placeholder="Tag name..."
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateTag();
                      }
                    }}
                  />
                </div>
                <Button
                  size="md"
                  variant="secondary"
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim() || creatingTag}
                >
                  {creatingTag ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </Card>

            {/* Activity History Section */}
            <Card title="Activity History" className="mt-6">
              {activitiesLoading ? (
                <div className="flex items-center justify-center p-8">
                  <LoadingSpinner />
                </div>
              ) : activities.length === 0 ? (
                <p className="text-sm text-gray-500">No activity recorded yet.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {activities.map((activity) => (
                    <li key={activity.id} className="flex items-start gap-3 py-3">
                      <span
                        className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          activity.action === 'created'
                            ? 'bg-green-100 text-green-800'
                            : activity.action === 'updated'
                            ? 'bg-blue-100 text-blue-800'
                            : activity.action === 'deleted'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {activity.action}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-900">
                          <span className="font-medium">{activity.entity_name}</span>
                        </p>
                        {activity.changes && (
                          <div className="mt-0.5">
                            <ChangesSummary changes={activity.changes} />
                          </div>
                        )}
                        <p className="mt-0.5 text-xs text-gray-500">
                          {formatDateTime(activity.created_at)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            </>
          )}

          {/* Applications Tab */}
          {activeTab === 'applications' && (
            <>
              <div className="mb-4 flex justify-end">
                <Link href={`/applications/new?server_id=${id}`}>
                  <Button>Add Application</Button>
                </Link>
              </div>
              <Card noPadding>
                <Table
                  columns={applicationColumns}
                  data={server.applications}
                  emptyMessage="No applications on this server yet."
                />
              </Card>
            </>
          )}

          {/* SSH Keys Tab */}
          {activeTab === 'ssh-keys' && (
            <>
              <div className="mb-4 flex justify-end">
                <Button onClick={() => setShowAddKeyModal(true)}>
                  Add SSH Key
                </Button>
              </div>
              <Card noPadding>
                <Table
                  columns={sshKeyColumns}
                  data={server.ssh_keys}
                  emptyMessage="No SSH keys assigned yet."
                />
              </Card>

              {/* Add SSH Key Modal */}
              <Modal
                open={showAddKeyModal}
                title="Add SSH Key to Server"
                onClose={() => setShowAddKeyModal(false)}
              >
                <div className="space-y-4">
                  <Select
                    label="SSH Key"
                    options={availableKeys.map((k) => ({
                      value: String(k.id),
                      label: k.name,
                    }))}
                    value={selectedKeyId}
                    onChange={(e) => setSelectedKeyId(e.target.value)}
                    placeholder="Select an SSH key..."
                  />
                  {availableKeys.length === 0 && (
                    <p className="text-sm text-gray-500">
                      No unassigned SSH keys available.{' '}
                      <Link href="/ssh-keys/new" className="text-blue-600 hover:underline">
                        Create a new one
                      </Link>.
                    </p>
                  )}
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={isAuthorized}
                        onChange={(e) => setIsAuthorized(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      Authorized Key
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={isHostKey}
                        onChange={(e) => setIsHostKey(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      Host Key
                    </label>
                  </div>
                  <div className="flex justify-end gap-2 border-t pt-4">
                    <Button
                      variant="secondary"
                      onClick={() => setShowAddKeyModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddSshKey}
                      disabled={!selectedKeyId || addingKey}
                    >
                      {addingKey ? 'Adding...' : 'Add Key'}
                    </Button>
                  </div>
                </div>
              </Modal>

              {/* Remove SSH Key Confirmation */}
              <ConfirmDialog
                open={removeKeyTarget !== null}
                title="Remove SSH Key"
                message={`Remove "${removeKeyTarget?.ssh_key_name ?? 'this key'}" from this server?`}
                confirmLabel="Remove"
                onConfirm={handleRemoveSshKey}
                onCancel={() => setRemoveKeyTarget(null)}
              />
            </>
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
                  columns={connectionColumns}
                  data={connections}
                  emptyMessage="No connections configured yet."
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
                  columns={backupColumns}
                  data={backups ?? []}
                  emptyMessage="No backups configured yet."
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
