'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import type { Provider } from '@/lib/types';

interface BulkEditModalProps {
  open: boolean;
  onClose: () => void;
  serverIds: number[];
  onComplete: () => void;
}

type FieldOption = 'Status' | 'Provider' | 'Location' | 'Datacenter';

const fieldOptions: { value: FieldOption; label: string }[] = [
  { value: 'Status', label: 'Status' },
  { value: 'Provider', label: 'Provider' },
  { value: 'Location', label: 'Location' },
  { value: 'Datacenter', label: 'Datacenter' },
];

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'decommissioned', label: 'Decommissioned' },
];

export default function BulkEditModal({ open, onClose, serverIds, onComplete }: BulkEditModalProps) {
  const { addToast } = useToast();
  const [selectedField, setSelectedField] = useState<FieldOption | ''>('');
  const [value, setValue] = useState('');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      api.listProviders({ limit: 1000 }).then((res) => {
        setProviders(res.items);
      }).catch(() => {
        // Providers will remain empty; user sees empty dropdown
      });
    }
  }, [open]);

  useEffect(() => {
    setValue('');
  }, [selectedField]);

  function getFieldKey(): string {
    switch (selectedField) {
      case 'Status': return 'status';
      case 'Provider': return 'provider_id';
      case 'Location': return 'location';
      case 'Datacenter': return 'datacenter';
      default: return '';
    }
  }

  function getDisplayValue(): string {
    if (!value) return '';
    if (selectedField === 'Provider') {
      const provider = providers.find((p) => String(p.id) === value);
      return provider ? provider.name : value;
    }
    return value;
  }

  async function handleSubmit() {
    if (!selectedField || !value) return;
    setSubmitting(true);
    try {
      const fieldKey = getFieldKey();
      const updateValue: string | number = selectedField === 'Provider' ? Number(value) : value;
      const result = await api.bulkUpdateServers(serverIds, { [fieldKey]: updateValue });
      addToast('success', `Updated ${result.updated} server${result.updated !== 1 ? 's' : ''} successfully`);
      onComplete();
      handleClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Bulk update failed';
      addToast('error', message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setSelectedField('');
    setValue('');
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Bulk Edit Servers">
      <div className="space-y-4">
        <Select
          label="Field to update"
          options={fieldOptions.map((f) => ({ value: f.value, label: f.label }))}
          value={selectedField}
          onChange={(e) => setSelectedField(e.target.value as FieldOption | '')}
          placeholder="Select a field..."
        />

        {selectedField === 'Status' && (
          <Select
            label="New status"
            options={statusOptions}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Select status..."
          />
        )}

        {selectedField === 'Provider' && (
          <Select
            label="New provider"
            options={providers.map((p) => ({ value: String(p.id), label: p.name }))}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Select provider..."
          />
        )}

        {selectedField === 'Location' && (
          <Input
            label="New location"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter location..."
          />
        )}

        {selectedField === 'Datacenter' && (
          <Input
            label="New datacenter"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter datacenter..."
          />
        )}

        {selectedField && value && (
          <p className="text-sm text-gray-600">
            Update {selectedField.toLowerCase()} to &apos;{getDisplayValue()}&apos; for {serverIds.length} server{serverIds.length !== 1 ? 's' : ''}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedField || !value || submitting}
            loading={submitting}
          >
            Update Servers
          </Button>
        </div>
      </div>
    </Modal>
  );
}
