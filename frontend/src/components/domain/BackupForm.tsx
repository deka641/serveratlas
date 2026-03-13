'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Backup, BackupFrequency, BackupStatus } from '@/lib/types';
import { useServers } from '@/hooks/useServers';
import { useApplications } from '@/hooks/useApplications';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface BackupFormProps {
  initialData?: Partial<Backup>;
  onSubmit: (data: Partial<Backup>) => void;
  loading: boolean;
  error?: string | null;
}

const frequencyOptions = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'manual', label: 'Manual' },
];

const statusOptions = [
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
  { value: 'running', label: 'Running' },
  { value: 'never_run', label: 'Never Run' },
];

export default function BackupForm({ initialData, onSubmit, loading, error }: BackupFormProps) {
  const router = useRouter();
  const { data: servers, loading: serversLoading } = useServers();

  const [name, setName] = useState(initialData?.name || '');
  const [sourceServerId, setSourceServerId] = useState(
    initialData?.source_server_id ? String(initialData.source_server_id) : ''
  );
  const [targetServerId, setTargetServerId] = useState(
    initialData?.target_server_id ? String(initialData.target_server_id) : ''
  );
  const [applicationId, setApplicationId] = useState(
    initialData?.application_id ? String(initialData.application_id) : ''
  );
  const [frequency, setFrequency] = useState<BackupFrequency>(initialData?.frequency || 'daily');
  const [retentionDays, setRetentionDays] = useState(
    initialData?.retention_days !== null && initialData?.retention_days !== undefined
      ? String(initialData.retention_days)
      : ''
  );
  const [storagePath, setStoragePath] = useState(initialData?.storage_path || '');
  const [lastRunStatus, setLastRunStatus] = useState<BackupStatus>(
    initialData?.last_run_status || 'never_run'
  );
  const [notes, setNotes] = useState(initialData?.notes || '');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validateField(fieldName: string, value: string | number | null | undefined) {
    let error = '';
    switch (fieldName) {
      case 'name':
        if (!value || !String(value).trim()) {
          error = 'Name is required';
        }
        break;
      case 'source_server_id':
        if (!value || !String(value).trim()) {
          error = 'Source server is required';
        }
        break;
      case 'retention_days':
        if (value !== null && value !== undefined && String(value).trim() !== '') {
          if (Number(value) <= 0) {
            error = 'Retention days must be greater than 0';
          }
        }
        break;
    }
    setFieldErrors((prev) => ({ ...prev, [fieldName]: error }));
  }

  const { data: applications, loading: appsLoading } = useApplications(
    sourceServerId ? { server_id: Number(sourceServerId) } : undefined
  );

  if (serversLoading) {
    return <LoadingSpinner />;
  }

  const serverOptions = (servers || []).map((s) => ({
    value: String(s.id),
    label: s.name,
  }));

  const targetServerOptions = [
    { value: '', label: 'None' },
    ...serverOptions,
  ];

  const appOptions = [
    { value: '', label: 'None' },
    ...(applications || []).map((a) => ({
      value: String(a.id),
      label: a.name,
    })),
  ];

  const handleSourceChange = (value: string) => {
    setSourceServerId(value);
    setApplicationId('');
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    // Validate all fields on submit
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Name is required';
    if (!sourceServerId) errors.source_server_id = 'Source server is required';
    if (retentionDays && Number(retentionDays) <= 0) {
      errors.retention_days = 'Retention days must be greater than 0';
    }
    setFieldErrors(errors);
    if (Object.values(errors).some((e) => e)) return;

    onSubmit({
      name,
      source_server_id: Number(sourceServerId),
      target_server_id: targetServerId ? Number(targetServerId) : null,
      application_id: applicationId ? Number(applicationId) : null,
      frequency,
      retention_days: retentionDays ? Number(retentionDays) : null,
      storage_path: storagePath || null,
      last_run_status: lastRunStatus,
      notes: notes || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={(e) => validateField('name', e.target.value)}
        error={fieldErrors.name}
        required
        placeholder="Daily DB Backup"
      />

      <Select
        label="Source Server"
        value={sourceServerId}
        onChange={(e) => handleSourceChange(e.target.value)}
        onBlur={(e) => validateField('source_server_id', e.target.value)}
        error={fieldErrors.source_server_id}
        options={serverOptions}
        placeholder="Select source server"
        required
      />

      <Select
        label="Target Server"
        value={targetServerId}
        onChange={(e) => setTargetServerId(e.target.value)}
        options={targetServerOptions}
      />

      <Select
        label="Application"
        value={applicationId}
        onChange={(e) => setApplicationId(e.target.value)}
        options={appOptions}
        disabled={!sourceServerId || appsLoading}
      />

      <Select
        label="Frequency"
        value={frequency}
        onChange={(e) => setFrequency(e.target.value as BackupFrequency)}
        options={frequencyOptions}
      />

      <Input
        label="Retention Days"
        type="number"
        value={retentionDays}
        onChange={(e) => setRetentionDays(e.target.value)}
        onBlur={(e) => validateField('retention_days', e.target.value)}
        error={fieldErrors.retention_days}
        placeholder="30"
        min={1}
      />

      <Input
        label="Storage Path"
        value={storagePath}
        onChange={(e) => setStoragePath(e.target.value)}
        placeholder="/backups/myapp"
      />

      <Select
        label="Last Run Status"
        value={lastRunStatus}
        onChange={(e) => setLastRunStatus(e.target.value as BackupStatus)}
        options={statusOptions}
      />

      <Textarea
        label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Additional notes..."
        rows={3}
      />

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3 border-t border-gray-200 pt-6">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={!name.trim() || !sourceServerId} loading={loading}>
          {initialData ? 'Update Backup' : 'Create Backup'}
        </Button>
      </div>
    </form>
  );
}
