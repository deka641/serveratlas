'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Application } from '@/lib/types';
import Table, { Column } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface ApplicationTableProps {
  applications: Application[];
  onDelete: (id: number) => void;
}

export default function ApplicationTable({ applications, onDelete }: ApplicationTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<Application | null>(null);

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (row) => {
        const app = row as unknown as Application;
        return (
          <Link href={`/applications/${app.id}`} className="font-medium text-blue-600 hover:text-blue-800">
            {app.name}
          </Link>
        );
      },
    },
    {
      key: 'server_name',
      label: 'Server',
      render: (row) => {
        const app = row as unknown as Application;
        return app.server_id ? (
          <Link href={`/servers/${app.server_id}`} className="text-blue-600 hover:text-blue-800">
            {app.server_name || `Server #${app.server_id}`}
          </Link>
        ) : (
          '\u2014'
        );
      },
    },
    {
      key: 'app_type',
      label: 'Type',
      render: (row) => {
        const app = row as unknown as Application;
        return app.app_type || '\u2014';
      },
    },
    {
      key: 'port',
      label: 'Port',
      render: (row) => {
        const app = row as unknown as Application;
        return app.port !== null ? <span className="font-mono text-sm">{app.port}</span> : '\u2014';
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => {
        const app = row as unknown as Application;
        return <StatusBadge status={app.status} />;
      },
    },
    {
      key: 'url',
      label: 'URL',
      render: (row) => {
        const app = row as unknown as Application;
        return app.url ? (
          <a
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800"
          >
            {app.url}
          </a>
        ) : (
          '\u2014'
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => {
        const app = row as unknown as Application;
        return (
          <div className="flex items-center gap-2">
            <Link href={`/applications/${app.id}/edit`}>
              <Button variant="ghost" size="sm">Edit</Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(app)}>
              Delete
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <Table columns={columns} data={applications as unknown as Record<string, unknown>[]} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Application"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={() => {
          if (deleteTarget) onDelete(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
