import { COUNTRY_OPTIONS, countryName } from '@/lib/countries';
import { ACTIVITY_VALUES, activityOf } from '@/lib/activities';

export type Kind = 'spot' | 'school';

export type Field = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select';
  options?: string[];
  required?: boolean;
};

export const FIELDS: Record<Kind, Field[]> = {
  spot: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'activity', label: 'Activity', type: 'select', options: ACTIVITY_VALUES, required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'max_depth_m', label: 'Max depth (m)', type: 'number' },
    { key: 'level', label: 'Level / difficulty', type: 'select', options: ['beginner', 'intermediate', 'advanced'] },
    { key: 'best_season', label: 'Best season', type: 'text' },
    { key: 'country_code', label: 'Country', type: 'select', options: COUNTRY_OPTIONS },
  ],
  school: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'activity', label: 'Activity', type: 'select', options: ACTIVITY_VALUES, required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'country_code', label: 'Country', type: 'select', options: COUNTRY_OPTIONS },
    { key: 'website', label: 'Website', type: 'text' },
    { key: 'phone', label: 'Phone', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
  ],
};

// The fields that make sense for this activity (depth is only for diving)
export function fieldsFor(kind: Kind, activity: string | null | undefined): Field[] {
  return FIELDS[kind].filter((f) => f.key !== 'max_depth_m' || activity === 'diving');
}

// Text shown for an option of a select field
export function optionLabel(key: string, option: string): string {
  if (key === 'country_code') return countryName(option);
  if (key === 'activity') {
    const a = activityOf(option);
    return `${a.emoji} ${a.label}`;
  }
  return option;
}

export const inputClass =
  'w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900';

// Turns the form strings into values for the database, or returns an error text
export function buildPayload(
  fields: Field[],
  form: Record<string, string>
): { payload: Record<string, string | number | null> } | { error: string } {
  const payload: Record<string, string | number | null> = {};
  for (const f of fields) {
    const raw = (form[f.key] ?? '').trim();
    if (f.required && !raw) return { error: `${f.label} is required.` };
    if (f.type === 'number') {
      if (!raw) {
        payload[f.key] = null;
      } else {
        const n = Number(raw);
        if (!Number.isInteger(n) || n < 0) return { error: `${f.label} must be a whole number.` };
        payload[f.key] = n;
      }
    } else {
      payload[f.key] = raw || null;
    }
  }
  return { payload };
}
