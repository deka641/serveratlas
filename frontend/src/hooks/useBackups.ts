'use client';
import { api } from '@/lib/api';
import { useData } from './useData';

export function useBackups(params?: { source_server_id?: number; application_id?: number; status?: string; search?: string }) {
  return useData(() => api.listBackups(params), [params?.source_server_id, params?.application_id, params?.status, params?.search]);
}

export function useBackup(id: number) {
  return useData(() => api.getBackup(id), [id]);
}
