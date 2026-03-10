'use client';
import { api } from '@/lib/api';
import { useData } from './useData';

export function useProviders(params?: { search?: string; skip?: number; limit?: number }) {
  const { data, loading, error, refetch } = useData(
    () => api.listProviders(params),
    [params?.search, params?.skip, params?.limit],
  );
  return { data: data?.items ?? null, total: data?.total ?? 0, loading, error, refetch };
}

export function useProvider(id: number) {
  return useData(() => api.getProvider(id), [id]);
}

export function useProviderServers(id: number) {
  return useData(() => api.getProviderServers(id), [id]);
}
