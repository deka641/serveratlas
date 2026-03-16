'use client';
import { api } from '@/lib/api';
import { useData } from './useData';

export function useTags(params?: { search?: string; skip?: number; limit?: number }) {
  const { data, loading, error, refetch } = useData(
    () => api.listTags(params),
    [params?.search, params?.skip, params?.limit],
  );
  return { data: data?.items ?? null, total: data?.total ?? 0, loading, error, refetch };
}
