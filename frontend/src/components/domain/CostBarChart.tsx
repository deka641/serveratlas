'use client';

import type { CostByProvider, CurrencyTotal } from '@/lib/types';
import { formatCost } from '@/lib/formatters';

const COLORS = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-teal-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-emerald-500',
];

interface CostBarChartProps {
  byProvider: CostByProvider[];
  totals: CurrencyTotal[];
}

export default function CostBarChart({ byProvider, totals }: CostBarChartProps) {
  if (byProvider.length === 0) return null;

  const groupedByCurrency: Record<string, CostByProvider[]> = {};
  for (const item of byProvider) {
    const cur = item.currency || 'EUR';
    if (!groupedByCurrency[cur]) groupedByCurrency[cur] = [];
    groupedByCurrency[cur].push(item);
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedByCurrency)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([currency, items]) => {
          const maxCost = Math.max(...items.map((i) => i.total_cost));
          const total = totals.find((t) => t.currency === currency);

          return (
            <div key={currency}>
              <div className="mb-3 flex items-baseline justify-between">
                <h4 className="text-sm font-semibold text-gray-700">{currency}</h4>
                {total && (
                  <span className="text-lg font-bold text-gray-900">
                    {formatCost(total.amount, currency)}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {items
                  .sort((a, b) => b.total_cost - a.total_cost)
                  .map((item, idx) => {
                    const pct = maxCost > 0 ? (item.total_cost / maxCost) * 100 : 0;
                    const totalForCurrency = total?.amount || 1;
                    const share = ((item.total_cost / totalForCurrency) * 100).toFixed(0);

                    return (
                      <div key={`${item.provider_name}-${idx}`} className="flex items-center gap-3">
                        <span className="w-28 shrink-0 truncate text-sm text-gray-600">
                          {item.provider_name}
                        </span>
                        <div className="relative flex-1 h-6 rounded bg-gray-100">
                          <div
                            className={`h-full rounded ${COLORS[idx % COLORS.length]} transition-all`}
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                        <span className="w-32 shrink-0 text-right text-sm font-mono text-gray-700">
                          {formatCost(item.total_cost, currency)} ({share}%)
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        })}
    </div>
  );
}
