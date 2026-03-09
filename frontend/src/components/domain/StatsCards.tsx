'use client';

import type { DashboardStats } from '@/lib/types';
import Card from '@/components/ui/Card';
import { useCountUp } from '@/hooks/useCountUp';

interface StatsCardsProps {
  stats: DashboardStats;
}

interface StatCardProps {
  label: string;
  value: number;
  subtitle?: string;
  subtitleValue?: number;
  subtitleSuffix?: string;
  subtitleColor?: string;
  accentColor: string;
}

function StatCard({
  label,
  value,
  subtitleValue,
  subtitleSuffix,
  subtitleColor,
  accentColor,
}: StatCardProps) {
  const animatedValue = useCountUp(value);
  const animatedSubtitleValue = useCountUp(subtitleValue ?? 0);

  return (
    <Card className={`border-l-4 ${accentColor}`}>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <span className="mt-1 text-3xl font-bold text-gray-900">
          {animatedValue}
        </span>
        {subtitleValue !== undefined && subtitleSuffix && (
          <span
            className={`mt-1 text-sm font-medium ${subtitleColor ?? 'text-gray-500'}`}
          >
            {animatedSubtitleValue} {subtitleSuffix}
          </span>
        )}
      </div>
    </Card>
  );
}

export default function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        label="Total Servers"
        value={stats.total_servers}
        subtitleValue={stats.active_servers}
        subtitleSuffix="active"
        subtitleColor="text-green-600"
        accentColor="border-l-blue-500"
      />
      <StatCard
        label="Providers"
        value={stats.total_providers}
        accentColor="border-l-purple-500"
      />
      <StatCard
        label="Applications"
        value={stats.total_applications}
        accentColor="border-l-indigo-500"
      />
      <StatCard
        label="SSH Keys"
        value={stats.total_ssh_keys}
        accentColor="border-l-teal-500"
      />
      <StatCard
        label="Backups"
        value={stats.total_backups}
        subtitleValue={stats.failing_backups > 0 ? stats.failing_backups : undefined}
        subtitleSuffix="failing"
        subtitleColor={stats.failing_backups > 0 ? 'text-red-600' : undefined}
        accentColor="border-l-amber-500"
      />
    </div>
  );
}
