'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SCHOOL_COLUMNS, SPOT_COLUMNS, type LngLat, type School, type Spot } from '@/lib/types';
import { FIELDS, buildPayload, inputClass, type Kind } from '@/lib/fields';
import { countryName } from '@/lib/countries';

type Props = {
  kind: Kind;
  at: LngLat;
  isAdmin: boolean;
  onCancel: () => void;
  onCreated: (kind: Kind, created: Spot | School) => void;
};

export default function CreatePanel({ kind, at, isAdmin, onCancel, onCreated }: Props) {
  const fields = FIELDS[kind];
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // try to fill in the country from the pin position (you can change it)
  const lng = at[0];
  const lat = at[1];
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=3&accept-language=en&lat=${lat}&lon=${lng}`
        );
        if (!res.ok) return;
        const data = await res.json();
        const code = String(data?.address?.country_code ?? '').toUpperCase();
        if (!cancelled && /^[A-Z]{2}$/.test(code)) {
          setForm((f) => (f.country_code ? f : { ...f, country_code: code }));
        }
      } catch {
        // no problem: the country can be chosen by hand
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  async function create() {
    const built = buildPayload(fields, form);
    if ('error' in built) {
      setError(built.error);
      return;
    }
    const payload: Record<string, string | number | boolean | null> = {
      ...built.payload,
      location: `POINT(${at[0]} ${at[1]})`, // longitude latitude
    };
    if (kind === 'spot') payload.is_verified = isAdmin; // the database enforces this for non-admins

    setSaving(true);
    setError('');
    const table = kind === 'spot' ? 'spots' : 'schools';
    const columns = kind === 'spot' ? SPOT_COLUMNS : SCHOOL_COLUMNS;
    const { data, error: err } = await supabase.from(table).insert(payload).select(columns).single();
    setSaving(false);

    if (err || !data) {
      console.error('create error:', err?.message);
      setError(`Could not create it. ${err?.message ?? ''}`);
      return;
    }
    onCreated(kind, data as unknown as Spot | School);
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
            New {kind === 'spot' ? 'dive spot' : 'dive school'}
          </span>
          <p className="mt-2 text-xs text-gray-500">
            Location: {at[1].toFixed(5)}, {at[0].toFixed(5)}. Click the map again to move the pin.
          </p>
        </div>
        <button
          onClick={onCancel}
          aria-label="Cancel"
          className="rounded px-2 text-2xl leading-none text-gray-500 hover:bg-gray-100"
        >
          ×
        </button>
      </div>

      <div className="space-y-4">
        {fields.map((f) => (
          <label key={f.key} className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">
              {f.label}
              {f.required && ' *'}
            </span>
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
                    {f.key === 'country_code' ? countryName(o) : o}
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

        {kind === 'spot' && !isAdmin && (
          <p className="text-xs text-gray-500">
            New spots are shown as community-added until an admin has checked them.
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={create}
            disabled={saving}
            className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Create'}
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </aside>
  );
}
