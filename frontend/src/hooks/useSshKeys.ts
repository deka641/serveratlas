'use client';
import { api } from '@/lib/api';
import { useData } from './useData';

export function useSshKeys(params?: { search?: string }) {
  return useData(() => api.listSshKeys(params), [params?.search]);
}

export function useSshKey(id: number) {
  return useData(() => api.getSshKey(id), [id]);
}
