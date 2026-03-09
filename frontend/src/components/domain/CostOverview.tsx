'use client';

import type { CostSummary } from '@/lib/types';
import Card from '@/components/ui/Card';
import { formatCost } from '@/lib/formatters';

interface CostOverviewProps {
  costSummary: CostSummary;
}

export default function CostOverview({ costSummary }: CostOverviewProps) {
  const totals = costSummary.totals_by_currency ?? [];

  return (
    <div className="space-y-4">
      <Card className="border-l-4 border-l-green-500">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-500">
            Total Monthly Cost
          </span>
          <div className="mt-1 flex flex-wrap items-baseline gap-3">
            {totals.length > 0 ? (
              totals.map((t) => (
                <span key={t.currency} className="text-3xl font-bold text-gray-900">
                  {formatCost(t.amount, t.currency)}
                </span>
              ))
            ) : (
              <span className="text-3xl font-bold text-gray-900">
                {formatCost(costSummary.total_monthly_cost)}
              </span>
            )}
          </div>
        </div>
      </Card>

      <Card title="Cost by Provider">
        {costSummary.by_provider.length === 0 ? (
          <p className="text-sm text-gray-500">No cost data available.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-2 font-medium text-gray-500">Provider</th>
                <th className="pb-2 text-right font-medium text-gray-500">
                  Servers
                </th>
                <th className="pb-2 text-right font-medium text-gray-500">
                  Monthly Cost
                </th>
              </tr>
            </thead>
            <tbody>
              {costSummary.by_provider.map((item, idx) => (
                <tr
                  key={`${item.provider_name}-${item.currency}-${idx}`}
                  className="border-b border-gray-100 last:border-b-0"
                >
                  <td className="py-2 font-medium text-gray-900">
                    {item.provider_name}
                  </td>
                  <td className="py-2 text-right text-gray-600">
                    {item.server_count}
                  </td>
                  <td className="py-2 text-right font-mono text-gray-900">
                    {formatCost(item.total_cost, item.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
