'use client';

import { FormEvent, useState } from 'react';
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

export default function BackupForm({ initialData, onSubmit, loading }: BackupFormProps) {
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
        required
        placeholder="Daily DB Backup"
      />

      <Select
        label="Source Server"
        value={sourceServerId}
        onChange={(e) => handleSourceChange(e.target.value)}
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

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={loading || !name.trim() || !sourceServerId}>
          {loading ? 'Saving...' : initialData ? 'Update Backup' : 'Create Backup'}
        </Button>
      </div>
    </form>
  );
}
