'use client';

import { DEFAULT_FILTERS, DEPTH_OPTIONS, type Filters } from '@/lib/filters';
import { countryName } from '@/lib/countries';

// difficulty works for every activity
const LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'unknown', label: 'Not set' },
];

const selectClass = 'w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900';

type Props = {
  filters: Filters;
  onChange: (f: Filters) => void;
  countryCodes: string[]; // countries that exist in the data
  hasUnknownCountry: boolean;
  shown: number;
  total: number;
  loggedIn: boolean;
  showDepth: boolean; // only useful when diving is part of the chosen activities
};

export default function FilterPanel({
  filters,
  onChange,
  countryCodes,
  hasUnknownCountry,
  shown,
  total,
  loggedIn,
  showDepth,
}: Props) {
  function toggleLevel(value: string) {
    onChange({
      ...filters,
      levels: filters.levels.includes(value)
        ? filters.levels.filter((l) => l !== value)
        : [...filters.levels, value],
    });
  }

  const sortedCountries = [...countryCodes].sort((a, b) => countryName(a).localeCompare(countryName(b)));

  return (
    <div className="absolute left-0 top-full mt-2 w-72 space-y-3 rounded bg-white p-3 text-sm text-gray-900 shadow-lg">
      <div>
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">Level / difficulty</div>
        <div className="flex flex-wrap gap-1.5">
          {LEVELS.map((l) => {
            const on = filters.levels.includes(l.value);
            return (
              <button
                key={l.value}
                onClick={() => toggleLevel(l.value)}
                aria-pressed={on}
                className={`rounded-full border px-2.5 py-0.5 text-xs ${
                  on
                    ? 'border-sky-600 bg-sky-600 text-white'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {l.label}
              </button>
            );
          })}
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Country</span>
        <select
          className={selectClass}
          value={filters.country}
          onChange={(e) => onChange({ ...filters, country: e.target.value })}
        >
          <option value="">All countries</option>
          {sortedCountries.map((c) => (
            <option key={c} value={c}>
              {countryName(c)}
            </option>
          ))}
          {hasUnknownCountry && <option value="unknown">Not set</option>}
        </select>
      </label>

      {showDepth && (
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Depth (dive spots)</span>
          <select
            className={selectClass}
            value={filters.depth}
            onChange={(e) => onChange({ ...filters, depth: e.target.value })}
          >
            {DEPTH_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          {filters.depth !== 'any' && (
            <span className="mt-1 block text-xs text-gray-500">
              Spots without depth data are hidden while a depth filter is on.
            </span>
          )}
        </label>
      )}

      <div className="space-y-1.5">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.favouritesOnly}
            disabled={!loggedIn}
            onChange={(e) => onChange({ ...filters, favouritesOnly: e.target.checked })}
          />
          <span className={loggedIn ? '' : 'text-gray-400'}>♥ Favourites only</span>
        </label>
        {!loggedIn && <p className="pl-6 text-xs text-gray-400">Log in to use favourites.</p>}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.showSchools}
            onChange={(e) => onChange({ ...filters, showSchools: e.target.checked })}
          />
          <span>Show schools and providers</span>
        </label>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-2">
        <span className="text-xs text-gray-600">
          Showing {shown} of {total} spots
        </span>
        <button
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="text-xs font-medium text-sky-700 hover:underline"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
