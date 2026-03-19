'use client';

import { useState, useCallback, useMemo, useRef, useEffect, ReactNode } from 'react';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => ReactNode;
}

type SortDirection = 'asc' | 'desc';

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  onSort?: (key: string, direction: SortDirection) => void;
  keyExtractor?: (item: T) => string | number;
  emptyMessage?: string;
  className?: string;
  rowClassName?: (item: T) => string | undefined;
  selectable?: boolean;
  selectedIds?: Set<number>;
  onSelectionChange?: (ids: Set<number>) => void;
  stickyFirstColumn?: boolean;
}

export default function Table<T extends object>({
  columns,
  data,
  onSort,
  keyExtractor,
  emptyMessage = 'No data available',
  className = '',
  rowClassName,
  selectable,
  selectedIds,
  onSelectionChange,
  stickyFirstColumn,
}: TableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = useCallback(
    (key: string) => {
      let direction: SortDirection = 'asc';
      if (sortColumn === key && sortDirection === 'asc') {
        direction = 'desc';
      }
      setSortColumn(key);
      setSortDirection(direction);
      onSort?.(key, direction);
    },
    [sortColumn, sortDirection, onSort]
  );

  const sortedData = useMemo(() => {
    if (!sortColumn) return data;
    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortColumn];
      const bVal = (b as Record<string, unknown>)[sortColumn];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      let cmp = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal).localeCompare(String(bVal));
      }
      return sortDirection === 'desc' ? -cmp : cmp;
    });
  }, [data, sortColumn, sortDirection]);

  const getKey = (item: T, index: number): string | number => {
    if (keyExtractor) return keyExtractor(item);
    if ('id' in item && (typeof (item as Record<string, unknown>).id === 'string' || typeof (item as Record<string, unknown>).id === 'number')) {
      return (item as Record<string, unknown>).id as string | number;
    }
    return index;
  };

  const getCellValue = (item: T, key: string): ReactNode => {
    const value = (item as Record<string, unknown>)[key];
    if (value === null || value === undefined) return '\u2014';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    return '\u2014';
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => {
      const hasOverflow = el.scrollWidth > el.clientWidth;
      setCanScrollRight(hasOverflow && el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
      setCanScrollLeft(hasOverflow && el.scrollLeft > 1);
    };
    check();
    el.addEventListener('scroll', check);
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => { el.removeEventListener('scroll', check); observer.disconnect(); };
  }, [data]);

  const stickyClass = stickyFirstColumn ? 'sticky left-0 z-10 bg-white' : '';
  const stickyHeaderClass = stickyFirstColumn ? 'sticky left-0 z-20 bg-gray-50' : '';

  return (
    <div className={`relative w-full ${className}`}>
      {canScrollLeft && (
        <div className="pointer-events-none absolute left-0 top-0 h-full w-8 z-30 bg-gradient-to-r from-white to-transparent" />
      )}
      <div ref={scrollRef} className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {selectable && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={data.length > 0 && data.every((item, idx) => selectedIds?.has(getKey(item, idx) as number))}
                    onChange={(e) => {
                      if (!onSelectionChange) return;
                      const newSet = new Set(selectedIds);
                      if (e.target.checked) {
                        data.forEach((item, idx) => newSet.add(getKey(item, idx) as number));
                      } else {
                        data.forEach((item, idx) => newSet.delete(getKey(item, idx) as number));
                      }
                      onSelectionChange(newSet);
                    }}
                  />
                </th>
              )}
              {columns.map((col, colIdx) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 font-medium text-gray-700 ${
                    col.sortable ? 'cursor-pointer select-none hover:bg-gray-100' : ''
                  } ${colIdx === 0 ? stickyHeaderClass : ''}`}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortColumn === col.key && (
                      <svg
                        className={`h-4 w-4 transition-transform ${
                          sortDirection === 'desc' ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                    {col.sortable && sortColumn !== col.key && (
                      <svg
                        className="h-4 w-4 text-gray-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((item, index) => (
              <tr
                key={getKey(item, index)}
                className={`border-b border-gray-100 transition-colors hover:bg-gray-50 ${rowClassName?.(item) ?? ''}`}
              >
                {selectable && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={selectedIds?.has(getKey(item, index) as number) ?? false}
                      onChange={(e) => {
                        if (!onSelectionChange) return;
                        const newSet = new Set(selectedIds);
                        const id = getKey(item, index) as number;
                        if (e.target.checked) {
                          newSet.add(id);
                        } else {
                          newSet.delete(id);
                        }
                        onSelectionChange(newSet);
                      }}
                    />
                  </td>
                )}
                {columns.map((col, colIdx) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-gray-700 ${colIdx === 0 ? stickyClass : ''}`}
                  >
                    {col.render
                      ? col.render(item)
                      : getCellValue(item, col.key)}
                  </td>
                ))}
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {canScrollRight && (
        <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-white to-transparent" />
      )}
    </div>
  );
}
