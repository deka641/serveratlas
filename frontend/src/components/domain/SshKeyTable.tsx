'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { SshKey } from '@/lib/types';
import Table, { Column } from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface SshKeyTableProps {
  keys: SshKey[];
  onDelete: (id: number) => void;
}

export default function SshKeyTable({ keys, onDelete }: SshKeyTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<SshKey | null>(null);

  const keyTypeColor = (type: string | null) => {
    switch (type) {
      case 'ed25519': return 'green' as const;
      case 'rsa': return 'blue' as const;
      case 'ecdsa': return 'purple' as const;
      case 'dsa': return 'yellow' as const;
      default: return 'gray' as const;
    }
  };

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (row) => {
        const key = row as unknown as SshKey;
        return (
          <Link href={`/ssh-keys/${key.id}`} className="font-medium text-blue-600 hover:text-blue-800">
            {key.name}
          </Link>
        );
      },
    },
    {
      key: 'key_type',
      label: 'Key Type',
      render: (row) => {
        const key = row as unknown as SshKey;
        return key.key_type ? (
          <Badge color={keyTypeColor(key.key_type)}>{key.key_type.toUpperCase()}</Badge>
        ) : (
          '\u2014'
        );
      },
    },
    {
      key: 'fingerprint',
      label: 'Fingerprint',
      render: (row) => {
        const key = row as unknown as SshKey;
        return key.fingerprint ? (
          <span className="font-mono text-xs" title={key.fingerprint}>
            {key.fingerprint.length > 32 ? key.fingerprint.slice(0, 32) + '...' : key.fingerprint}
          </span>
        ) : (
          '\u2014'
        );
      },
    },
    {
      key: 'comment',
      label: 'Comment',
      render: (row) => {
        const key = row as unknown as SshKey;
        return key.comment || '\u2014';
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => {
        const key = row as unknown as SshKey;
        return (
          <div className="flex items-center gap-2">
            <Link href={`/ssh-keys/${key.id}/edit`}>
              <Button variant="ghost" size="sm">Edit</Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(key)}>
              Delete
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <Table columns={columns} data={keys as unknown as Record<string, unknown>[]} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete SSH Key"
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
