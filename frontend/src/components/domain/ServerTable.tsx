'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Server } from '@/lib/types';
import { formatCost, formatDateTime } from '@/lib/formatters';
import Table, { Column } from '@/components/ui/Table';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import CopyableText from '@/components/ui/CopyableText';

interface ServerTableProps {
  servers: Server[];
  onDelete: (id: number) => void;
  selectable?: boolean;
  selectedIds?: Set<number>;
  onSelectionChange?: (ids: Set<number>) => void;
}

export default function ServerTable({ servers, onDelete, selectable, selectedIds, onSelectionChange }: ServerTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<Server | null>(null);

  const columns: Column<Server>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (server) => (
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full ${
              server.last_check_status === 'healthy' ? 'bg-green-500' :
              server.last_check_status === 'unhealthy' ? 'bg-red-500' :
              'bg-gray-300'
            }`}
            title={`${
              server.last_check_status === 'healthy' ? 'Healthy' :
              server.last_check_status === 'unhealthy' ? 'Unhealthy' :
              'Unknown'
            }${server.response_time_ms != null ? ` (${server.response_time_ms}ms)` : ''}${
              server.last_checked_at ? ` \u2013 checked ${formatDateTime(server.last_checked_at)}` : ''
            }`}
            aria-label={
              server.last_check_status === 'healthy' ? 'Healthy' :
              server.last_check_status === 'unhealthy' ? 'Unhealthy' :
              'Unknown'
            }
          />
          <Link
            href={`/servers/${server.id}`}
            className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            {server.name}
          </Link>
        </div>
      ),
    },
    {
      key: 'ip_v4',
      label: 'IP',
      render: (server) =>
        server.ip_v4 ? (
          <CopyableText text={server.ip_v4} className="font-mono text-xs" />
        ) : (
          '\u2014'
        ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (server) => <StatusBadge status={server.status} />,
    },
    {
      key: 'tags',
      label: 'Tags',
      render: (server) => (
        <div className="flex flex-wrap gap-1">
          {(server.tags || []).map((tag) => (
            <span key={tag.id} className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: tag.color }}>
              {tag.name}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'last_check_status',
      label: 'Health',
      sortable: true,
      render: (server) => {
        const status = server.last_check_status ?? 'unknown';
        const color = status === 'healthy' ? 'text-green-700' : status === 'unhealthy' ? 'text-red-700' : 'text-gray-500';
        return <span className={`text-xs font-medium ${color}`}>{status === 'healthy' ? 'Healthy' : status === 'unhealthy' ? 'Unhealthy' : 'Unknown'}</span>;
      },
    },
    {
      key: 'provider_name',
      label: 'Provider',
      sortable: true,
      render: (server) => server.provider_name ?? '\u2014',
    },
    {
      key: 'location',
      label: 'Location',
      render: (server) => server.location ?? '\u2014',
    },
    {
      key: 'monthly_cost',
      label: 'Monthly Cost',
      sortable: true,
      render: (server) => formatCost(server.monthly_cost, server.cost_currency),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (server) => (
        <div className="flex items-center gap-2">
          <Link href={`/servers/${server.id}/edit`}>
            <Button variant="ghost" size="sm">
              Edit
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteTarget(server)}
            className="text-red-600 hover:text-red-800"
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Table
        columns={columns}
        data={servers}
        selectable={selectable}
        selectedIds={selectedIds}
        onSelectionChange={onSelectionChange}
        stickyFirstColumn
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Server"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) {
            onDelete(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
