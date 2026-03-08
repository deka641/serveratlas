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

  const handleSubmit = async (data: Partial<SshKey>) => {
    setLoading(true);
    try {
      await api.createSshKey(data);
      addToast('success', 'SSH key created successfully');
      router.push('/ssh-keys');
    } catch {
      addToast('error', 'Failed to create SSH key');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="New SSH Key">
      <Card>
        <SshKeyForm onSubmit={handleSubmit} loading={loading} />
      </Card>
    </PageContainer>
  );
}
