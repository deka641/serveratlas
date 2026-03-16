'use client';

import { useState } from 'react';
import type { Tag } from '@/lib/types';
import Table, { Column } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface TagTableProps {
  tags: Tag[];
  serverCounts?: Record<number, number>;
  onEdit: (tag: Tag) => void;
  onDelete: (id: number) => void;
  selectable?: boolean;
  selectedIds?: Set<number>;
  onSelectionChange?: (ids: Set<number>) => void;
}

export default function TagTable({ tags, serverCounts, onEdit, onDelete, selectable, selectedIds, onSelectionChange }: TagTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);

  const columns: Column<Tag>[] = [
    {
      key: 'name',
      label: 'Tag',
      sortable: true,
      render: (tag) => (
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: tag.color }}
          />
          <span className="font-medium text-gray-900">{tag.name}</span>
        </div>
      ),
    },
    {
      key: 'color',
      label: 'Color',
      render: (tag) => (
        <span className="font-mono text-xs text-gray-500">{tag.color}</span>
      ),
    },
    {
      key: 'id',
      label: 'Servers',
      render: (tag) => (
        <span className="text-sm text-gray-600">
          {serverCounts?.[tag.id] ?? 0}
        </span>
      ),
    },
    {
      key: 'actions' as keyof Tag,
      label: 'Actions',
      render: (tag) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => onEdit(tag)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteTarget(tag)}
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
        data={tags}
        selectable={selectable}
        selectedIds={selectedIds}
        onSelectionChange={onSelectionChange}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Tag"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? It will be removed from all servers. This action cannot be undone.`}
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
