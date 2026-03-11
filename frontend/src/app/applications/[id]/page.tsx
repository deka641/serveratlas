'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApplication } from '@/hooks/useApplications';
import { useBackups } from '@/hooks/useBackups';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import PageContainer from '@/components/PageContainer';
import { formatDateTime } from '@/lib/formatters';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import Badge from '@/components/ui/Badge';
import Table, { Column } from '@/components/ui/Table';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { Backup } from '@/lib/types';
import DetailSkeleton from '@/components/ui/DetailSkeleton';

export default function ApplicationDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();
  const { addToast } = useToast();
  const { data: app, loading, error, refetch } = useApplication(id);
  const { data: backups } = useBackups({ application_id: id });
  const [showDelete, setShowDelete] = useState(false);

  const handleDelete = async () => {
    try {
      await api.deleteApplication(id);
      addToast('success', 'Application deleted successfully');
      router.push('/applications');
    } catch {
      addToast('error', 'Failed to delete application');
    }
  };

  const backupColumns: Column<Backup>[] = [
    {
      key: 'name',
      label: 'Name',
      render: (backup) => (
        <Link href={`/backups/${backup.id}`} className="font-medium text-blue-600 hover:text-blue-800 hover:underline">
          {backup.name}
        </Link>
      ),
    },
    {
      key: 'frequency',
      label: 'Frequency',
      render: (backup) => <Badge>{backup.frequency.replace(/_/g, ' ')}</Badge>,
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
        backup.last_run_at
          ? formatDateTime(backup.last_run_at)
          : '\u2014',
    },
  ];

  return (
    <PageContainer
      title={app?.name || 'Application'}
      breadcrumbs={[{ label: 'Applications', href: '/applications' }, { label: app?.name ?? 'Application' }]}
      error={error}
      onRetry={refetch}
      action={
        <div className="flex items-center gap-2">
          <Link href={`/applications/${id}/edit`}>
            <Button variant="secondary">Edit</Button>
          </Link>
          <Button variant="danger" onClick={() => setShowDelete(true)}>
            Delete
          </Button>
        </div>
      }
    >
      {loading ? <DetailSkeleton cards={3} fieldsPerCard={4} /> : app && (
        <div className="space-y-6">
          <Card title="Application Details">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{app.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Server</dt>
                <dd className="mt-1">
                  <Link
                    href={`/servers/${app.server_id}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    {app.server_name || `Server #${app.server_id}`}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Type</dt>
                <dd className="mt-1 text-sm text-gray-900">{app.app_type || '\u2014'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Port</dt>
                <dd className="mt-1 font-mono text-sm text-gray-900">
                  {app.port !== null ? app.port : '\u2014'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <StatusBadge status={app.status} />
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">URL</dt>
                <dd className="mt-1">
                  {app.url ? (
                    <a
                      href={app.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {app.url}
                    </a>
                  ) : (
                    <span className="text-sm text-gray-500">{'\u2014'}</span>
                  )}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Config Notes</dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-900">{app.config_notes || '\u2014'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-900">{app.notes || '\u2014'}</dd>
              </div>
            </dl>
          </Card>

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Backups</h2>
            <Link href={`/backups/new?source_server_id=${app.server_id}&application_id=${id}`}>
              <Button size="sm">Add Backup</Button>
            </Link>
          </div>
          <Card noPadding>
            <Table
              columns={backupColumns}
              data={backups ?? []}
              emptyMessage="No backups configured for this application."
            />
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={showDelete}
        title="Delete Application"
        message={`Are you sure you want to delete "${app?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </PageContainer>
  );
}
