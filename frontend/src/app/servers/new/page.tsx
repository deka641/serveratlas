'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Server } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';
import PageContainer from '@/components/PageContainer';
import Card from '@/components/ui/Card';
import ServerForm from '@/components/domain/ServerForm';

export default function NewServerPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(data: Partial<Server>) {
    setLoading(true);
    setFormError(null);
    try {
      await api.createServer(data);
      addToast('success', 'Server created successfully');
      router.push('/servers');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create server';
      setFormError(msg);
      addToast('error', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer title="Add Server" breadcrumbs={[{ label: 'Servers', href: '/servers' }, { label: 'Add Server' }]}>
      <Card>
        <ServerForm onSubmit={handleSubmit} loading={loading} error={formError} />
      </Card>
    </PageContainer>
  );
}
