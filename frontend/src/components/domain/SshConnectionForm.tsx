'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SshConnection } from '@/lib/types';
import { useServers } from '@/hooks/useServers';
import { useSshKeys } from '@/hooks/useSshKeys';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface SshConnectionFormProps {
  initialData?: Partial<SshConnection>;
  onSubmit: (data: Partial<SshConnection>) => void;
  loading: boolean;
  error?: string | null;
}

export default function SshConnectionForm({ initialData, onSubmit, loading, error }: SshConnectionFormProps) {
  const router = useRouter();
  const { data: servers, loading: serversLoading } = useServers();
  const { data: sshKeys, loading: keysLoading } = useSshKeys();

  const [sourceServerId, setSourceServerId] = useState(
    initialData?.source_server_id ? String(initialData.source_server_id) : ''
  );
  const [targetServerId, setTargetServerId] = useState(
    initialData?.target_server_id ? String(initialData.target_server_id) : ''
  );
  const [sshKeyId, setSshKeyId] = useState(
    initialData?.ssh_key_id ? String(initialData.ssh_key_id) : ''
  );
  const [sshUser, setSshUser] = useState(initialData?.ssh_user || '');
  const [sshPort, setSshPort] = useState(String(initialData?.ssh_port ?? 22));
  const [purpose, setPurpose] = useState(initialData?.purpose || '');
  const [notes, setNotes] = useState(initialData?.notes || '');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validateField(fieldName: string, value: string | number | null | undefined) {
    let error = '';
    switch (fieldName) {
      case 'source_server_id':
        if (!value || !String(value).trim()) {
          error = 'Source server is required';
        }
        break;
      case 'target_server_id':
        if (!value || !String(value).trim()) {
          error = 'Target server is required';
        }
        break;
      case 'ssh_port':
        if (value !== null && value !== undefined && String(value).trim() !== '') {
          const portNum = Number(value);
          if (portNum < 1 || portNum > 65535) {
            error = 'SSH port must be between 1 and 65535';
          }
        }
        break;
    }
    setFieldErrors((prev) => ({ ...prev, [fieldName]: error }));
  }

  if (serversLoading || keysLoading) {
    return <LoadingSpinner />;
  }

  const serverOptions = (servers || []).map((s) => ({
    value: String(s.id),
    label: s.name,
  }));

  const targetOptions = serverOptions.filter((o) => o.value !== sourceServerId);

  const keyOptions = [
    { value: '', label: 'None' },
    ...(sshKeys || []).map((k) => ({
      value: String(k.id),
      label: k.name,
    })),
  ];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    // Validate all fields on submit
    const errors: Record<string, string> = {};
    if (!sourceServerId) errors.source_server_id = 'Source server is required';
    if (!targetServerId) errors.target_server_id = 'Target server is required';
    if (sshPort) {
      const portNum = Number(sshPort);
      if (portNum < 1 || portNum > 65535) errors.ssh_port = 'SSH port must be between 1 and 65535';
    }
    setFieldErrors(errors);
    if (Object.values(errors).some((e) => e)) return;

    onSubmit({
      source_server_id: Number(sourceServerId),
      target_server_id: Number(targetServerId),
      ssh_key_id: sshKeyId ? Number(sshKeyId) : null,
      ssh_user: sshUser || null,
      ssh_port: Number(sshPort),
      purpose: purpose || null,
      notes: notes || null,
    });
  };

  const handleSourceChange = (value: string) => {
    setSourceServerId(value);
    if (value === targetServerId) {
      setTargetServerId('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
        onBlur={(e) => validateField('target_server_id', e.target.value)}
        error={fieldErrors.target_server_id}
        options={targetOptions}
        placeholder="Select target server"
        required
      />

      <Select
        label="SSH Key"
        value={sshKeyId}
        onChange={(e) => setSshKeyId(e.target.value)}
        options={keyOptions}
      />

      <Input
        label="SSH User"
        value={sshUser}
        onChange={(e) => setSshUser(e.target.value)}
        placeholder="root"
      />

      <Input
        label="SSH Port"
        type="number"
        value={sshPort}
        onChange={(e) => setSshPort(e.target.value)}
        onBlur={(e) => validateField('ssh_port', e.target.value)}
        error={fieldErrors.ssh_port}
        min={1}
        max={65535}
      />

      <Input
        label="Purpose"
        value={purpose}
        onChange={(e) => setPurpose(e.target.value)}
        placeholder="Backup sync, deployment, etc."
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
        <Button
          type="submit"
          disabled={!sourceServerId || !targetServerId}
          loading={loading}
        >
          {initialData ? 'Update Connection' : 'Create Connection'}
        </Button>
      </div>
    </form>
  );
}
