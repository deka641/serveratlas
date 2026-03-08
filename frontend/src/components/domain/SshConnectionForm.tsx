'use client';

import { FormEvent, useState } from 'react';
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
}

export default function SshConnectionForm({ initialData, onSubmit, loading }: SshConnectionFormProps) {
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
        options={serverOptions}
        placeholder="Select source server"
        required
      />

      <Select
        label="Target Server"
        value={targetServerId}
        onChange={(e) => setTargetServerId(e.target.value)}
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

      <div className="flex justify-end gap-3">
        <Button
          type="submit"
          disabled={loading || !sourceServerId || !targetServerId}
        >
          {loading ? 'Saving...' : initialData ? 'Update Connection' : 'Create Connection'}
        </Button>
      </div>
    </form>
  );
}
