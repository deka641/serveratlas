'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Application } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';
import PageContainer from '@/components/PageContainer';
import Card from '@/components/ui/Card';
import ApplicationForm from '@/components/domain/ApplicationForm';

export default function NewApplicationPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: Partial<Application>) => {
    setLoading(true);
    try {
      await api.createApplication(data);
      addToast('success', 'Application created successfully');
      router.push('/applications');
    } catch {
      addToast('error', 'Failed to create application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="New Application" breadcrumbs={[{ label: 'Applications', href: '/applications' }, { label: 'New Application' }]}>
      <Card>
        <ApplicationForm onSubmit={handleSubmit} loading={loading} />
      </Card>
    </PageContainer>
  );
}
