'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import type { Server, Provider, Application } from '@/lib/types';

interface NavigationItem {
  id: string;
  name: string;
  href: string;
  subtitle?: string;
  group: string;
  icon: 'page' | 'server' | 'provider' | 'application';
}

const STATIC_PAGES: NavigationItem[] = [
  { id: 'page-dashboard', name: 'Dashboard', href: '/', group: 'Pages', icon: 'page' },
  { id: 'page-providers', name: 'Providers', href: '/providers', group: 'Pages', icon: 'page' },
  { id: 'page-servers', name: 'Servers', href: '/servers', group: 'Pages', icon: 'page' },
  { id: 'page-ssh-keys', name: 'SSH Keys', href: '/ssh-keys', group: 'Pages', icon: 'page' },
  { id: 'page-ssh-connections', name: 'SSH Connections', href: '/ssh-connections', group: 'Pages', icon: 'page' },
  { id: 'page-applications', name: 'Applications', href: '/applications', group: 'Pages', icon: 'page' },
  { id: 'page-backups', name: 'Backups', href: '/backups', group: 'Pages', icon: 'page' },
  { id: 'page-connectivity', name: 'Connectivity Map', href: '/connectivity', group: 'Pages', icon: 'page' },
  { id: 'page-tags', name: 'Tags', href: '/tags', group: 'Pages', icon: 'page' },
  { id: 'page-activities', name: 'Activities', href: '/activities', group: 'Pages', icon: 'page' },
  { id: 'page-report', name: 'Report', href: '/report', group: 'Pages', icon: 'page' },
];

function PageIcon() {
  return (
    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function ServerIcon() {
  return (
    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function ProviderIcon() {
  return (
    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function ApplicationIcon() {
  return (
    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function ResultIcon({ type }: { type: NavigationItem['icon'] }) {
  switch (type) {
    case 'server': return <ServerIcon />;
    case 'provider': return <ProviderIcon />;
    case 'application': return <ApplicationIcon />;
    default: return <PageIcon />;
  }
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [dynamicItems, setDynamicItems] = useState<NavigationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filter static pages by query
  const filteredPages = query
    ? STATIC_PAGES.filter((item) =>
        item.name.toLowerCase().includes(query.toLowerCase())
      )
    : STATIC_PAGES;

  // Combine all results
  const allResults = [...filteredPages, ...dynamicItems];

  // Group results by group
  const groups = allResults.reduce<Record<string, NavigationItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  const groupOrder = ['Pages', 'Servers', 'Providers', 'Applications'];
  const orderedGroups = groupOrder.filter((g) => groups[g]?.length);

  // Open/close with Ctrl+K / Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Reset state when opened/closed
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setDynamicItems([]);
      setLoading(false);
      // Focus input after mount
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Debounced API search when query >= 3 chars
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 3) {
      setDynamicItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const [serversRes, providersRes, applicationsRes] = await Promise.all([
          api.listServers({ search: query, limit: 5 }),
          api.listProviders({ search: query, limit: 5 }),
          api.listApplications({ search: query, limit: 5 }),
        ]);

        const serverItems: NavigationItem[] = serversRes.items.map((s: Server) => ({
          id: `server-${s.id}`,
          name: s.name,
          href: `/servers/${s.id}`,
          subtitle: s.ip_v4 || s.hostname || undefined,
          group: 'Servers',
          icon: 'server' as const,
        }));

        const providerItems: NavigationItem[] = providersRes.items.map((p: Provider) => ({
          id: `provider-${p.id}`,
          name: p.name,
          href: `/providers/${p.id}`,
          subtitle: `${p.server_count} server${p.server_count !== 1 ? 's' : ''}`,
          group: 'Providers',
          icon: 'provider' as const,
        }));

        const applicationItems: NavigationItem[] = applicationsRes.items.map((a: Application) => ({
          id: `application-${a.id}`,
          name: a.name,
          href: `/applications/${a.id}`,
          subtitle: a.server_name || undefined,
          group: 'Applications',
          icon: 'application' as const,
        }));

        setDynamicItems([...serverItems, ...providerItems, ...applicationItems]);
      } catch {
        // Silently ignore search errors
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [allResults.length]);

  // Navigate to result
  const navigateTo = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % allResults.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + allResults.length) % allResults.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (allResults[activeIndex]) {
          navigateTo(allResults[activeIndex].href);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    },
    [allResults, activeIndex, navigateTo]
  );

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  // Focus trap
  useEffect(() => {
    if (!open || !containerRef.current) return;

    const container = containerRef.current;
    const focusableSelector = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(focusableSelector)
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    container.addEventListener('keydown', handleTab);
    return () => container.removeEventListener('keydown', handleTab);
  }, [open]);

  if (!open) return null;

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative z-10 w-full max-w-lg rounded-xl bg-white shadow-2xl"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
          <SearchIcon />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, servers, providers, apps..."
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          {loading && (
            <svg className="h-4 w-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          <kbd className="hidden rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs text-gray-400 sm:inline-block">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto overscroll-contain px-2 py-2">
          {allResults.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              {query.length > 0 ? 'No results found.' : 'Start typing to search...'}
            </div>
          ) : (
            orderedGroups.map((groupName) => (
              <div key={groupName} className="mb-2 last:mb-0">
                <div className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {groupName}
                </div>
                {groups[groupName].map((item) => {
                  flatIndex++;
                  const idx = flatIndex;
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={item.id}
                      data-active={isActive}
                      onClick={() => navigateTo(item.href)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <ResultIcon type={item.icon} />
                      <div className="min-w-0 flex-1">
                        <div className={`truncate font-medium ${isActive ? 'text-blue-700' : 'text-gray-900'}`}>
                          {item.name}
                        </div>
                        {item.subtitle && (
                          <div className={`truncate text-xs ${isActive ? 'text-blue-500' : 'text-gray-500'}`}>
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                      {isActive && (
                        <svg className="h-4 w-4 flex-shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-gray-200 px-4 py-2 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-mono text-[10px]">&uarr;</kbd>
            <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-mono text-[10px]">&darr;</kbd>
            <span className="ml-0.5">Navigate</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-mono text-[10px]">&crarr;</kbd>
            <span className="ml-0.5">Open</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-mono text-[10px]">Esc</kbd>
            <span className="ml-0.5">Close</span>
          </span>
          <span className="ml-auto flex items-center gap-1">
            <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-mono text-[10px]">Ctrl+K</kbd>
          </span>
        </div>
      </div>
    </div>
  );
}
