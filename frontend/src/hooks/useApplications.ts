'use client';
import { api } from '@/lib/api';
import { useData } from './useData';

export function useApplications(params?: { server_id?: number; status?: string; search?: string }) {
  return useData(() => api.listApplications(params), [params?.server_id, params?.status, params?.search]);
}

export function useApplication(id: number) {
  return useData(() => api.getApplication(id), [id]);
}
