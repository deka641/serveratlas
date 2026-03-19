'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Application, AppStatus } from '@/lib/types';
import { useServers } from '@/hooks/useServers';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface ApplicationFormProps {
  initialData?: Partial<Application>;
  onSubmit: (data: Partial<Application>) => void;
  loading: boolean;
  error?: string | null;
}

const statusOptions = [
  { value: 'running', label: 'Running' },
  { value: 'stopped', label: 'Stopped' },
  { value: 'error', label: 'Error' },
  { value: 'deploying', label: 'Deploying' },
];

export default function ApplicationForm({ initialData, onSubmit, loading, error }: ApplicationFormProps) {
  const router = useRouter();
  const { data: servers, loading: serversLoading } = useServers();

  const [name, setName] = useState(initialData?.name || '');
  const [serverId, setServerId] = useState(
    initialData?.server_id ? String(initialData.server_id) : ''
  );
  const [appType, setAppType] = useState(initialData?.app_type || '');
  const [port, setPort] = useState(initialData?.port !== null && initialData?.port !== undefined ? String(initialData.port) : '');
  const [status, setStatus] = useState<AppStatus>(initialData?.status || 'running');
  const [url, setUrl] = useState(initialData?.url || '');
  const [configNotes, setConfigNotes] = useState(initialData?.config_notes || '');
  const [notes, setNotes] = useState(initialData?.notes || '');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isDirty = JSON.stringify({ name, serverId, appType, port, status, url, configNotes, notes }) !==
    JSON.stringify({
      name: initialData?.name || '',
      serverId: initialData?.server_id ? String(initialData.server_id) : '',
      appType: initialData?.app_type || '',
      port: initialData?.port !== null && initialData?.port !== undefined ? String(initialData.port) : '',
      status: initialData?.status || 'running',
      url: initialData?.url || '',
      configNotes: initialData?.config_notes || '',
      notes: initialData?.notes || '',
    });
  useUnsavedChanges(isDirty);

  function validateField(fieldName: string, value: string | number | null | undefined) {
    let error = '';
    switch (fieldName) {
      case 'name':
        if (!value || !String(value).trim()) {
          error = 'Name is required';
        }
        break;
      case 'server_id':
        if (!value || !String(value).trim()) {
          error = 'Server is required';
        }
        break;
      case 'port':
        if (value !== null && value !== undefined && String(value).trim() !== '') {
          const portNum = Number(value);
          if (portNum < 1 || portNum > 65535) {
            error = 'Port must be between 1 and 65535';
          }
        }
        break;
      case 'url':
        if (value && String(value).trim()) {
          const urlStr = String(value).trim();
          if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
            error = 'URL must start with http:// or https://';
          }
        }
        break;
    }
    setFieldErrors((prev) => ({ ...prev, [fieldName]: error }));
  }

  if (serversLoading) {
    return <LoadingSpinner />;
  }

  const serverOptions = (servers || []).map((s) => ({
    value: String(s.id),
    label: s.name,
  }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    // Validate all fields on submit
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Name is required';
    if (!serverId) errors.server_id = 'Server is required';
    if (port) {
      const portNum = Number(port);
      if (portNum < 1 || portNum > 65535) errors.port = 'Port must be between 1 and 65535';
    }
    if (url.trim()) {
      if (!url.trim().startsWith('http://') && !url.trim().startsWith('https://')) {
        errors.url = 'URL must start with http:// or https://';
      }
    }
    setFieldErrors(errors);
    if (Object.values(errors).some((e) => e)) return;

    onSubmit({
      name,
      server_id: Number(serverId),
      app_type: appType || null,
      port: port ? Number(port) : null,
      status,
      url: url || null,
      config_notes: configNotes || null,
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
        placeholder="My Application"
      />

      <Select
        label="Server"
        value={serverId}
        onChange={(e) => setServerId(e.target.value)}
        onBlur={(e) => validateField('server_id', e.target.value)}
        error={fieldErrors.server_id}
        options={serverOptions}
        placeholder="Select server"
        required
      />

      <Input
        label="Type"
        value={appType}
        onChange={(e) => setAppType(e.target.value)}
        placeholder="web, api, database, etc."
      />

      <Input
        label="Port"
        type="number"
        value={port}
        onChange={(e) => setPort(e.target.value)}
        onBlur={(e) => validateField('port', e.target.value)}
        error={fieldErrors.port}
        placeholder="8080"
        min={1}
        max={65535}
      />

      <Select
        label="Status"
        value={status}
        onChange={(e) => setStatus(e.target.value as AppStatus)}
        options={statusOptions}
      />

      <Input
        label="URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onBlur={(e) => validateField('url', e.target.value)}
        error={fieldErrors.url}
        placeholder="https://example.com"
      />

      <Textarea
        label="Config Notes"
        value={configNotes}
        onChange={(e) => setConfigNotes(e.target.value)}
        placeholder="Configuration details..."
        rows={3}
      />

      <Textarea
        label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Additional notes..."
        rows={3}
      />

      {isDirty && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
          <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.27 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          You have unsaved changes
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3 border-t border-gray-200 pt-6">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={!name.trim() || !serverId} loading={loading}>
          {initialData ? 'Update Application' : 'Create Application'}
        </Button>
      </div>
    </form>
  );
}
