export interface CsvColumn<T> {
  key: keyof T;
  label: string;
  formatter?: (item: T) => string;
}

function escapeCsvValue(value: unknown): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function timestampedFilename(base: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}`;
  const ext = base.endsWith('.csv') ? '' : '.csv';
  const name = base.replace(/\.csv$/, '');
  return `${name}-${stamp}${ext || '.csv'}`;
}

export function exportToCsv<T>(data: T[], columns: CsvColumn<T>[], filename: string): void {
  const header = columns.map((c) => escapeCsvValue(c.label)).join(',');
  const rows = data.map((item) =>
    columns.map((c) => escapeCsvValue(c.formatter ? c.formatter(item) : item[c.key])).join(',')
  );
  const csv = [header, ...rows].join('\n');
  const bom = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = timestampedFilename(filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

export async function exportAllPaginatedCsv<T>(
  fetcher: (skip: number, limit: number) => Promise<PaginatedResponse<T>>,
  columns: CsvColumn<T>[],
  filename: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<number> {
  const PAGE = 500;
  const first = await fetcher(0, PAGE);
  const allItems = [...first.items];
  onProgress?.(allItems.length, first.total);

  while (allItems.length < first.total) {
    const next = await fetcher(allItems.length, PAGE);
    allItems.push(...next.items);
    onProgress?.(allItems.length, first.total);
  }

  exportToCsv(allItems, columns, filename);
  return allItems.length;
}
