'use client';

interface BarItem {
  label: string;
  value: number;
  color?: string;
}

interface CSSBarChartProps {
  items: BarItem[];
  maxValue?: number;
  formatValue?: (v: number) => string;
  title?: string;
}

export default function CSSBarChart({ items, maxValue, formatValue, title }: CSSBarChartProps) {
  const max = maxValue ?? Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="space-y-1.5">
      {title && <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">{title}</h4>}
      {items.map((item, i) => {
        const pct = Math.max((item.value / max) * 100, 1);
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="w-28 shrink-0 truncate text-xs text-gray-600">{item.label}</span>
            <div className="relative flex-1 h-4 rounded bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded print-color-exact"
                style={{ width: `${pct}%`, backgroundColor: item.color ?? '#3b82f6' }}
              />
            </div>
            <span className="w-24 shrink-0 text-right text-xs font-mono text-gray-700">
              {formatValue ? formatValue(item.value) : item.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}
