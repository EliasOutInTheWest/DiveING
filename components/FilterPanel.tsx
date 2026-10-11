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

const selectClass =
  'w-full rounded-xl border border-[#0a2a33]/15 bg-white px-3 py-2 text-sm text-[#12303a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5b2e]';
const labelClass = 'mb-1.5 block text-xs font-semibold text-[#5b7a80]';

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
    <div className="absolute left-0 top-full z-20 mt-2 w-80 space-y-4 rounded-2xl bg-white p-4 text-sm text-[#12303a] shadow-xl ring-1 ring-[#0a2a33]/10">
      <div>
        <div className={labelClass}>Level / difficulty</div>
        <div className="flex flex-wrap gap-1.5">
          {LEVELS.map((l) => {
            const on = filters.levels.includes(l.value);
            return (
              <button
                key={l.value}
                onClick={() => toggleLevel(l.value)}
                aria-pressed={on}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5b2e] ${
                  on
                    ? 'border-[#0a2a33] bg-[#0a2a33] text-white'
                    : 'border-[#0a2a33]/15 text-[#12303a] hover:border-[#0a2a33]/40'
                }`}
              >
                {l.label}
              </button>
            );
          })}
        </div>
      </div>

      <label className="block">
        <span className={labelClass}>Country</span>
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
          <span className={labelClass}>Depth (dive spots)</span>
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
            <span className="mt-1.5 block text-xs text-[#5b7a80]">
              Spots without depth data are hidden while a depth filter is on.
            </span>
          )}
        </label>
      )}

      <div className="space-y-1.5">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[#ff5b2e]"
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
            className="h-4 w-4 accent-[#ff5b2e]"
            checked={filters.showSchools}
            onChange={(e) => onChange({ ...filters, showSchools: e.target.checked })}
          />
          <span>Show schools and providers</span>
        </label>
      </div>

      <div className="flex items-center justify-between border-t border-[#0a2a33]/10 pt-3">
        <span className="text-xs text-[#5b7a80]">
          Showing {shown} of {total} spots
        </span>
        <button
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="text-xs font-semibold text-[#ff5b2e] hover:underline"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
