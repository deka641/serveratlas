'use client';

import { useState, useRef } from 'react';
import { api } from '@/lib/api';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface ServerImportModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

function parseCsvRow(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i < line.length) {
    // Skip leading whitespace
    while (i < line.length && line[i] === ' ') i++;
    if (i >= line.length) { fields.push(''); break; }
    if (line[i] === '"') {
      // Quoted field: collect until closing quote (doubled quotes are escaped)
      i++; // skip opening quote
      let val = '';
      while (i < line.length) {
        if (line[i] === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            val += '"';
            i += 2;
          } else {
            i++; // skip closing quote
            break;
          }
        } else {
          val += line[i];
          i++;
        }
      }
      fields.push(val);
      // Skip to next comma or end
      while (i < line.length && line[i] !== ',') i++;
      i++; // skip comma
    } else {
      // Unquoted field
      let val = '';
      while (i < line.length && line[i] !== ',') {
        val += line[i];
        i++;
      }
      fields.push(val.trim());
      i++; // skip comma
    }
  }
  return fields;
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split('\n').filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = parseCsvRow(lines[0]);
  const rows = lines.slice(1).map((line) => parseCsvRow(line));
  return { headers, rows };
}

const FIELD_MAP: Record<string, string> = {
  name: 'name', hostname: 'hostname', ip_v4: 'ip_v4', ipv4: 'ip_v4', ip: 'ip_v4',
  os: 'os', location: 'location', datacenter: 'datacenter', status: 'status',
  provider: 'provider_name', provider_name: 'provider_name',
  cpu_cores: 'cpu_cores', cpu: 'cpu_cores', ram_mb: 'ram_mb', ram: 'ram_mb',
  disk_gb: 'disk_gb', disk: 'disk_gb', monthly_cost: 'monthly_cost', cost: 'monthly_cost',
  login_user: 'login_user', notes: 'notes',
};

export default function ServerImportModal({ open, onClose, onComplete }: ServerImportModalProps) {
  const { addToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [loading, setLoading] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers: h, rows: r } = parseCsv(text);
      setHeaders(h);
      setRows(r);
    };
    reader.readAsText(file);
  }

  function mapHeaders(): string[] {
    return headers.map((h) => {
      const normalized = h.toLowerCase().replace(/[\s-]/g, '_');
      return FIELD_MAP[normalized] || normalized;
    });
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setLoading(true);
    try {
      const mapped = mapHeaders();
      const servers = rows.map((row) => {
        const obj: Record<string, unknown> = {};
        mapped.forEach((field, idx) => {
          if (field && row[idx]) {
            const val = row[idx];
            if (['cpu_cores', 'ram_mb', 'disk_gb'].includes(field)) {
              obj[field] = parseInt(val, 10) || null;
            } else if (field === 'monthly_cost') {
              obj[field] = parseFloat(val) || null;
            } else {
              obj[field] = val;
            }
          }
        });
        return obj as { name: string; [key: string]: unknown };
      }).filter((s) => s.name);

      const result = await api.importServers({ servers, skip_duplicates: skipDuplicates });
      addToast('success', `Import complete: ${result.created} created, ${result.skipped} skipped`);
      if (result.errors.length > 0) {
        addToast('error', `${result.errors.length} error(s): ${result.errors[0]}`);
      }
      onComplete();
      onClose();
      setHeaders([]);
      setRows([]);
    } catch {
      addToast('error', 'Failed to import servers');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setHeaders([]);
    setRows([]);
    onClose();
  }

  return (
    <Modal open={open} title="Import Servers from CSV" onClose={handleClose} dismissable={false}>
      <div className="space-y-4">
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFile}
            className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {headers.length > 0 && (
          <>
            <div className="text-sm text-gray-600">
              <span className="font-medium">{rows.length}</span> row(s) found with columns:{' '}
              <span className="font-mono text-xs">{headers.join(', ')}</span>
            </div>

            {rows.length > 0 && (
              <div className="max-h-40 overflow-auto rounded border text-xs">
                <table className="w-full text-left">
                  <thead className="bg-gray-50">
                    <tr>
                      {headers.map((h, i) => (
                        <th key={i} className="px-2 py-1 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((row, ri) => (
                      <tr key={ri} className="border-t">
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-2 py-1 truncate max-w-[120px]">{cell}</td>
                        ))}
                      </tr>
                    ))}
                    {rows.length > 5 && (
                      <tr className="border-t">
                        <td colSpan={headers.length} className="px-2 py-1 text-gray-400 italic">
                          ... and {rows.length - 5} more row(s)
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
                className="rounded border-gray-300"
              />
              Skip duplicate server names
            </label>
          </>
        )}

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleImport} disabled={rows.length === 0 || loading}>
            {loading ? 'Importing...' : `Import ${rows.length} Server(s)`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
