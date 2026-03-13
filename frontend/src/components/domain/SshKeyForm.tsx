'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SshKey, SshKeyType } from '@/lib/types';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';

interface SshKeyFormProps {
  initialData?: Partial<SshKey>;
  onSubmit: (data: Partial<SshKey>) => void;
  loading: boolean;
  error?: string | null;
}

const keyTypeOptions = [
  { value: 'rsa', label: 'RSA' },
  { value: 'ed25519', label: 'Ed25519' },
  { value: 'ecdsa', label: 'ECDSA' },
  { value: 'dsa', label: 'DSA' },
];

export default function SshKeyForm({ initialData, onSubmit, loading, error }: SshKeyFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialData?.name || '');
  const [keyType, setKeyType] = useState<SshKeyType | ''>(initialData?.key_type || '');
  const [fingerprint, setFingerprint] = useState(initialData?.fingerprint || '');
  const [publicKey, setPublicKey] = useState(initialData?.public_key || '');
  const [comment, setComment] = useState(initialData?.comment || '');
  const [notes, setNotes] = useState(initialData?.notes || '');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validateField(fieldName: string, value: string | number | null | undefined) {
    let error = '';
    switch (fieldName) {
      case 'name':
        if (!value || !String(value).trim()) {
          error = 'Name is required';
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
    setFieldErrors(errors);
    if (Object.values(errors).some((e) => e)) return;

    onSubmit({
      name,
      key_type: keyType || null,
      fingerprint: fingerprint || null,
      public_key: publicKey || null,
      comment: comment || null,
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
        placeholder="My SSH Key"
      />

      <Select
        label="Key Type"
        value={keyType}
        onChange={(e) => setKeyType(e.target.value as SshKeyType)}
        options={keyTypeOptions}
        placeholder="Select key type"
      />

      <Input
        label="Fingerprint"
        value={fingerprint}
        onChange={(e) => setFingerprint(e.target.value)}
        placeholder="SHA256:..."
      />

      <Textarea
        label="Public Key"
        value={publicKey}
        onChange={(e) => setPublicKey(e.target.value)}
        placeholder="ssh-ed25519 AAAA..."
        rows={4}
      />

      <Input
        label="Comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="user@hostname"
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
        <Button type="submit" disabled={!name.trim()} loading={loading}>
          {initialData ? 'Update SSH Key' : 'Create SSH Key'}
        </Button>
      </div>
    </form>
  );
}
