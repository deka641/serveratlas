'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Server } from '@/lib/types';
import { useServer } from '@/hooks/useServers';
import { useToast } from '@/components/ui/Toast';
import PageContainer from '@/components/PageContainer';
import Card from '@/components/ui/Card';
import ServerForm from '@/components/domain/ServerForm';

export default function EditServerPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const id = Number(params.id);

  const { data: server, loading: serverLoading, error } = useServer(id);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(data: Partial<Server>) {
    setSaving(true);
    try {
      await api.updateServer(id, data);
      addToast('success', 'Server updated successfully');
      router.push(`/servers/${id}`);
    } catch {
      addToast('error', 'Failed to update server');
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageContainer
      title={server ? `Edit ${server.name}` : 'Edit Server'}
      breadcrumbs={[{ label: 'Servers', href: '/servers' }, { label: server?.name ?? 'Server', href: `/servers/${id}` }, { label: 'Edit' }]}
      loading={serverLoading}
      error={error}
    >
      {server && (
        <Card>
          <ServerForm
            initialData={server}
            onSubmit={handleSubmit}
            loading={saving}
          />
        </Card>
      )}
    </PageContainer>
  );
}
