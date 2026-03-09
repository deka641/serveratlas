'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { Application } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';
import PageContainer from '@/components/PageContainer';
import Card from '@/components/ui/Card';
import ApplicationForm from '@/components/domain/ApplicationForm';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

function NewApplicationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);

  const initialData: Partial<Application> = {};
  const serverIdParam = searchParams.get('server_id');
  if (serverIdParam) {
    initialData.server_id = Number(serverIdParam);
  }

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
    <Card>
      <ApplicationForm initialData={initialData} onSubmit={handleSubmit} loading={loading} />
    </Card>
  );
}

export default function NewApplicationPage() {
  return (
    <PageContainer title="New Application" breadcrumbs={[{ label: 'Applications', href: '/applications' }, { label: 'New Application' }]}>
      <Suspense fallback={<LoadingSpinner />}>
        <NewApplicationContent />
      </Suspense>
    </PageContainer>
  );
}
