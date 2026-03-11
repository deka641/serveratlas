'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useBackup } from '@/hooks/useBackups';
import { api } from '@/lib/api';
import type { Backup } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';
import PageContainer from '@/components/PageContainer';
import Card from '@/components/ui/Card';
import BackupForm from '@/components/domain/BackupForm';

export default function EditBackupPage() {
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();
  const { addToast } = useToast();
  const { data: backup, loading: fetching, error } = useBackup(id);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (data: Partial<Backup>) => {
    setSaving(true);
    setFormError(null);
    try {
      await api.updateBackup(id, data);
      addToast('success', 'Backup updated successfully');
      router.push(`/backups/${id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to update backup';
      setFormError(msg);
      addToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer title="Edit Backup" breadcrumbs={[{ label: 'Backups', href: '/backups' }, { label: backup?.name ?? 'Backup', href: `/backups/${id}` }, { label: 'Edit' }]} loading={fetching} error={error}>
      {backup && (
        <Card>
          <BackupForm initialData={backup} onSubmit={handleSubmit} loading={saving} error={formError} />
        </Card>
      )}
    </PageContainer>
  );
}
