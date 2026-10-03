'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SCHOOL_COLUMNS, SPOT_COLUMNS, type School, type Spot } from '@/lib/types';

type Kind = 'spot' | 'school';

type Field = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select';
  options?: string[];
  required?: boolean;
};

const FIELDS: Record<Kind, Field[]> = {
  spot: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'max_depth_m', label: 'Max depth (m)', type: 'number' },
    { key: 'level', label: 'Level', type: 'select', options: ['beginner', 'intermediate', 'advanced'] },
    { key: 'best_season', label: 'Best season', type: 'text' },
  ],
  school: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'website', label: 'Website', type: 'text' },
    { key: 'phone', label: 'Phone', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
  ],
};

const inputClass =
  'w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900';

function renderValue(f: Field, v: string | number | null) {
  if (v == null || v === '') return <span className="text-gray-400">—</span>;
  if (f.key === 'max_depth_m') return `${v} m`;
  if (f.key === 'website') {
    const url = String(v);
    return /^https?:\/\//i.test(url) ? (
      <a className="break-all text-sky-700 underline" href={url} target="_blank" rel="noopener noreferrer">
        {url}
      </a>
    ) : (
      url
    );
  }
  return String(v);
}

type Props = {
  kind: Kind;
  item: Spot | School;
  canEdit: boolean;
  hint?: string;
  onClose: () => void;
  onSaved: (kind: Kind, updated: Spot | School) => void;
};

export default function SidePanel({ kind, item, canEdit, hint, onClose, onSaved }: Props) {
  const fields = FIELDS[kind];
  const record = item as unknown as Record<string, string | number | null>;

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function startEdit() {
    const initial: Record<string, string> = {};
    fields.forEach((f) => {
      initial[f.key] = record[f.key] == null ? '' : String(record[f.key]);
    });
    setForm(initial);
    setError('');
    setEditing(true);
  }

  async function save() {
    const payload: Record<string, string | number | null> = {};
    for (const f of fields) {
      const raw = (form[f.key] ?? '').trim();
      if (f.required && !raw) {
        setError(`${f.label} is required.`);
        return;
      }
      if (f.type === 'number') {
        if (!raw) {
          payload[f.key] = null;
        } else {
          const n = Number(raw);
          if (!Number.isInteger(n) || n < 0) {
            setError(`${f.label} must be a whole number.`);
            return;
          }
          payload[f.key] = n;
        }
      } else {
        payload[f.key] = raw || null;
      }
    }

    setSaving(true);
    setError('');
    const table = kind === 'spot' ? 'spots' : 'schools';
    const columns = kind === 'spot' ? SPOT_COLUMNS : SCHOOL_COLUMNS;
    const { data, error: err } = await supabase
      .from(table)
      .update(payload)
      .eq('id', item.id)
      .select(columns)
      .single();
    setSaving(false);

    if (err || !data) {
      console.error('save error:', err?.message);
      setError('Could not save. You may not have permission to edit this.');
      return;
    }
    onSaved(kind, data as unknown as Spot | School);
    setEditing(false);
  }

  return (
    <aside className="absolute left-0 top-0 z-20 h-full w-full overflow-y-auto bg-white p-5 text-gray-900 shadow-xl sm:w-96">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium text-white ${
              kind === 'spot' ? 'bg-sky-500' : 'bg-orange-500'
            }`}
          >
            {kind === 'spot' ? 'Dive spot' : 'Dive school'}
          </span>
          {!editing && <h2 className="mt-2 text-xl font-semibold">{item.name}</h2>}
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="rounded px-2 text-2xl leading-none text-gray-500 hover:bg-gray-100"
        >
          ×
        </button>
      </div>

      {editing ? (
        <div className="space-y-4">
          {fields.map((f) => (
            <label key={f.key} className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">{f.label}</span>
              {f.type === 'textarea' ? (
                <textarea
                  rows={4}
                  className={inputClass}
                  value={form[f.key] ?? ''}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              ) : f.type === 'select' ? (
                <select
                  className={inputClass}
                  value={form[f.key] ?? ''}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                >
                  <option value="">—</option>
                  {f.options?.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type === 'number' ? 'number' : 'text'}
                  min={f.type === 'number' ? 0 : undefined}
                  className={inputClass}
                  value={form[f.key] ?? ''}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              )}
            </label>
          ))}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => setEditing(false)}
              disabled={saving}
              className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {fields
            .filter((f) => f.key !== 'name')
            .map((f) => (
              <div key={f.key}>
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {f.label}
                </div>
                <div className="mt-0.5 whitespace-pre-wrap text-sm">
                  {renderValue(f, record[f.key])}
                </div>
              </div>
            ))}
          {canEdit ? (
            <button
              onClick={startEdit}
              className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
            >
              Edit
            </button>
          ) : (
            hint && <p className="text-xs text-gray-400">{hint}</p>
          )}
        </div>
      )}
    </aside>
  );
}
