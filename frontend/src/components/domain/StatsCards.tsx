'use client';

import type { DashboardStats } from '@/lib/types';
import Card from '@/components/ui/Card';

interface StatsCardsProps {
  stats: DashboardStats;
}

interface StatCardData {
  label: string;
  value: number;
  subtitle?: string;
  subtitleColor?: string;
  accentColor: string;
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const cards: StatCardData[] = [
    {
      label: 'Total Servers',
      value: stats.total_servers,
      subtitle: `${stats.active_servers} active`,
      subtitleColor: 'text-green-600',
      accentColor: 'border-l-blue-500',
    },
    {
      label: 'Providers',
      value: stats.total_providers,
      accentColor: 'border-l-purple-500',
    },
    {
      label: 'Applications',
      value: stats.total_applications,
      accentColor: 'border-l-indigo-500',
    },
    {
      label: 'SSH Keys',
      value: stats.total_ssh_keys,
      accentColor: 'border-l-teal-500',
    },
    {
      label: 'Backups',
      value: stats.total_backups,
      subtitle:
        stats.failing_backups > 0
          ? `${stats.failing_backups} failing`
          : undefined,
      subtitleColor: stats.failing_backups > 0 ? 'text-red-600' : undefined,
      accentColor: 'border-l-amber-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.label} className={`border-l-4 ${card.accentColor}`}>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-500">
              {card.label}
            </span>
            <span className="mt-1 text-3xl font-bold text-gray-900">
              {card.value}
            </span>
            {card.subtitle && (
              <span
                className={`mt-1 text-sm font-medium ${card.subtitleColor ?? 'text-gray-500'}`}
              >
                {card.subtitle}
              </span>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
