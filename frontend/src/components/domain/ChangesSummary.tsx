'use client';

interface ChangesSummaryProps {
  changes: string | null;
}

interface ChangeValue {
  old?: string;
  new?: string;
}

function tryParseJson(str: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(str);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // not JSON
  }
  return null;
}

function formatFieldName(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function isChangeValue(val: unknown): val is ChangeValue {
  return typeof val === 'object' && val !== null && ('old' in val || 'new' in val);
}

export default function ChangesSummary({ changes }: ChangesSummaryProps) {
  if (!changes) return <span className="text-gray-400">&mdash;</span>;

  const parsed = tryParseJson(changes);

  if (!parsed) {
    return (
      <span className="text-gray-500 text-xs" title={changes}>
        {changes.length > 100 ? changes.slice(0, 100) + '\u2026' : changes}
      </span>
    );
  }

  const entries = Object.entries(parsed);
  if (entries.length === 0) {
    return <span className="text-gray-400">&mdash;</span>;
  }

  return (
    <div className="space-y-0.5">
      {entries.map(([key, value]) => (
        <div key={key} className="text-xs">
          <span className="font-medium text-gray-600">{formatFieldName(key)}:</span>{' '}
          {isChangeValue(value) ? (
            <span className="text-gray-500">
              <span className="line-through text-gray-400">{value.old ?? '\u2014'}</span>
              {' \u2192 '}
              <span>{value.new ?? '\u2014'}</span>
            </span>
          ) : (
            <span className="text-gray-500">{String(value ?? '\u2014')}</span>
          )}
        </div>
      ))}
    </div>
  );
}
