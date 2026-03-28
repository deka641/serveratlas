'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Tag } from '@/lib/types';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface TagPickerModalProps {
  open: boolean;
  onClose: () => void;
  serverIds: number[];
  onComplete: () => void;
}

export default function TagPickerModal({ open, onClose, serverIds, onComplete }: TagPickerModalProps) {
  const { addToast } = useToast();
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());
  const [action, setAction] = useState<'assign' | 'unassign'>('assign');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      api.listTags({ limit: 500 }).then((res) => setTags(res.items)).catch(() => {});
      setSelectedTagIds(new Set());
      setAction('assign');
    }
  }, [open]);

  function toggleTag(tagId: number) {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  }

  async function handleSubmit() {
    if (selectedTagIds.size === 0) return;
    setLoading(true);
    try {
      await api.batchAssignTags({
        server_ids: serverIds,
        tag_ids: Array.from(selectedTagIds),
        action,
      });
      addToast('success', `Tags ${action === 'assign' ? 'assigned to' : 'unassigned from'} ${serverIds.length} server(s)`);
      onComplete();
      onClose();
    } catch {
      addToast('error', 'Failed to update tags');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} title="Batch Tag Assignment" onClose={onClose} dismissable={false}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          {action === 'assign' ? 'Assign' : 'Unassign'} tags {action === 'assign' ? 'to' : 'from'}{' '}
          <span className="font-medium">{serverIds.length}</span> selected server(s).
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAction('assign')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${action === 'assign' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Assign
          </button>
          <button
            type="button"
            onClick={() => setAction('unassign')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${action === 'unassign' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Unassign
          </button>
        </div>

        <div className="max-h-60 overflow-y-auto rounded-md border border-gray-200 divide-y divide-gray-100">
          {tags.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No tags available.</p>
          ) : (
            tags.map((tag) => (
              <label key={tag.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedTagIds.has(tag.id)}
                  onChange={() => toggleTag(tag.id)}
                  className="rounded border-gray-300"
                />
                <span
                  className="inline-block h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="text-sm text-gray-900">{tag.name}</span>
              </label>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={selectedTagIds.size === 0 || loading}>
            {loading ? 'Applying...' : `${action === 'assign' ? 'Assign' : 'Unassign'} ${selectedTagIds.size} Tag(s)`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
