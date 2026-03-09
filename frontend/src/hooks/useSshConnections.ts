'use client';
import { api } from '@/lib/api';
import { useData } from './useData';

export function useSshConnections(params?: { search?: string }) {
  return useData(() => api.listSshConnections(params), [params?.search]);
}

export function useSshConnection(id: number) {
  return useData(() => api.getSshConnection(id), [id]);
}

export function useConnectionGraph() {
  return useData(() => api.getConnectionGraph());
}
