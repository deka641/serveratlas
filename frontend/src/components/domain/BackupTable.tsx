'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Backup } from '@/lib/types';
import { formatDateTime } from '@/lib/formatters';
import Table, { Column } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import StatusBadge from '@/components/ui/StatusBadge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface BackupTableProps {
  backups: Backup[];
  onDelete: (id: number) => void;
  selectable?: boolean;
  selectedIds?: Set<number>;
  onSelectionChange?: (ids: Set<number>) => void;
}

export default function BackupTable({ backups, onDelete, selectable, selectedIds, onSelectionChange }: BackupTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<Backup | null>(null);

  const columns: Column<Backup>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (backup) => (
        <Link href={`/backups/${backup.id}`} className="font-medium text-blue-600 hover:text-blue-800 hover:underline">
          {backup.name}
        </Link>
      ),
    },
    {
      key: 'source_server_name',
      label: 'Source Server',
      render: (backup) =>
        backup.source_server_id ? (
          <Link href={`/servers/${backup.source_server_id}`} className="text-blue-600 hover:text-blue-800">
            {backup.source_server_name || `Server #${backup.source_server_id}`}
          </Link>
        ) : (
          '\u2014'
        ),
    },
    {
      key: 'target_server_name',
      label: 'Target Server',
      render: (backup) =>
        backup.target_server_id ? (
          <Link href={`/servers/${backup.target_server_id}`} className="text-blue-600 hover:text-blue-800">
            {backup.target_server_name || `Server #${backup.target_server_id}`}
          </Link>
        ) : (
          '\u2014'
        ),
    },
    {
      key: 'application_name',
      label: 'Application',
      render: (backup) =>
        backup.application_id ? (
          <Link href={`/applications/${backup.application_id}`} className="text-blue-600 hover:text-blue-800">
            {backup.application_name || `App #${backup.application_id}`}
          </Link>
        ) : (
          '\u2014'
        ),
    },
    {
      key: 'frequency',
      label: 'Frequency',
      render: (backup) => (
        <Badge>{backup.frequency.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</Badge>
      ),
    },
    {
      key: 'last_run_status',
      label: 'Status',
      render: (backup) => <StatusBadge status={backup.last_run_status} />,
    },
    {
      key: 'last_run_at',
      label: 'Last Run',
      render: (backup) =>
        backup.last_run_at ? formatDateTime(backup.last_run_at) : '\u2014',
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (backup) => (
        <div className="flex items-center gap-2">
          <Link href={`/backups/${backup.id}/edit`}>
            <Button variant="ghost" size="sm">Edit</Button>
          </Link>
          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800" onClick={() => setDeleteTarget(backup)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Table columns={columns} data={backups} selectable={selectable} selectedIds={selectedIds} onSelectionChange={onSelectionChange} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Backup"
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
