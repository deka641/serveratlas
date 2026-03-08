'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { SshConnection } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';
import PageContainer from '@/components/PageContainer';
import Card from '@/components/ui/Card';
import SshConnectionForm from '@/components/domain/SshConnectionForm';

export default function NewSshConnectionPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: Partial<SshConnection>) => {
    setLoading(true);
    try {
      await api.createSshConnection(data);
      addToast('success', 'SSH connection created successfully');
      router.push('/ssh-connections');
    } catch {
      addToast('error', 'Failed to create SSH connection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="New SSH Connection">
      <Card>
        <SshConnectionForm onSubmit={handleSubmit} loading={loading} />
      </Card>
    </PageContainer>
  );
}
