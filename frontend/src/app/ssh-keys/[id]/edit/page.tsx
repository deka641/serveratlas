'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSshKey } from '@/hooks/useSshKeys';
import { api } from '@/lib/api';
import type { SshKey } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';
import PageContainer from '@/components/PageContainer';
import Card from '@/components/ui/Card';
import SshKeyForm from '@/components/domain/SshKeyForm';

export default function EditSshKeyPage() {
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();
  const { addToast } = useToast();
  const { data: key, loading: fetching, error } = useSshKey(id);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (data: Partial<SshKey>) => {
    setSaving(true);
    setFormError(null);
    try {
      await api.updateSshKey(id, data);
      addToast('success', 'SSH key updated successfully');
      router.push(`/ssh-keys/${id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to update SSH key';
      setFormError(msg);
      addToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer title="Edit SSH Key" breadcrumbs={[{ label: 'SSH Keys', href: '/ssh-keys' }, { label: key?.name ?? 'SSH Key', href: `/ssh-keys/${id}` }, { label: 'Edit' }]} loading={fetching} error={error}>
      {key && (
        <Card>
          <SshKeyForm initialData={key} onSubmit={handleSubmit} loading={saving} error={formError} />
        </Card>
      )}
    </PageContainer>
  );
}
