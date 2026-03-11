'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PageContainer from '@/components/PageContainer';
import Card from '@/components/ui/Card';
import ProviderForm from '@/components/domain/ProviderForm';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';

export default function NewProviderPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (data: { name: string; website: string; support_contact: string; notes: string }) => {
    setLoading(true);
    setFormError(null);
    try {
      await api.createProvider(data);
      addToast('success', 'Provider created successfully.');
      router.push('/providers');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create provider.';
      setFormError(msg);
      addToast('error', msg);
      setLoading(false);
    }
  };

  return (
    <PageContainer title="New Provider" breadcrumbs={[{ label: 'Providers', href: '/providers' }, { label: 'New Provider' }]}>
      <Card className="max-w-2xl">
        <ProviderForm onSubmit={handleSubmit} loading={loading} error={formError} />
      </Card>
    </PageContainer>
  );
}
