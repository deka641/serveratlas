const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
      signal: controller.signal,
    });
    if (!res.ok) {
      let message = res.statusText;
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (json.detail) message = json.detail;
      } catch {
        if (text) message = text;
      }
      throw new ApiError(res.status, message);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function requestPaginated<T>(path: string, options?: RequestInit): Promise<PaginatedResponse<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
      signal: controller.signal,
    });
    if (!res.ok) {
      let message = res.statusText;
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (json.detail) message = json.detail;
      } catch {
        if (text) message = text;
      }
      throw new ApiError(res.status, message);
    }
    const total = parseInt(res.headers.get('X-Total-Count') || '0', 10);
    const items = await res.json();
    return { items, total };
  } finally {
    clearTimeout(timeout);
  }
}

import type {
  Activity, Application, Backup, BackupCoverage, ConnectivityGraph, CostSummary,
  DashboardStats, OverdueBackup, Provider, ProviderWithServers, RecentBackup, Server,
  ServerDetail, ServerSshKey, SshConnection, SshKey, SshKeyWithServers, Tag,
} from './types';

export const api = {
  // Providers
  listProviders: (params?: { search?: string; skip?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.skip != null) qs.set('skip', String(params.skip));
    if (params?.limit != null) qs.set('limit', String(params.limit));
    const q = qs.toString();
    return requestPaginated<Provider>(`/providers${q ? '?' + q : ''}`);
  },
  getProvider: (id: number) => request<Provider>(`/providers/${id}`),
  getProviderWithServers: (id: number) => request<ProviderWithServers>(`/providers/${id}`),
  getProviderServers: (id: number) => request<Server[]>(`/providers/${id}/servers`),
  createProvider: (data: Partial<Provider>) => request<Provider>('/providers', { method: 'POST', body: JSON.stringify(data) }),
  updateProvider: (id: number, data: Partial<Provider>) => request<Provider>(`/providers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProvider: (id: number) => request<void>(`/providers/${id}`, { method: 'DELETE' }),

  // Servers
  listServers: (params?: { status?: string; provider_id?: number; tag_id?: number; search?: string; skip?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.provider_id) qs.set('provider_id', String(params.provider_id));
    if (params?.tag_id) qs.set('tag_id', String(params.tag_id));
    if (params?.search) qs.set('search', params.search);
    if (params?.skip != null) qs.set('skip', String(params.skip));
    if (params?.limit != null) qs.set('limit', String(params.limit));
    const q = qs.toString();
    return requestPaginated<Server>(`/servers${q ? '?' + q : ''}`);
  },
  getServer: (id: number) => request<ServerDetail>(`/servers/${id}`),
  createServer: (data: Partial<Server>) => request<Server>('/servers', { method: 'POST', body: JSON.stringify(data) }),
  updateServer: (id: number, data: Partial<Server>) => request<Server>(`/servers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteServer: (id: number) => request<void>(`/servers/${id}`, { method: 'DELETE' }),
  getServerApplications: (id: number) => request<Application[]>(`/servers/${id}/applications`),
  getServerSshKeys: (id: number) => request<ServerSshKey[]>(`/servers/${id}/ssh-keys`),
  getServerConnections: (id: number) => request<SshConnection[]>(`/servers/${id}/connections`),
  addServerSshKey: (serverId: number, keyId: number, data?: Partial<ServerSshKey>) =>
    request<ServerSshKey>(`/servers/${serverId}/ssh-keys/${keyId}`, { method: 'POST', body: JSON.stringify(data || {}) }),
  removeServerSshKey: (serverId: number, keyId: number) =>
    request<void>(`/servers/${serverId}/ssh-keys/${keyId}`, { method: 'DELETE' }),
  importServers: (data: { servers: Array<{ name: string; hostname?: string; ip_v4?: string; os?: string; provider_name?: string; status?: string; location?: string; [key: string]: unknown }>; skip_duplicates?: boolean }) =>
    request<{ created: number; skipped: number; errors: string[] }>('/servers/import', { method: 'POST', body: JSON.stringify(data) }),

  // SSH Keys
  listSshKeys: (params?: { search?: string; skip?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.skip != null) qs.set('skip', String(params.skip));
    if (params?.limit != null) qs.set('limit', String(params.limit));
    const q = qs.toString();
    return requestPaginated<SshKey>(`/ssh-keys${q ? '?' + q : ''}`);
  },
  getSshKey: (id: number) => request<SshKeyWithServers>(`/ssh-keys/${id}`),
  createSshKey: (data: Partial<SshKey>) => request<SshKey>('/ssh-keys', { method: 'POST', body: JSON.stringify(data) }),
  updateSshKey: (id: number, data: Partial<SshKey>) => request<SshKey>(`/ssh-keys/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSshKey: (id: number) => request<void>(`/ssh-keys/${id}`, { method: 'DELETE' }),

  // SSH Connections
  listSshConnections: (params?: { search?: string; skip?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.skip != null) qs.set('skip', String(params.skip));
    if (params?.limit != null) qs.set('limit', String(params.limit));
    const q = qs.toString();
    return requestPaginated<SshConnection>(`/ssh-connections${q ? '?' + q : ''}`);
  },
  getSshConnection: (id: number) => request<SshConnection>(`/ssh-connections/${id}`),
  createSshConnection: (data: Partial<SshConnection>) => request<SshConnection>('/ssh-connections', { method: 'POST', body: JSON.stringify(data) }),
  updateSshConnection: (id: number, data: Partial<SshConnection>) => request<SshConnection>(`/ssh-connections/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSshConnection: (id: number) => request<void>(`/ssh-connections/${id}`, { method: 'DELETE' }),
  getConnectionGraph: () => request<ConnectivityGraph>('/ssh-connections/graph'),

  // Applications
  listApplications: (params?: { server_id?: number; status?: string; search?: string; skip?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.server_id) qs.set('server_id', String(params.server_id));
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('search', params.search);
    if (params?.skip != null) qs.set('skip', String(params.skip));
    if (params?.limit != null) qs.set('limit', String(params.limit));
    const q = qs.toString();
    return requestPaginated<Application>(`/applications${q ? '?' + q : ''}`);
  },
  getApplication: (id: number) => request<Application>(`/applications/${id}`),
  createApplication: (data: Partial<Application>) => request<Application>('/applications', { method: 'POST', body: JSON.stringify(data) }),
  updateApplication: (id: number, data: Partial<Application>) => request<Application>(`/applications/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteApplication: (id: number) => request<void>(`/applications/${id}`, { method: 'DELETE' }),

  // Backups
  listBackups: (params?: { source_server_id?: number; application_id?: number; status?: string; search?: string; skip?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.source_server_id) qs.set('source_server_id', String(params.source_server_id));
    if (params?.application_id) qs.set('application_id', String(params.application_id));
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('search', params.search);
    if (params?.skip != null) qs.set('skip', String(params.skip));
    if (params?.limit != null) qs.set('limit', String(params.limit));
    const q = qs.toString();
    return requestPaginated<Backup>(`/backups${q ? '?' + q : ''}`);
  },
  getBackup: (id: number) => request<Backup>(`/backups/${id}`),
  createBackup: (data: Partial<Backup>) => request<Backup>('/backups', { method: 'POST', body: JSON.stringify(data) }),
  updateBackup: (id: number, data: Partial<Backup>) => request<Backup>(`/backups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBackup: (id: number) => request<void>(`/backups/${id}`, { method: 'DELETE' }),

  // Bulk operations
  bulkDeleteServers: (ids: number[]) => request<void>('/servers/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }),
  bulkDeleteApplications: (ids: number[]) => request<void>('/applications/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }),
  bulkDeleteBackups: (ids: number[]) => request<void>('/backups/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }),
  bulkDeleteProviders: (ids: number[]) => request<void>('/providers/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }),
  bulkDeleteSshKeys: (ids: number[]) => request<void>('/ssh-keys/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }),
  bulkDeleteSshConnections: (ids: number[]) => request<void>('/ssh-connections/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }),

  // Dashboard
  getDashboardStats: () => request<DashboardStats>('/dashboard/stats'),
  getCostSummary: () => request<CostSummary>('/dashboard/cost-summary'),
  getRecentBackups: () => request<RecentBackup[]>('/dashboard/recent-backups'),
  getBackupCoverage: () => request<BackupCoverage>('/dashboard/backup-coverage'),
  getOverdueBackups: () => request<OverdueBackup[]>('/dashboard/overdue-backups'),

  // Tags
  listTags: (params?: { search?: string; skip?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.skip != null) qs.set('skip', String(params.skip));
    if (params?.limit != null) qs.set('limit', String(params.limit));
    const q = qs.toString();
    return requestPaginated<Tag>(`/tags${q ? '?' + q : ''}`);
  },
  getTag: (id: number) => request<Tag>(`/tags/${id}`),
  createTag: (data: { name: string; color?: string }) => request<Tag>('/tags', { method: 'POST', body: JSON.stringify(data) }),
  updateTag: (id: number, data: { name?: string; color?: string }) => request<Tag>(`/tags/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTag: (id: number) => request<void>(`/tags/${id}`, { method: 'DELETE' }),
  bulkDeleteTags: (ids: number[]) => request<void>('/tags/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }),
  addTagToServer: (serverId: number, tagId: number) => request<void>(`/tags/servers/${serverId}/tags/${tagId}`, { method: 'POST' }),
  removeTagFromServer: (serverId: number, tagId: number) => request<void>(`/tags/servers/${serverId}/tags/${tagId}`, { method: 'DELETE' }),
  batchAssignTags: (data: { server_ids: number[]; tag_ids: number[]; action: 'assign' | 'unassign' }) =>
    request<{ status: string; count: number }>('/tags/batch-assign', { method: 'POST', body: JSON.stringify(data) }),

  // Activities
  listActivities: (params?: { entity_type?: string; entity_id?: number; action?: string; search?: string; date_from?: string; date_to?: string; skip?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.entity_type) qs.set('entity_type', params.entity_type);
    if (params?.entity_id) qs.set('entity_id', String(params.entity_id));
    if (params?.action) qs.set('action', params.action);
    if (params?.search) qs.set('search', params.search);
    if (params?.date_from) qs.set('date_from', params.date_from);
    if (params?.date_to) qs.set('date_to', params.date_to);
    if (params?.skip != null) qs.set('skip', String(params.skip));
    if (params?.limit != null) qs.set('limit', String(params.limit));
    const q = qs.toString();
    return requestPaginated<Activity>(`/activities${q ? '?' + q : ''}`);
  },
  getActivityStats: () => request<{ total_count: number; oldest_entry: string | null }>('/activities/stats'),
  cleanupActivities: (retentionDays: number) =>
    request<{ deleted_count: number; retention_days: number }>(`/activities/cleanup?retention_days=${retentionDays}`, { method: 'POST' }),

  // Server health check
  updateServerHealthCheck: (id: number, data: { status: string; response_time_ms?: number }) =>
    request<Server>(`/servers/${id}/health-check`, { method: 'POST', body: JSON.stringify(data) }),
  runHealthCheck: (id: number) =>
    request<Server>(`/servers/${id}/run-health-check`, { method: 'POST' }),
};
