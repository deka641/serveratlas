'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import type { Provider } from '@/lib/types';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';

interface ProviderFormData {
  name: string;
  website: string;
  support_contact: string;
  notes: string;
  monthly_budget: number | null;
  budget_currency: string;
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
  const [monthlyBudget, setMonthlyBudget] = useState(initialData?.monthly_budget != null ? String(initialData.monthly_budget) : '');
  const [budgetCurrency, setBudgetCurrency] = useState(initialData?.budget_currency ?? 'EUR');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isDirty = JSON.stringify({ name, website, supportContact, notes, monthlyBudget, budgetCurrency }) !==
    JSON.stringify({
      name: initialData?.name ?? '',
      website: initialData?.website ?? '',
      supportContact: initialData?.support_contact ?? '',
      notes: initialData?.notes ?? '',
      monthlyBudget: initialData?.monthly_budget != null ? String(initialData.monthly_budget) : '',
      budgetCurrency: initialData?.budget_currency ?? 'EUR',
    });
  useUnsavedChanges(isDirty);

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
      monthly_budget: monthlyBudget.trim() ? Number(monthlyBudget) : null,
      budget_currency: budgetCurrency,
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Monthly Budget"
          type="number"
          value={monthlyBudget}
          onChange={(e) => setMonthlyBudget(e.target.value)}
          placeholder="e.g. 500.00"
          disabled={loading}
        />
        <Select
          label="Budget Currency"
          value={budgetCurrency}
          onChange={(e) => setBudgetCurrency(e.target.value)}
          disabled={loading}
          options={[
            { value: 'EUR', label: 'EUR' },
            { value: 'USD', label: 'USD' },
            { value: 'GBP', label: 'GBP' },
          ]}
        />
      </div>
      <Textarea
        label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Additional notes about this provider..."
        disabled={loading}
      />
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
        <Button type="submit" loading={loading}>
          {initialData ? 'Update Provider' : 'Create Provider'}
        </Button>
      </div>
    </form>
  );
}
