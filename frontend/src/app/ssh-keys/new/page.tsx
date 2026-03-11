'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { SshKey } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';
import PageContainer from '@/components/PageContainer';
import Card from '@/components/ui/Card';
import SshKeyForm from '@/components/domain/SshKeyForm';

export default function NewSshKeyPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (data: Partial<SshKey>) => {
    setLoading(true);
    setFormError(null);
    try {
      await api.createSshKey(data);
      addToast('success', 'SSH key created successfully');
      router.push('/ssh-keys');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create SSH key';
      setFormError(msg);
      addToast('error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="New SSH Key" breadcrumbs={[{ label: 'SSH Keys', href: '/ssh-keys' }, { label: 'New SSH Key' }]}>
      <Card>
        <SshKeyForm onSubmit={handleSubmit} loading={loading} error={formError} />
      </Card>
    </PageContainer>
  );
}
