'use client';
import { api } from '@/lib/api';
import { useData } from './useData';

export function useSshConnections(params?: { search?: string; skip?: number; limit?: number }) {
  const { data, loading, error, refetch } = useData(
    () => api.listSshConnections(params),
    [params?.search, params?.skip, params?.limit],
  );
  return { data: data?.items ?? null, total: data?.total ?? 0, loading, error, refetch };
}

export function useSshConnection(id: number) {
  return useData(() => api.getSshConnection(id), [id]);
}

export function useConnectionGraph() {
  return useData(() => api.getConnectionGraph());
}
