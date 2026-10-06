import type { School, Spot } from '@/lib/types';

export type Filters = {
  levels: string[]; // 'beginner' | 'intermediate' | 'advanced' | 'unknown' (empty = all)
  country: string; // '' = all, 'unknown' = not set, otherwise a country code
  depth: string; // see DEPTH_OPTIONS
  favouritesOnly: boolean;
  showSchools: boolean;
};

export const DEFAULT_FILTERS: Filters = {
  levels: [],
  country: '',
  depth: 'any',
  favouritesOnly: false,
  showSchools: true,
};

export const DEPTH_OPTIONS: { value: string; label: string; min: number | null; max: number | null }[] = [
  { value: 'any', label: 'Any depth', min: null, max: null },
  { value: '0-12', label: 'Shallow: up to 12 m', min: 0, max: 12 },
  { value: '0-18', label: 'Up to 18 m (Open Water limit)', min: 0, max: 18 },
  { value: '0-30', label: 'Up to 30 m (Advanced limit)', min: 0, max: 30 },
  { value: '0-40', label: 'Up to 40 m (recreational limit)', min: 0, max: 40 },
  { value: '30+', label: '30 m and deeper', min: 30, max: null },
];

export function activeFilterCount(f: Filters): number {
  return (
    (f.levels.length > 0 ? 1 : 0) +
    (f.country ? 1 : 0) +
    (f.depth !== 'any' ? 1 : 0) +
    (f.favouritesOnly ? 1 : 0) +
    (f.showSchools ? 0 : 1)
  );
}

function countryOk(filter: string, code: string | null): boolean {
  if (!filter) return true;
  if (filter === 'unknown') return !code;
  return code === filter;
}

export function applyFilters(spots: Spot[], schools: School[], f: Filters, liked: Set<string>) {
  const depth = DEPTH_OPTIONS.find((d) => d.value === f.depth);

  const visibleSpots = spots.filter((s) => {
    if (f.levels.length > 0 && !f.levels.includes(s.level ?? 'unknown')) return false;
    if (!countryOk(f.country, s.country_code)) return false;
    if (depth && (depth.min !== null || depth.max !== null)) {
      if (s.max_depth_m == null) return false; // no depth data: hidden while a depth filter is on
      if (depth.min !== null && s.max_depth_m < depth.min) return false;
      if (depth.max !== null && s.max_depth_m > depth.max) return false;
    }
    if (f.favouritesOnly && !liked.has(s.id)) return false;
    return true;
  });

  const visibleSchools = f.showSchools ? schools.filter((s) => countryOk(f.country, s.country_code)) : [];

  return { visibleSpots, visibleSchools };
}
