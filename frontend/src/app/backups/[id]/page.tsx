'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useBackup } from '@/hooks/useBackups';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import PageContainer from '@/components/PageContainer';
import { formatDateTime } from '@/lib/formatters';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import StatusBadge from '@/components/ui/StatusBadge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import DetailSkeleton from '@/components/ui/DetailSkeleton';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';

export default function BackupDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();
  const { addToast } = useToast();
  const { data: backup, loading, error, refetch } = useBackup(id);
  const [showDelete, setShowDelete] = useState(false);
  const [showVerifyForm, setShowVerifyForm] = useState(false);
  const [verifiedBy, setVerifiedBy] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleDelete = async () => {
    try {
      await api.deleteBackup(id);
      addToast('success', 'Backup deleted successfully');
      router.push('/backups');
    } catch {
      addToast('error', 'Failed to delete backup');
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      await api.verifyBackup(id, {
        verified_by: verifiedBy || undefined,
        notes: verificationNotes || undefined,
      });
      addToast('success', 'Backup verification recorded');
      setShowVerifyForm(false);
      setVerifiedBy('');
      setVerificationNotes('');
      refetch();
    } catch {
      addToast('error', 'Failed to record verification');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <PageContainer
      title={backup?.name || 'Backup'}
      breadcrumbs={[{ label: 'Backups', href: '/backups' }, { label: backup?.name ?? 'Backup' }]}
      error={error}
      onRetry={refetch}
      action={
        <div className="flex items-center gap-2">
          <Link href={`/backups/${id}/edit`}>
            <Button variant="secondary">Edit</Button>
          </Link>
          <Button variant="danger" onClick={() => setShowDelete(true)}>
            Delete
          </Button>
        </div>
      }
    >
      {loading ? <DetailSkeleton cards={3} fieldsPerCard={4} /> : backup && (
        <>
          <Card title="Backup Details">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{backup.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Source Server</dt>
                <dd className="mt-1">
                  <Link
                    href={`/servers/${backup.source_server_id}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    {backup.source_server_name || `Server #${backup.source_server_id}`}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Target Server</dt>
                <dd className="mt-1">
                  {backup.target_server_id ? (
                    <Link
                      href={`/servers/${backup.target_server_id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      {backup.target_server_name || `Server #${backup.target_server_id}`}
                    </Link>
                  ) : (
                    <span className="text-sm text-gray-500">{'\u2014'}</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Application</dt>
                <dd className="mt-1">
                  {backup.application_id ? (
                    <Link
                      href={`/applications/${backup.application_id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      {backup.application_name || `App #${backup.application_id}`}
                    </Link>
                  ) : (
                    <span className="text-sm text-gray-500">{'\u2014'}</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Frequency</dt>
                <dd className="mt-1">
                  <Badge>
                    {backup.frequency.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <StatusBadge status={backup.last_run_status} />
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Run</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {backup.last_run_at ? formatDateTime(backup.last_run_at) : '\u2014'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Retention Days</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {backup.retention_days !== null ? backup.retention_days : '\u2014'}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Storage Path</dt>
                <dd className="mt-1 font-mono text-sm text-gray-900">
                  {backup.storage_path || '\u2014'}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-900">{backup.notes || '\u2014'}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Verification" className="mt-6">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Verified</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {backup.last_verified_at ? formatDateTime(backup.last_verified_at) : 'Never verified'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Verified By</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {backup.last_verified_by || '\u2014'}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Verification Notes</dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
                  {backup.verification_notes || '\u2014'}
                </dd>
              </div>
            </dl>

            {!showVerifyForm ? (
              <div className="mt-4">
                <Button variant="secondary" onClick={() => setShowVerifyForm(true)}>
                  Record Verification
                </Button>
              </div>
            ) : (
              <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-4">
                <h4 className="mb-3 text-sm font-medium text-gray-900">Record Verification</h4>
                <div className="space-y-3">
                  <Input
                    label="Verified By"
                    value={verifiedBy}
                    onChange={(e) => setVerifiedBy(e.target.value)}
                    placeholder="Name of person verifying"
                    maxLength={255}
                  />
                  <Textarea
                    label="Notes"
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    placeholder="Verification notes..."
                    maxLength={2000}
                  />
                  <div className="flex items-center gap-2">
                    <Button onClick={handleVerify} disabled={verifying}>
                      {verifying ? 'Saving...' : 'Save Verification'}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setShowVerifyForm(false);
                        setVerifiedBy('');
                        setVerificationNotes('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      <ConfirmDialog
        open={showDelete}
        title="Delete Backup"
        message={`Are you sure you want to delete "${backup?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </PageContainer>
  );
}
