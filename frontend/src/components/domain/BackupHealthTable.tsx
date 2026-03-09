'use client';

import Link from 'next/link';
import type { RecentBackup, BackupStatus } from '@/lib/types';
import { formatDateTime } from '@/lib/formatters';
import Table, { Column } from '@/components/ui/Table';
import StatusBadge from '@/components/ui/StatusBadge';

interface BackupHealthTableProps {
  backups: RecentBackup[];
}

export default function BackupHealthTable({ backups }: BackupHealthTableProps) {
  const columns: Column<RecentBackup>[] = [
    {
      key: 'name',
      label: 'Backup',
      render: (b) => (
        <Link
          href={`/backups/${b.id}`}
          className="font-medium text-blue-600 hover:text-blue-800"
        >
          {b.name}
        </Link>
      ),
    },
    {
      key: 'source_server_name',
      label: 'Server',
      render: (b) => b.source_server_name ?? '\u2014',
    },
    {
      key: 'application_name',
      label: 'Application',
      render: (b) => b.application_name ?? '\u2014',
    },
    {
      key: 'last_run_status',
      label: 'Status',
      render: (b) => <StatusBadge status={b.last_run_status as BackupStatus} />,
    },
    {
      key: 'last_run_at',
      label: 'Last Run',
      render: (b) =>
        b.last_run_at ? formatDateTime(b.last_run_at) : 'Never',
    },
  ];

  return (
    <Table
      columns={columns}
      data={backups}
      emptyMessage="No recent backup activity."
    />
  );
}
