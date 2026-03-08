'use client';
import { api } from '@/lib/api';
import { useData } from './useData';

export function useProviders() {
  return useData(() => api.listProviders());
}

export function useProvider(id: number) {
  return useData(() => api.getProvider(id), [id]);
}

export function useProviderServers(id: number) {
  return useData(() => api.getProviderServers(id), [id]);
}
