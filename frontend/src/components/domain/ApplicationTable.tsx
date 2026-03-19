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
  selectable?: boolean;
  selectedIds?: Set<number>;
  onSelectionChange?: (ids: Set<number>) => void;
}

export default function ApplicationTable({ applications, onDelete, selectable, selectedIds, onSelectionChange }: ApplicationTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<Application | null>(null);

  const columns: Column<Application>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (app) => (
        <Link href={`/applications/${app.id}`} className="font-medium text-blue-600 hover:text-blue-800 hover:underline">
          {app.name}
        </Link>
      ),
    },
    {
      key: 'server_name',
      label: 'Server',
      render: (app) =>
        app.server_id ? (
          <Link href={`/servers/${app.server_id}`} className="text-blue-600 hover:text-blue-800">
            {app.server_name || `Server #${app.server_id}`}
          </Link>
        ) : (
          '\u2014'
        ),
    },
    {
      key: 'app_type',
      label: 'Type',
      render: (app) => app.app_type || '\u2014',
    },
    {
      key: 'port',
      label: 'Port',
      render: (app) =>
        app.port !== null ? <span className="font-mono text-sm">{app.port}</span> : '\u2014',
    },
    {
      key: 'status',
      label: 'Status',
      render: (app) => <StatusBadge status={app.status} />,
    },
    {
      key: 'url',
      label: 'URL',
      render: (app) =>
        app.url ? (
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
        ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (app) => (
        <div className="flex items-center gap-2">
          <Link href={`/applications/${app.id}/edit`}>
            <Button variant="ghost" size="sm">Edit</Button>
          </Link>
          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800" onClick={() => setDeleteTarget(app)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Table columns={columns} data={applications} selectable={selectable} selectedIds={selectedIds} onSelectionChange={onSelectionChange} stickyFirstColumn />
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
