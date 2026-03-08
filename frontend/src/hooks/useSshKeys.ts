'use client';
import { api } from '@/lib/api';
import { useData } from './useData';

export function useSshKeys() {
  return useData(() => api.listSshKeys());
}

export function useSshKey(id: number) {
  return useData(() => api.getSshKey(id), [id]);
}
