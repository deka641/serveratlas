'use client';

import { useState, Suspense } from 'react';
import { useData } from '@/hooks/useData';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import PageContainer from '@/components/PageContainer';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import TableSkeleton from '@/components/ui/TableSkeleton';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import type { Webhook } from '@/lib/types';
import { formatDateTime } from '@/lib/formatters';

const AVAILABLE_EVENTS = [
  'server.created', 'server.updated', 'server.deleted',
  'application.created', 'application.updated', 'application.deleted',
  'backup.created', 'backup.updated', 'backup.deleted',
  'provider.created', 'provider.updated', 'provider.deleted',
  'health_check.failed', 'health_check.recovered',
];

function WebhooksPageContent() {
  const { addToast } = useToast();
  const { data: webhooks, loading, error, refetch } = useData<Webhook[]>(() => api.listWebhooks());

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formEvents, setFormEvents] = useState<string[]>([]);
  const [formSecret, setFormSecret] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editEvents, setEditEvents] = useState<string[]>([]);
  const [editSecret, setEditSecret] = useState('');
  const [editActive, setEditActive] = useState(true);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Webhook | null>(null);

  // Test state
  const [testingId, setTestingId] = useState<number | null>(null);

  function resetCreateForm() {
    setFormName('');
    setFormUrl('');
    setFormEvents([]);
    setFormSecret('');
    setFormActive(true);
    setShowCreateForm(false);
  }

  async function handleCreate() {
    if (!formName.trim() || !formUrl.trim() || formEvents.length === 0) {
      addToast('error', 'Name, URL, and at least one event are required.');
      return;
    }
    setSaving(true);
    try {
      await api.createWebhook({
        name: formName.trim(),
        url: formUrl.trim(),
        events: formEvents.join(','),
        secret: formSecret.trim() || null,
        is_active: formActive,
      });
      addToast('success', 'Webhook created successfully');
      resetCreateForm();
      refetch();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create webhook';
      addToast('error', msg);
    } finally {
      setSaving(false);
    }
  }

  function handleStartEdit(wh: Webhook) {
    setEditingWebhook(wh);
    setEditName(wh.name);
    setEditUrl(wh.url);
    setEditEvents(wh.events.split(',').map((e) => e.trim()).filter(Boolean));
    setEditSecret(wh.secret || '');
    setEditActive(wh.is_active);
  }

  async function handleSaveEdit() {
    if (!editingWebhook || !editName.trim() || !editUrl.trim() || editEvents.length === 0) {
      addToast('error', 'Name, URL, and at least one event are required.');
      return;
    }
    setSaving(true);
    try {
      await api.updateWebhook(editingWebhook.id, {
        name: editName.trim(),
        url: editUrl.trim(),
        events: editEvents.join(','),
        secret: editSecret.trim() || null,
        is_active: editActive,
      });
      addToast('success', 'Webhook updated successfully');
      setEditingWebhook(null);
      refetch();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to update webhook';
      addToast('error', msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await api.deleteWebhook(deleteTarget.id);
      addToast('success', 'Webhook deleted successfully');
      setDeleteTarget(null);
      refetch();
    } catch {
      addToast('error', 'Failed to delete webhook');
    }
  }

  async function handleTest(wh: Webhook) {
    setTestingId(wh.id);
    try {
      const result = await api.testWebhook(wh.id);
      if (result.status === 'sent') {
        addToast('success', `Test webhook sent to ${wh.url}`);
      } else {
        addToast('error', 'Webhook test failed');
      }
    } catch {
      addToast('error', 'Failed to send test webhook');
    } finally {
      setTestingId(null);
    }
  }

  function toggleEvent(events: string[], setEvents: (e: string[]) => void, event: string) {
    if (events.includes(event)) {
      setEvents(events.filter((e) => e !== event));
    } else {
      setEvents([...events, event]);
    }
  }

  function renderEventPicker(events: string[], setEvents: (e: string[]) => void) {
    return (
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Events<span className="ml-0.5 text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_EVENTS.map((event) => (
            <button
              key={event}
              type="button"
              onClick={() => toggleEvent(events, setEvents, event)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                events.includes(event)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {event}
            </button>
          ))}
        </div>
        <div className="mt-1 flex gap-2">
          <button
            type="button"
            onClick={() => setEvents([...AVAILABLE_EVENTS])}
            className="text-xs text-blue-600 hover:underline"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => setEvents([])}
            className="text-xs text-gray-500 hover:underline"
          >
            Clear
          </button>
        </div>
      </div>
    );
  }

  return (
    <PageContainer
      title="Webhooks"
      error={error}
      onRetry={refetch}
      action={
        <Button onClick={() => setShowCreateForm(true)}>Add Webhook</Button>
      }
    >
      {/* Create Webhook Form */}
      {showCreateForm && (
        <Card className="mb-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">New Webhook</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Name"
                placeholder="e.g. Slack Notifications"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
              />
              <Input
                label="URL"
                placeholder="https://hooks.example.com/..."
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                required
              />
            </div>
            {renderEventPicker(formEvents, setFormEvents)}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Secret (optional)"
                placeholder="HMAC signing secret"
                value={formSecret}
                onChange={(e) => setFormSecret(e.target.value)}
                type="password"
              />
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Active
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} loading={saving}>Create</Button>
              <Button variant="ghost" onClick={resetCreateForm}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Edit Webhook Form */}
      {editingWebhook && (
        <Card className="mb-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Edit Webhook</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
              <Input
                label="URL"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                required
              />
            </div>
            {renderEventPicker(editEvents, setEditEvents)}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Secret (optional)"
                placeholder="Leave empty to keep existing"
                value={editSecret}
                onChange={(e) => setEditSecret(e.target.value)}
                type="password"
              />
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={editActive}
                    onChange={(e) => setEditActive(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Active
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveEdit} loading={saving}>Save</Button>
              <Button variant="ghost" onClick={() => setEditingWebhook(null)}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {loading ? (
        <TableSkeleton columns={5} rows={4} />
      ) : webhooks && webhooks.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">URL</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Events</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Created</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {webhooks.map((wh) => (
                <tr key={wh.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{wh.name}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-500" title={wh.url}>{wh.url}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap gap-1">
                      {wh.events.split(',').map((e) => e.trim()).filter(Boolean).map((event) => (
                        <span
                          key={event}
                          className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                        >
                          {event}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <Badge color={wh.is_active ? 'green' : 'gray'}>
                      {wh.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {formatDateTime(wh.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleTest(wh)}
                        disabled={testingId === wh.id}
                        className="text-blue-600 hover:text-blue-800 disabled:text-blue-300"
                        title="Send test webhook"
                      >
                        {testingId === wh.id ? (
                          <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => handleStartEdit(wh)}
                        className="text-gray-500 hover:text-gray-700"
                        title="Edit webhook"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteTarget(wh)}
                        className="text-red-500 hover:text-red-700"
                        title="Delete webhook"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          message="No webhooks yet."
          description="Get started by adding your first webhook."
          actionLabel="Add Webhook"
          onAction={() => setShowCreateForm(true)}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Webhook"
        message={`Are you sure you want to delete the webhook "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageContainer>
  );
}

export default function WebhooksPage() {
  return (
    <Suspense>
      <WebhooksPageContent />
    </Suspense>
  );
}
