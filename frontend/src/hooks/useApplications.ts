'use client';
import { api } from '@/lib/api';
import { useData } from './useData';

export function useApplications(params?: { server_id?: number; status?: string }) {
  return useData(() => api.listApplications(params), [params?.server_id, params?.status]);
}

export function useApplication(id: number) {
  return useData(() => api.getApplication(id), [id]);
}
