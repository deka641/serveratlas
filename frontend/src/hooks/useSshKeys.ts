'use client';
import { api } from '@/lib/api';
import { useData } from './useData';

export function useSshKeys(params?: { search?: string; skip?: number; limit?: number }) {
  const { data, loading, error, refetch } = useData(
    () => api.listSshKeys(params),
    [params?.search, params?.skip, params?.limit],
  );
  return { data: data?.items ?? null, total: data?.total ?? 0, loading, error, refetch };
}

export function useSshKey(id: number) {
  return useData(() => api.getSshKey(id), [id]);
}
