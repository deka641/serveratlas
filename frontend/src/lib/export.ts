interface CsvColumn<T> {
  key: keyof T;
  label: string;
}

function escapeCsvValue(value: unknown): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCsv<T>(data: T[], columns: CsvColumn<T>[], filename: string): void {
  const header = columns.map((c) => escapeCsvValue(c.label)).join(',');
  const rows = data.map((item) =>
    columns.map((c) => escapeCsvValue(item[c.key])).join(',')
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
