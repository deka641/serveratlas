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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validateField(fieldName: string, value: string | number | null | undefined) {
    let error = '';
    switch (fieldName) {
      case 'name':
        if (!value || !String(value).trim()) {
          error = 'Name is required';
        }
        break;
      case 'website':
        if (value && String(value).trim()) {
          const urlStr = String(value).trim();
          if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
            error = 'Website must start with http:// or https://';
          }
        }
        break;
    }
    setFieldErrors((prev) => ({ ...prev, [fieldName]: error }));
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    // Validate all fields on submit
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Name is required';
    if (website.trim()) {
      if (!website.trim().startsWith('http://') && !website.trim().startsWith('https://')) {
        errors.website = 'Website must start with http:// or https://';
      }
    }
    setFieldErrors(errors);
    if (Object.values(errors).some((e) => e)) return;

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
        onBlur={(e) => validateField('name', e.target.value)}
        placeholder="e.g. AWS, Hetzner, DigitalOcean"
        required
        error={fieldErrors.name}
        disabled={loading}
      />
      <Input
        label="Website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        onBlur={(e) => validateField('website', e.target.value)}
        error={fieldErrors.website}
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
