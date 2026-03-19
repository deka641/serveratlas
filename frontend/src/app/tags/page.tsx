'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useTags } from '@/hooks/useTags';
import { useData } from '@/hooks/useData';
import { useDebounce } from '@/hooks/useDebounce';
import { useUrlState } from '@/hooks/useUrlState';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import PageContainer from '@/components/PageContainer';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import TagTable from '@/components/domain/TagTable';
import Pagination from '@/components/ui/Pagination';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import TableSkeleton from '@/components/ui/TableSkeleton';
import Card from '@/components/ui/Card';
import type { Tag, Server } from '@/lib/types';

const PAGE_SIZE = 100;

const TAG_COLORS = [
  '#6b7280', '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#6366f1', '#a855f7', '#ec4899',
];

function TagsPageContent() {
  const { addToast } = useToast();
  const [urlState, setUrlState] = useUrlState({
    search: '',
    page: '0',
  });
  const [searchTerm, setSearchTerm] = useState(urlState.search);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 300);
  const page = Number(urlState.page) || 0;

  // New tag form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');

  // Edit tag state
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  useEffect(() => {
    setUrlState({ search: debouncedSearch, page: '0' });
  }, [debouncedSearch]);

  const params = {
    search: debouncedSearch || undefined,
    skip: page * PAGE_SIZE,
    limit: PAGE_SIZE,
  };
  const { data: tags, total, loading, error, refetch } = useTags(params);

  // Load servers to compute tag→server counts
  const { data: serversResult } = useData(() => api.listServers({ limit: 500 }));
  const serverCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    (serversResult?.items ?? []).forEach((s: Server) => {
      s.tags?.forEach((t: Tag) => {
        counts[t.id] = (counts[t.id] || 0) + 1;
      });
    });
    return counts;
  }, [serversResult]);

  async function handleCreate() {
    if (!newTagName.trim()) return;
    try {
      await api.createTag({ name: newTagName.trim(), color: newTagColor });
      addToast('success', 'Tag created successfully');
      setNewTagName('');
      setNewTagColor('#3b82f6');
      setShowCreateForm(false);
      refetch();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create tag';
      addToast('error', msg);
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.deleteTag(id);
      addToast('success', 'Tag deleted successfully');
      refetch();
    } catch {
      addToast('error', 'Failed to delete tag');
    }
  }

  function handleStartEdit(tag: Tag) {
    setEditingTag(tag);
    setEditName(tag.name);
    setEditColor(tag.color);
  }

  async function handleSaveEdit() {
    if (!editingTag || !editName.trim()) return;
    try {
      await api.updateTag(editingTag.id, { name: editName.trim(), color: editColor });
      addToast('success', 'Tag updated successfully');
      setEditingTag(null);
      refetch();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to update tag';
      addToast('error', msg);
    }
  }

  async function handleBulkDelete() {
    try {
      await api.bulkDeleteTags(Array.from(selectedIds));
      addToast('success', `Deleted ${selectedIds.size} tag(s)`);
      setSelectedIds(new Set());
      setShowBulkDelete(false);
      refetch();
    } catch {
      addToast('error', 'Failed to delete tags');
    }
  }

  return (
    <PageContainer
      title="Tags"
      error={error}
      onRetry={refetch}
      action={
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button variant="danger" onClick={() => setShowBulkDelete(true)}>Delete ({selectedIds.size})</Button>
          )}
          <Button onClick={() => setShowCreateForm(true)}>Add Tag</Button>
        </div>
      }
    >
      {/* Create Tag Form */}
      {showCreateForm && (
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                label="Tag Name"
                placeholder="e.g. production, staging..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                required
              />
            </div>
            <div className="w-full sm:w-40">
              <label className="mb-1 block text-sm font-medium text-gray-700">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded border border-gray-300"
                />
                <div className="flex flex-wrap gap-1">
                  {TAG_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewTagColor(c)}
                      className={`h-5 w-5 rounded-full border-2 ${newTagColor === c ? 'border-gray-900' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate}>Create</Button>
              <Button variant="ghost" onClick={() => setShowCreateForm(false)}>Cancel</Button>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-sm text-gray-500">Preview: </span>
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: newTagColor }}
            >
              {newTagName || 'tag name'}
            </span>
          </div>
        </Card>
      )}

      {/* Edit Tag Modal */}
      {editingTag && (
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Edit Tag</h3>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                label="Tag Name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>
            <div className="w-full sm:w-40">
              <label className="mb-1 block text-sm font-medium text-gray-700">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded border border-gray-300"
                />
                <div className="flex flex-wrap gap-1">
                  {TAG_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setEditColor(c)}
                      className={`h-5 w-5 rounded-full border-2 ${editColor === c ? 'border-gray-900' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveEdit}>Save</Button>
              <Button variant="ghost" onClick={() => setEditingTag(null)}>Cancel</Button>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-sm text-gray-500">Preview: </span>
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: editColor }}
            >
              {editName || 'tag name'}
            </span>
          </div>
        </Card>
      )}

      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            placeholder="Search tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setUrlState({ search: '', page: '0' });
              setSearchTerm('');
            }}
          >
            Clear filters
            <span className="ml-1 rounded-full bg-gray-200 px-1.5 py-0.5 text-xs">
              {[searchTerm].filter(Boolean).length}
            </span>
          </Button>
        )}
      </div>

      {loading ? (
        <TableSkeleton columns={4} rows={8} />
      ) : tags && tags.length > 0 ? (
        <>
          <TagTable
            tags={tags}
            serverCounts={serverCounts}
            onEdit={handleStartEdit}
            onDelete={handleDelete}
            selectable
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={(p) => setUrlState({ page: String(p) })} />
        </>
      ) : (
        <EmptyState
          message={searchTerm ? 'No tags match your search' : 'No tags yet'}
          description={searchTerm ? 'Try a different search term.' : 'Get started by adding your first tag.'}
          actionLabel={searchTerm ? undefined : 'Add Tag'}
          onAction={searchTerm ? undefined : () => setShowCreateForm(true)}
        />
      )}

      <ConfirmDialog
        open={showBulkDelete}
        title="Delete Tags"
        message={`Are you sure you want to delete ${selectedIds.size} tag(s)? They will be removed from all servers. This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkDelete(false)}
      />
    </PageContainer>
  );
}

export default function TagsPage() {
  return (
    <Suspense>
      <TagsPageContent />
    </Suspense>
  );
}
