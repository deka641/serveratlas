'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { Backup } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';
import PageContainer from '@/components/PageContainer';
import Card from '@/components/ui/Card';
import BackupForm from '@/components/domain/BackupForm';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

function NewBackupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const initialData: Partial<Backup> = {};
  const sourceServerIdParam = searchParams.get('source_server_id');
  const applicationIdParam = searchParams.get('application_id');
  if (sourceServerIdParam) {
    initialData.source_server_id = Number(sourceServerIdParam);
  }
  if (applicationIdParam) {
    initialData.application_id = Number(applicationIdParam);
  }

  const handleSubmit = async (data: Partial<Backup>) => {
    setLoading(true);
    setFormError(null);
    try {
      await api.createBackup(data);
      addToast('success', 'Backup created successfully');
      router.push('/backups');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create backup';
      setFormError(msg);
      addToast('error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <BackupForm initialData={initialData} onSubmit={handleSubmit} loading={loading} error={formError} />
    </Card>
  );
}

export default function NewBackupPage() {
  return (
    <PageContainer title="New Backup" breadcrumbs={[{ label: 'Backups', href: '/backups' }, { label: 'New Backup' }]}>
      <Suspense fallback={<LoadingSpinner />}>
        <NewBackupContent />
      </Suspense>
    </PageContainer>
  );
}
