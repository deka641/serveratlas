'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageContainer from '@/components/PageContainer';
import Card from '@/components/ui/Card';
import ProviderForm from '@/components/domain/ProviderForm';
import { useToast } from '@/components/ui/Toast';
import { useProvider } from '@/hooks/useProviders';
import { api } from '@/lib/api';

export default function EditProviderPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const id = Number(params.id);
  const { data: provider, loading: loadingProvider, error } = useProvider(id);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (data: { name: string; website: string; support_contact: string; notes: string }) => {
    setSaving(true);
    setFormError(null);
    try {
      await api.updateProvider(id, data);
      addToast('success', 'Provider updated successfully.');
      router.push(`/providers/${id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update provider.';
      setFormError(msg);
      addToast('error', msg);
      setSaving(false);
    }
  };

  return (
    <PageContainer
      title={provider ? `Edit ${provider.name}` : 'Edit Provider'}
      breadcrumbs={[{ label: 'Providers', href: '/providers' }, { label: provider?.name ?? 'Provider', href: `/providers/${id}` }, { label: 'Edit' }]}
      loading={loadingProvider}
      error={error}
    >
      {provider && (
        <Card className="max-w-2xl">
          <ProviderForm
            initialData={provider}
            onSubmit={handleSubmit}
            loading={saving}
            error={formError}
          />
        </Card>
      )}
    </PageContainer>
  );
}
