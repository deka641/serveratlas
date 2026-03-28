'use client';

import { useData } from '@/hooks/useData';
import { api } from '@/lib/api';
import Card from '@/components/ui/Card';
import { formatCost } from '@/lib/formatters';

export default function EfficiencyMetrics() {
  const { data: metrics, loading } = useData(() => api.getEfficiencyMetrics());

  if (loading || !metrics || metrics.length === 0) return null;

  return (
    <Card title="Resource Efficiency">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="pb-2 pr-4 font-medium text-gray-500">Provider</th>
              <th className="pb-2 pr-4 text-right font-medium text-gray-500">Servers</th>
              <th className="pb-2 pr-4 text-right font-medium text-gray-500">Cost/CPU</th>
              <th className="pb-2 pr-4 text-right font-medium text-gray-500">Cost/GB RAM</th>
              <th className="pb-2 pr-4 text-right font-medium text-gray-500">Cost/GB Disk</th>
              <th className="pb-2 text-right font-medium text-gray-500">Avg/Server</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m, i) => (
              <tr key={i} className="border-b border-gray-100 last:border-b-0">
                <td className="py-2 pr-4 font-medium text-gray-900">{m.provider_name}</td>
                <td className="py-2 pr-4 text-right text-gray-600">{m.server_count}</td>
                <td className="py-2 pr-4 text-right font-mono text-gray-700">
                  {m.cost_per_cpu != null ? formatCost(m.cost_per_cpu) : '\u2014'}
                </td>
                <td className="py-2 pr-4 text-right font-mono text-gray-700">
                  {m.cost_per_gb_ram != null ? formatCost(m.cost_per_gb_ram) : '\u2014'}
                </td>
                <td className="py-2 pr-4 text-right font-mono text-gray-700">
                  {m.cost_per_gb_disk != null ? formatCost(m.cost_per_gb_disk) : '\u2014'}
                </td>
                <td className="py-2 text-right font-mono text-gray-700">
                  {m.avg_cost_per_server != null ? formatCost(m.avg_cost_per_server) : '\u2014'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
