'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export function useUrlState<T extends Record<string, string>>(
  defaults: T
): [T, (updates: Partial<T>) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const state = {} as T;
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const param = searchParams.get(key as string);
    state[key] = (param !== null ? param : defaults[key]) as T[keyof T];
  }

  const setState = useCallback(
    (updates: Partial<T>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === '' || value === defaults[key as keyof T]) {
          params.delete(key);
        } else {
          params.set(key, value as string);
        }
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? '?' + qs : ''}`, { scroll: false });
    },
    [searchParams, router, pathname, defaults]
  );

  return [state, setState];
}
