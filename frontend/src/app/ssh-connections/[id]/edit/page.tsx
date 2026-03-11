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
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (data: Partial<SshConnection>) => {
    setSaving(true);
    setFormError(null);
    try {
      await api.updateSshConnection(id, data);
      addToast('success', 'SSH connection updated successfully');
      router.push(`/ssh-connections/${id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to update SSH connection';
      setFormError(msg);
      addToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer title="Edit SSH Connection" breadcrumbs={[{ label: 'SSH Connections', href: '/ssh-connections' }, { label: 'SSH Connection', href: `/ssh-connections/${id}` }, { label: 'Edit' }]} loading={fetching} error={error}>
      {conn && (
        <Card>
          <SshConnectionForm initialData={conn} onSubmit={handleSubmit} loading={saving} error={formError} />
        </Card>
      )}
    </PageContainer>
  );
}
