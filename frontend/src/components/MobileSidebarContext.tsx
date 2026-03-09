'use client';

import { createContext, useContext } from 'react';

export const MobileSidebarContext = createContext<(() => void) | null>(null);

export function useMobileSidebar() {
  return useContext(MobileSidebarContext);
}
