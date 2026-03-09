'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Backup } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';
import PageContainer from '@/components/PageContainer';
import Card from '@/components/ui/Card';
import BackupForm from '@/components/domain/BackupForm';

export default function NewBackupPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: Partial<Backup>) => {
    setLoading(true);
    try {
      await api.createBackup(data);
      addToast('success', 'Backup created successfully');
      router.push('/backups');
    } catch {
      addToast('error', 'Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="New Backup" breadcrumbs={[{ label: 'Backups', href: '/backups' }, { label: 'New Backup' }]}>
      <Card>
        <BackupForm onSubmit={handleSubmit} loading={loading} />
      </Card>
    </PageContainer>
  );
}
