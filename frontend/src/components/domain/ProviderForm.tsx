'use client';

import { FormEvent, useState } from 'react';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import type { Provider } from '@/lib/types';

interface ProviderFormData {
  name: string;
  website: string;
  support_contact: string;
  notes: string;
}

interface ProviderFormProps {
  initialData?: Partial<Provider>;
  onSubmit: (data: ProviderFormData) => void;
  loading?: boolean;
}

export default function ProviderForm({ initialData, onSubmit, loading = false }: ProviderFormProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [website, setWebsite] = useState(initialData?.website ?? '');
  const [supportContact, setSupportContact] = useState(initialData?.support_contact ?? '');
  const [notes, setNotes] = useState(initialData?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      name: name.trim(),
      website: website.trim() || '',
      support_contact: supportContact.trim() || '',
      notes: notes.trim() || '',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. AWS, Hetzner, DigitalOcean"
        required
        error={errors.name}
        disabled={loading}
      />
      <Input
        label="Website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        placeholder="https://example.com"
        type="url"
        disabled={loading}
      />
      <Input
        label="Support Contact"
        value={supportContact}
        onChange={(e) => setSupportContact(e.target.value)}
        placeholder="support@example.com or phone number"
        disabled={loading}
      />
      <Textarea
        label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Additional notes about this provider..."
        disabled={loading}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : initialData ? 'Update Provider' : 'Create Provider'}
        </Button>
      </div>
    </form>
  );
}
