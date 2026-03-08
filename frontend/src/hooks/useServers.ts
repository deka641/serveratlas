'use client';
import { api } from '@/lib/api';
import { useData } from './useData';

export function useServers(params?: { status?: string; provider_id?: number; search?: string }) {
  return useData(() => api.listServers(params), [params?.status, params?.provider_id, params?.search]);
}

export function useServer(id: number) {
  return useData(() => api.getServer(id), [id]);
}
