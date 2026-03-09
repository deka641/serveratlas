'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Application, AppStatus } from '@/lib/types';
import { useServers } from '@/hooks/useServers';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface ApplicationFormProps {
  initialData?: Partial<Application>;
  onSubmit: (data: Partial<Application>) => void;
  loading: boolean;
}

const statusOptions = [
  { value: 'running', label: 'Running' },
  { value: 'stopped', label: 'Stopped' },
  { value: 'error', label: 'Error' },
  { value: 'deploying', label: 'Deploying' },
];

export default function ApplicationForm({ initialData, onSubmit, loading }: ApplicationFormProps) {
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

  if (serversLoading) {
    return <LoadingSpinner />;
  }

  const serverOptions = (servers || []).map((s) => ({
    value: String(s.id),
    label: s.name,
  }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
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
        required
        placeholder="My Application"
      />

      <Select
        label="Server"
        value={serverId}
        onChange={(e) => setServerId(e.target.value)}
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

      <div className="flex justify-end gap-3 border-t border-gray-200 pt-6">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !name.trim() || !serverId}>
          {loading ? 'Saving...' : initialData ? 'Update Application' : 'Create Application'}
        </Button>
      </div>
    </form>
  );
}
