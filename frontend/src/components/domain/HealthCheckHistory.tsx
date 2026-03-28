'use client';

import { useState } from 'react';
import { useData } from '@/hooks/useData';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/formatters';
import Card from '@/components/ui/Card';

interface HealthCheckHistoryProps {
  serverId: number;
}

export default function HealthCheckHistory({ serverId }: HealthCheckHistoryProps) {
  const [days, setDays] = useState(30);
  const { data: stats } = useData(() => api.getUptimeStats(serverId, days), [serverId, days]);
  const { data: history } = useData(() => api.getHealthCheckHistory(serverId, { limit: 20 }), [serverId]);

  return (
    <Card title="Health Check History">
      <div className="space-y-4">
        {/* Uptime Stats */}
        {stats && (
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="relative h-14 w-14">
                <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke={stats.uptime_pct != null ? (stats.uptime_pct >= 99 ? '#22c55e' : stats.uptime_pct >= 90 ? '#eab308' : '#ef4444') : '#9ca3af'}
                    strokeWidth="3"
                    strokeDasharray={`${(stats.uptime_pct ?? 0)} 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                  {stats.uptime_pct != null ? `${stats.uptime_pct}%` : 'N/A'}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Uptime</p>
                <p className="text-xs text-gray-500">Last {days} days</p>
              </div>
            </div>
            <div className="text-sm">
              <p className="text-gray-600">
                <span className="font-medium">{stats.total_checks}</span> checks,{' '}
                <span className="font-medium text-green-600">{stats.healthy_checks}</span> healthy
              </p>
              {stats.avg_response_ms != null && (
                <p className="text-gray-500">Avg response: {stats.avg_response_ms}ms</p>
              )}
            </div>
            <div className="ml-auto">
              <select
                className="rounded border border-gray-300 px-2 py-1 text-xs"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              >
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>
          </div>
        )}

        {/* Recent Checks Table */}
        {history && history.length > 0 ? (
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b text-left text-xs text-gray-500">
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Response Time</th>
                  <th className="pb-2 font-medium">Checked At</th>
                </tr>
              </thead>
              <tbody>
                {history.map((check) => (
                  <tr key={check.id} className="border-b border-gray-100">
                    <td className="py-1.5">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            check.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
                          }`}
                        />
                        <span className={`text-xs font-medium ${
                          check.status === 'healthy' ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {check.status === 'healthy' ? 'Healthy' : 'Unhealthy'}
                        </span>
                      </span>
                    </td>
                    <td className="py-1.5 text-gray-600">
                      {check.response_time_ms != null ? `${check.response_time_ms}ms` : '\u2014'}
                    </td>
                    <td className="py-1.5 text-gray-500 text-xs">
                      {formatDateTime(check.checked_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No health check history yet. Run a health check to start tracking.</p>
        )}
      </div>
    </Card>
  );
}
