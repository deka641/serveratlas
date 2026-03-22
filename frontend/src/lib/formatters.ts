export function formatCost(amount: number | string | null | undefined, currency?: string | null): string {
  if (amount == null) return '\u2014';
  return `${Number(amount).toFixed(2)} ${currency ?? 'EUR'}`;
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '\u2014';
  const formatted = new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  });
  return `${formatted} (UTC)`;
}

export function formatRAM(mb: number | null | undefined): string {
  if (mb == null) return '\u2014';
  if (mb >= 1024 && mb % 1024 === 0) return `${mb / 1024} GB`;
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
}

export function formatDisk(gb: number | null | undefined): string {
  if (gb == null) return '\u2014';
  if (gb >= 1000 && gb % 1000 === 0) return `${gb / 1000} TB`;
  return `${gb} GB`;
}
