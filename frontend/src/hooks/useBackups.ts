'use client';
import { api } from '@/lib/api';
import { useData } from './useData';

export function useBackups(params?: { source_server_id?: number; application_id?: number; status?: string; search?: string; skip?: number; limit?: number }) {
  const { data, loading, error, refetch } = useData(
    () => api.listBackups(params),
    [params?.source_server_id, params?.application_id, params?.status, params?.search, params?.skip, params?.limit],
  );
  return { data: data?.items ?? null, total: data?.total ?? 0, loading, error, refetch };
}

export function useBackup(id: number) {
  return useData(() => api.getBackup(id), [id]);
}
