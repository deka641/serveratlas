'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Server } from '@/lib/types';
import Table, { Column } from '@/components/ui/Table';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface ServerTableProps {
  servers: Server[];
  onDelete: (id: number) => void;
}

export default function ServerTable({ servers, onDelete }: ServerTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<Server | null>(null);

  const columns: Column<Server>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (server) => (
        <Link
          href={`/servers/${server.id}`}
          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
        >
          {server.name}
        </Link>
      ),
    },
    {
      key: 'ip_v4',
      label: 'IP',
      render: (server) => (
        <span className="font-mono text-xs">{server.ip_v4 ?? '\u2014'}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (server) => <StatusBadge status={server.status} />,
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
      render: (server) =>
        server.monthly_cost != null
          ? `${Number(server.monthly_cost).toFixed(2)} ${server.cost_currency ?? 'EUR'}`
          : '\u2014',
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
      <Table columns={columns} data={servers} />
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
