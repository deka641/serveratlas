'use client';
import { api } from '@/lib/api';
import { useData } from './useData';

export function useApplications(params?: { server_id?: number; status?: string; search?: string; skip?: number; limit?: number }) {
  const { data, loading, error, refetch } = useData(
    () => api.listApplications(params),
    [params?.server_id, params?.status, params?.search, params?.skip, params?.limit],
  );
  return { data: data?.items ?? null, total: data?.total ?? 0, loading, error, refetch };
}

export function useApplication(id: number) {
  return useData(() => api.getApplication(id), [id]);
}
