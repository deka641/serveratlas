'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  error?: string | null;
}

export default function ProviderForm({ initialData, onSubmit, loading = false, error }: ProviderFormProps) {
  const router = useRouter();
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
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3 border-t border-gray-200 pt-6">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {initialData ? 'Update Provider' : 'Create Provider'}
        </Button>
      </div>
    </form>
  );
}
