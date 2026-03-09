'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { SshConnection } from '@/lib/types';
import Table, { Column } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface SshConnectionTableProps {
  connections: SshConnection[];
  onDelete: (id: number) => void;
}

export default function SshConnectionTable({ connections, onDelete }: SshConnectionTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<SshConnection | null>(null);

  const columns: Column<SshConnection>[] = [
    {
      key: 'route',
      label: 'Source \u2192 Target',
      render: (conn) => (
        <div className="flex items-center gap-1">
          <Link
            href={`/servers/${conn.source_server_id}`}
            className="font-medium text-blue-600 hover:text-blue-800"
          >
            {conn.source_server_name || `Server #${conn.source_server_id}`}
          </Link>
          <span className="text-gray-400">{'\u2192'}</span>
          <Link
            href={`/servers/${conn.target_server_id}`}
            className="font-medium text-blue-600 hover:text-blue-800"
          >
            {conn.target_server_name || `Server #${conn.target_server_id}`}
          </Link>
        </div>
      ),
    },
    {
      key: 'ssh_user',
      label: 'SSH User',
      render: (conn) =>
        conn.ssh_user ? (
          <span className="font-mono text-sm">{conn.ssh_user}</span>
        ) : '\u2014',
    },
    {
      key: 'ssh_port',
      label: 'Port',
      render: (conn) => <span className="font-mono text-sm">{conn.ssh_port}</span>,
    },
    {
      key: 'purpose',
      label: 'Purpose',
      render: (conn) => conn.purpose || '\u2014',
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (conn) => (
        <div className="flex items-center gap-2">
          <Link href={`/ssh-connections/${conn.id}/edit`}>
            <Button variant="ghost" size="sm">Edit</Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(conn)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Table columns={columns} data={connections} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete SSH Connection"
        message="Are you sure you want to delete this connection? This action cannot be undone."
        onConfirm={() => {
          if (deleteTarget) onDelete(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
