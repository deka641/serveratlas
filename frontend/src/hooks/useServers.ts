'use client';
import { api } from '@/lib/api';
import { useData } from './useData';

export function useServers(params?: { status?: string; provider_id?: number; tag_id?: number; search?: string; skip?: number; limit?: number; stale?: boolean }) {
  const { data, loading, error, refetch } = useData(
    () => api.listServers(params),
    [params?.status, params?.provider_id, params?.tag_id, params?.search, params?.skip, params?.limit, params?.stale],
  );
  return { data: data?.items ?? null, total: data?.total ?? 0, loading, error, refetch };
}

export function useServer(id: number) {
  return useData(() => api.getServer(id), [id]);
}
