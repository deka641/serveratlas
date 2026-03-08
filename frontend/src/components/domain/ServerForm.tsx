'use client';

import { FormEvent, useState } from 'react';
import type { Server, ServerStatus } from '@/lib/types';
import { useProviders } from '@/hooks/useProviders';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';

interface ServerFormProps {
  initialData?: Partial<Server>;
  onSubmit: (data: Partial<Server>) => void;
  loading?: boolean;
}

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'decommissioned', label: 'Decommissioned' },
];

const currencyOptions = [
  { value: 'EUR', label: 'EUR' },
  { value: 'USD', label: 'USD' },
  { value: 'GBP', label: 'GBP' },
];

export default function ServerForm({ initialData, onSubmit, loading }: ServerFormProps) {
  const { data: providers } = useProviders();

  const [name, setName] = useState(initialData?.name ?? '');
  const [hostname, setHostname] = useState(initialData?.hostname ?? '');
  const [providerId, setProviderId] = useState<string>(
    initialData?.provider_id != null ? String(initialData.provider_id) : ''
  );
  const [status, setStatus] = useState<ServerStatus>(initialData?.status ?? 'active');
  const [ipV4, setIpV4] = useState(initialData?.ip_v4 ?? '');
  const [ipV6, setIpV6] = useState(initialData?.ip_v6 ?? '');
  const [os, setOs] = useState(initialData?.os ?? '');
  const [cpuCores, setCpuCores] = useState(initialData?.cpu_cores != null ? String(initialData.cpu_cores) : '');
  const [ramMb, setRamMb] = useState(initialData?.ram_mb != null ? String(initialData.ram_mb) : '');
  const [diskGb, setDiskGb] = useState(initialData?.disk_gb != null ? String(initialData.disk_gb) : '');
  const [location, setLocation] = useState(initialData?.location ?? '');
  const [datacenter, setDatacenter] = useState(initialData?.datacenter ?? '');
  const [monthlyCost, setMonthlyCost] = useState(
    initialData?.monthly_cost != null ? String(initialData.monthly_cost) : ''
  );
  const [costCurrency, setCostCurrency] = useState(initialData?.cost_currency ?? 'EUR');
  const [loginUser, setLoginUser] = useState(initialData?.login_user ?? '');
  const [loginNotes, setLoginNotes] = useState(initialData?.login_notes ?? '');
  const [notes, setNotes] = useState(initialData?.notes ?? '');

  const [nameError, setNameError] = useState('');

  const providerOptions = (providers ?? []).map((p) => ({
    value: String(p.id),
    label: p.name,
  }));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setNameError('');

    if (!name.trim()) {
      setNameError('Name is required');
      return;
    }

    const data: Partial<Server> = {
      name: name.trim(),
      hostname: hostname.trim() || null,
      provider_id: providerId ? Number(providerId) : null,
      status,
      ip_v4: ipV4.trim() || null,
      ip_v6: ipV6.trim() || null,
      os: os.trim() || null,
      cpu_cores: cpuCores ? Number(cpuCores) : null,
      ram_mb: ramMb ? Number(ramMb) : null,
      disk_gb: diskGb ? Number(diskGb) : null,
      location: location.trim() || null,
      datacenter: datacenter.trim() || null,
      monthly_cost: monthlyCost ? Number(monthlyCost) : null,
      cost_currency: costCurrency || null,
      login_user: loginUser.trim() || null,
      login_notes: loginNotes.trim() || null,
      notes: notes.trim() || null,
    };

    onSubmit(data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic */}
      <fieldset>
        <legend className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Basic
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={nameError}
            required
          />
          <Input
            label="Hostname"
            value={hostname}
            onChange={(e) => setHostname(e.target.value)}
          />
          <Select
            label="Provider"
            options={providerOptions}
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
            placeholder="Select a provider"
          />
          <Select
            label="Status"
            options={statusOptions}
            value={status}
            onChange={(e) => setStatus(e.target.value as ServerStatus)}
          />
        </div>
      </fieldset>

      {/* Network */}
      <fieldset>
        <legend className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Network
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="IPv4"
            value={ipV4}
            onChange={(e) => setIpV4(e.target.value)}
            placeholder="e.g. 192.168.1.1"
          />
          <Input
            label="IPv6"
            value={ipV6}
            onChange={(e) => setIpV6(e.target.value)}
            placeholder="e.g. ::1"
          />
        </div>
      </fieldset>

      {/* Hardware */}
      <fieldset>
        <legend className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Hardware
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="OS"
            value={os}
            onChange={(e) => setOs(e.target.value)}
            placeholder="e.g. Ubuntu 22.04"
          />
          <Input
            label="CPU Cores"
            type="number"
            min={1}
            value={cpuCores}
            onChange={(e) => setCpuCores(e.target.value)}
          />
          <Input
            label="RAM (MB)"
            type="number"
            min={1}
            value={ramMb}
            onChange={(e) => setRamMb(e.target.value)}
          />
          <Input
            label="Disk (GB)"
            type="number"
            min={1}
            value={diskGb}
            onChange={(e) => setDiskGb(e.target.value)}
          />
        </div>
      </fieldset>

      {/* Location */}
      <fieldset>
        <legend className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Location
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Frankfurt, Germany"
          />
          <Input
            label="Datacenter"
            value={datacenter}
            onChange={(e) => setDatacenter(e.target.value)}
            placeholder="e.g. DC1"
          />
        </div>
      </fieldset>

      {/* Cost */}
      <fieldset>
        <legend className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Cost
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Monthly Cost"
            type="number"
            step="0.01"
            min={0}
            value={monthlyCost}
            onChange={(e) => setMonthlyCost(e.target.value)}
          />
          <Select
            label="Currency"
            options={currencyOptions}
            value={costCurrency}
            onChange={(e) => setCostCurrency(e.target.value)}
          />
        </div>
      </fieldset>

      {/* Access */}
      <fieldset>
        <legend className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Access
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Login User"
            value={loginUser}
            onChange={(e) => setLoginUser(e.target.value)}
            placeholder="e.g. root"
          />
          <Textarea
            label="Login Notes"
            value={loginNotes}
            onChange={(e) => setLoginNotes(e.target.value)}
            placeholder="Access instructions or notes..."
          />
        </div>
      </fieldset>

      {/* Notes */}
      <fieldset>
        <legend className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Notes
        </legend>
        <Textarea
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="General notes about this server..."
        />
      </fieldset>

      <div className="flex justify-end gap-3 border-t border-gray-200 pt-6">
        <Button type="button" variant="secondary" onClick={() => history.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : initialData ? 'Update Server' : 'Create Server'}
        </Button>
      </div>
    </form>
  );
}
