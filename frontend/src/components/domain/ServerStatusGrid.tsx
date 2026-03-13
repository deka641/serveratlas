'use client';

import Link from 'next/link';
import type { Server, ServerStatus } from '@/lib/types';
import StatusBadge from '@/components/ui/StatusBadge';

interface ServerStatusGridProps {
  servers: Server[];
}

const borderColorMap: Record<ServerStatus, string> = {
  active: 'border-l-green-500',
  inactive: 'border-l-gray-400',
  maintenance: 'border-l-yellow-500',
  decommissioned: 'border-l-red-500',
};

const needsAttention = (status: ServerStatus) =>
  status === 'maintenance' || status === 'decommissioned';

export default function ServerStatusGrid({ servers }: ServerStatusGridProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {servers.map((server, index) => (
        <Link
          key={server.id}
          href={`/servers/${server.id}`}
          className={`block rounded-lg border border-gray-200 border-l-4 bg-white p-4 shadow-sm transition-shadow hover:shadow-md animate-fadeInUp ${borderColorMap[server.status]} ${needsAttention(server.status) ? 'animate-attention-pulse' : ''}`}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-block h-2 w-2 flex-shrink-0 rounded-full ${
                    server.last_check_status === 'healthy' ? 'bg-green-500' :
                    server.last_check_status === 'unhealthy' ? 'bg-red-500' :
                    'bg-gray-300'
                  }`}
                  title={`Health: ${server.last_check_status ?? 'unknown'}`}
                />
                <h4 className="truncate text-sm font-semibold text-gray-900">
                  {server.name}
                </h4>
              </div>
              <p className="mt-1 font-mono text-xs text-gray-500">
                {server.ip_v4 ?? 'No IP'}
              </p>
            </div>
            <StatusBadge status={server.status} />
          </div>
        </Link>
      ))}
    </div>
  );
}
