'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSshConnection } from '@/hooks/useSshConnections';
import { api } from '@/lib/api';
import type { SshConnection } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';
import PageContainer from '@/components/PageContainer';
import Card from '@/components/ui/Card';
import SshConnectionForm from '@/components/domain/SshConnectionForm';

export default function EditSshConnectionPage() {
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();
  const { addToast } = useToast();
  const { data: conn, loading: fetching, error } = useSshConnection(id);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (data: Partial<SshConnection>) => {
    setSaving(true);
    try {
      await api.updateSshConnection(id, data);
      addToast('success', 'SSH connection updated successfully');
      router.push(`/ssh-connections/${id}`);
    } catch {
      addToast('error', 'Failed to update SSH connection');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer title="Edit SSH Connection" loading={fetching} error={error}>
      {conn && (
        <Card>
          <SshConnectionForm initialData={conn} onSubmit={handleSubmit} loading={saving} />
        </Card>
      )}
    </PageContainer>
  );
}
