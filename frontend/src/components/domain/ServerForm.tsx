'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Server, ServerStatus } from '@/lib/types';
import { useProviders } from '@/hooks/useProviders';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';

interface ServerFormProps {
  initialData?: Partial<Server>;
  onSubmit: (data: Partial<Server>) => void;
  loading?: boolean;
  error?: string | null;
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

export default function ServerForm({ initialData, onSubmit, loading, error }: ServerFormProps) {
  const router = useRouter();
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
  const [documentation, setDocumentation] = useState(initialData?.documentation ?? '');
  const [showDocPreview, setShowDocPreview] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isDirty = JSON.stringify({
    name, hostname, providerId, status, ipV4, ipV6, os, cpuCores, ramMb, diskGb,
    location, datacenter, monthlyCost, costCurrency, loginUser, loginNotes, notes, documentation,
  }) !== JSON.stringify({
    name: initialData?.name ?? '',
    hostname: initialData?.hostname ?? '',
    providerId: initialData?.provider_id != null ? String(initialData.provider_id) : '',
    status: initialData?.status ?? 'active',
    ipV4: initialData?.ip_v4 ?? '',
    ipV6: initialData?.ip_v6 ?? '',
    os: initialData?.os ?? '',
    cpuCores: initialData?.cpu_cores != null ? String(initialData.cpu_cores) : '',
    ramMb: initialData?.ram_mb != null ? String(initialData.ram_mb) : '',
    diskGb: initialData?.disk_gb != null ? String(initialData.disk_gb) : '',
    location: initialData?.location ?? '',
    datacenter: initialData?.datacenter ?? '',
    monthlyCost: initialData?.monthly_cost != null ? String(initialData.monthly_cost) : '',
    costCurrency: initialData?.cost_currency ?? 'EUR',
    loginUser: initialData?.login_user ?? '',
    loginNotes: initialData?.login_notes ?? '',
    notes: initialData?.notes ?? '',
    documentation: initialData?.documentation ?? '',
  });
  useUnsavedChanges(isDirty);

  function validateField(name: string, value: string | number | null | undefined) {
    let error = '';
    switch (name) {
      case 'name':
        if (!value || !String(value).trim()) {
          error = 'Name is required';
        }
        break;
      case 'ip_v4':
        if (value && String(value).trim()) {
          const ipv4Pattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
          const ipStr = String(value).trim();
          if (!ipv4Pattern.test(ipStr)) {
            error = 'Invalid IPv4 address format';
          } else {
            const octets = ipStr.split('.').map(Number);
            if (octets.some((o) => o < 0 || o > 255)) {
              error = 'Each octet must be between 0 and 255';
            }
          }
        }
        break;
      case 'monthly_cost':
        if (value !== null && value !== undefined && String(value).trim() !== '') {
          if (Number(value) < 0) {
            error = 'Monthly cost must be 0 or greater';
          }
        }
        break;
    }
    setFieldErrors((prev) => ({ ...prev, [name]: error }));
  }

  const providerOptions = (providers ?? []).map((p) => ({
    value: String(p.id),
    label: p.name,
  }));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // Validate all fields on submit
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Name is required';
    if (ipV4.trim()) {
      const ipv4Pattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
      if (!ipv4Pattern.test(ipV4.trim())) {
        errors.ip_v4 = 'Invalid IPv4 address format';
      } else {
        const octets = ipV4.trim().split('.').map(Number);
        if (octets.some((o) => o < 0 || o > 255)) {
          errors.ip_v4 = 'Each octet must be between 0 and 255';
        }
      }
    }
    if (monthlyCost !== '' && Number(monthlyCost) < 0) {
      errors.monthly_cost = 'Monthly cost must be 0 or greater';
    }
    setFieldErrors(errors);
    if (Object.values(errors).some((e) => e)) return;

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
      documentation: documentation.trim() || null,
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
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={(e) => validateField('name', e.target.value)}
            error={fieldErrors.name}
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
            onBlur={(e) => validateField('ip_v4', e.target.value)}
            error={fieldErrors.ip_v4}
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
            onBlur={(e) => validateField('monthly_cost', e.target.value)}
            error={fieldErrors.monthly_cost}
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

      {/* Documentation */}
      <fieldset>
        <legend className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Documentation
        </legend>
        <div className="flex items-center gap-2 mb-2">
          <button
            type="button"
            onClick={() => setShowDocPreview(false)}
            className={`text-xs px-2 py-1 rounded ${!showDocPreview ? 'bg-gray-200 text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setShowDocPreview(true)}
            className={`text-xs px-2 py-1 rounded ${showDocPreview ? 'bg-gray-200 text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Preview
          </button>
        </div>
        {showDocPreview ? (
          <div className="min-h-[200px] rounded-md border border-gray-300 p-4">
            {documentation.trim() ? (
              <MarkdownRenderer content={documentation} />
            ) : (
              <p className="text-sm text-gray-400 italic">Nothing to preview</p>
            )}
          </div>
        ) : (
          <Textarea
            label="Documentation"
            value={documentation}
            onChange={(e) => setDocumentation(e.target.value)}
            placeholder="Runbooks, setup procedures, maintenance notes... (Markdown supported)"
            rows={8}
          />
        )}
      </fieldset>

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
        <Button type="submit" loading={loading || false}>
          {initialData ? 'Update Server' : 'Create Server'}
        </Button>
      </div>
    </form>
  );
}
