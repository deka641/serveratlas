'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApplication } from '@/hooks/useApplications';
import { api } from '@/lib/api';
import type { Application } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';
import PageContainer from '@/components/PageContainer';
import Card from '@/components/ui/Card';
import ApplicationForm from '@/components/domain/ApplicationForm';

export default function EditApplicationPage() {
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();
  const { addToast } = useToast();
  const { data: app, loading: fetching, error } = useApplication(id);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (data: Partial<Application>) => {
    setSaving(true);
    try {
      await api.updateApplication(id, data);
      addToast('success', 'Application updated successfully');
      router.push(`/applications/${id}`);
    } catch {
      addToast('error', 'Failed to update application');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer title="Edit Application" breadcrumbs={[{ label: 'Applications', href: '/applications' }, { label: app?.name ?? 'Application', href: `/applications/${id}` }, { label: 'Edit' }]} loading={fetching} error={error}>
      {app && (
        <Card>
          <ApplicationForm initialData={app} onSubmit={handleSubmit} loading={saving} />
        </Card>
      )}
    </PageContainer>
  );
}
