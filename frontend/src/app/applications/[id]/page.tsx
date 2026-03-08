'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApplication } from '@/hooks/useApplications';
import { useBackups } from '@/hooks/useBackups';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import PageContainer from '@/components/PageContainer';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import Badge from '@/components/ui/Badge';
import Table, { Column } from '@/components/ui/Table';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { Backup } from '@/lib/types';

export default function ApplicationDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();
  const { addToast } = useToast();
  const { data: app, loading, error } = useApplication(id);
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

  const backupColumns: Column<Record<string, unknown>>[] = [
    {
      key: 'name',
      label: 'Name',
      render: (row) => (
        <Link href={`/backups/${row.id}`} className="font-medium text-blue-600 hover:text-blue-800">
          {row.name as string}
        </Link>
      ),
    },
    {
      key: 'frequency',
      label: 'Frequency',
      render: (row) => <Badge>{String(row.frequency).replace(/_/g, ' ')}</Badge>,
    },
    {
      key: 'last_run_status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.last_run_status as Backup['last_run_status']} />,
    },
    {
      key: 'last_run_at',
      label: 'Last Run',
      render: (row) =>
        row.last_run_at
          ? new Date(row.last_run_at as string).toLocaleString()
          : '\u2014',
    },
  ];

  return (
    <PageContainer
      title={app?.name || 'Application'}
      loading={loading}
      error={error}
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
      {app && (
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
              {app.config_notes && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Config Notes</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-900">{app.config_notes}</dd>
                </div>
              )}
              {app.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Notes</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-900">{app.notes}</dd>
                </div>
              )}
            </dl>
          </Card>

          <Card title="Backups" noPadding>
            {backups && backups.length > 0 ? (
              <Table
                columns={backupColumns}
                data={backups as unknown as Record<string, unknown>[]}
              />
            ) : (
              <div className="p-6 text-center text-sm text-gray-500">
                No backups configured for this application.
              </div>
            )}
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
