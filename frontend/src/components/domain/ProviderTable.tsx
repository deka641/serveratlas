'use client';

import { useState } from 'react';
import Link from 'next/link';
import Table, { Column } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { api } from '@/lib/api';
import type { Provider } from '@/lib/types';

interface ProviderTableProps {
  providers: Provider[];
  onDelete: () => void;
}

export default function ProviderTable({ providers, onDelete }: ProviderTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<Provider | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteProvider(deleteTarget.id);
      setDeleteTarget(null);
      onDelete();
    } catch {
      setDeleting(false);
    }
  };

  const columns: Column<Provider>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (provider) => (
        <Link
          href={`/providers/${provider.id}`}
          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
        >
          {provider.name}
        </Link>
      ),
    },
    {
      key: 'website',
      label: 'Website',
      render: (provider) =>
        provider.website ? (
          <a
            href={provider.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            {provider.website}
          </a>
        ) : (
          <span className="text-gray-400">&mdash;</span>
        ),
    },
    {
      key: 'server_count',
      label: 'Server Count',
      sortable: true,
      render: (provider) => (
        <span className="text-gray-700">{provider.server_count}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (provider) => (
        <div className="flex items-center gap-2">
          <Link href={`/providers/${provider.id}/edit`}>
            <Button variant="secondary" size="sm">
              Edit
            </Button>
          </Link>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setDeleteTarget(provider)}
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
        data={providers as unknown as Record<string, unknown>[]}
        keyExtractor={(item) => (item as unknown as Provider).id}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Provider"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
