'use client';

import { useState, useCallback, ReactNode } from 'react';

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
}

export default function Table<T extends object>({
  columns,
  data,
  onSort,
  keyExtractor,
  emptyMessage = 'No data available',
  className = '',
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

  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 font-medium text-gray-700 ${
                  col.sortable ? 'cursor-pointer select-none hover:bg-gray-100' : ''
                }`}
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
          {data.map((item, index) => (
            <tr
              key={getKey(item, index)}
              className="border-b border-gray-100 transition-colors hover:bg-gray-50"
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-gray-700">
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
                colSpan={columns.length}
                className="px-4 py-8 text-center text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
