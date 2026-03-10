'use client';

import type { DashboardStats, BackupCoverage } from '@/lib/types';
import Card from '@/components/ui/Card';
import { useCountUp } from '@/hooks/useCountUp';

interface StatsCardsProps {
  stats: DashboardStats;
  backupCoverage?: BackupCoverage;
}

interface StatCardProps {
  label: string;
  value: number;
  subtitle?: string;
  subtitleValue?: number;
  subtitleSuffix?: string;
  subtitleColor?: string;
  accentColor: string;
  animIndex?: number;
}

function StatCard({
  label,
  value,
  subtitleValue,
  subtitleSuffix,
  subtitleColor,
  accentColor,
  animIndex = 0,
}: StatCardProps) {
  const animatedValue = useCountUp(value);
  const animatedSubtitleValue = useCountUp(subtitleValue ?? 0);

  return (
    <Card className={`border-l-4 ${accentColor} animate-fadeInUp`} style={{ animationDelay: `${animIndex * 75}ms` }}>
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

export default function StatsCards({ stats, backupCoverage }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        label="Total Servers"
        value={stats.total_servers}
        subtitleValue={stats.active_servers}
        subtitleSuffix="active"
        subtitleColor="text-green-600"
        accentColor="border-l-blue-500"
        animIndex={0}
      />
      <StatCard
        label="Providers"
        value={stats.total_providers}
        accentColor="border-l-purple-500"
        animIndex={1}
      />
      <StatCard
        label="Applications"
        value={stats.total_applications}
        accentColor="border-l-indigo-500"
        animIndex={2}
      />
      <StatCard
        label="SSH Keys"
        value={stats.total_ssh_keys}
        accentColor="border-l-teal-500"
        animIndex={3}
      />
      <StatCard
        label="Backups"
        value={stats.total_backups}
        subtitleValue={stats.failing_backups > 0 ? stats.failing_backups : undefined}
        subtitleSuffix="failing"
        subtitleColor={stats.failing_backups > 0 ? 'text-red-600' : undefined}
        accentColor="border-l-amber-500"
        animIndex={4}
      />
      {backupCoverage && (
        <StatCard
          label="Backup Coverage"
          value={backupCoverage.covered_applications}
          subtitleValue={backupCoverage.total_applications}
          subtitleSuffix="apps total"
          subtitleColor={
            backupCoverage.covered_applications < backupCoverage.total_applications
              ? 'text-red-600'
              : 'text-green-600'
          }
          accentColor={
            backupCoverage.covered_applications < backupCoverage.total_applications
              ? 'border-l-red-500'
              : 'border-l-green-500'
          }
          animIndex={5}
        />
      )}
    </div>
  );
}
