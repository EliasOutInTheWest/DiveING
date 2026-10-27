import { supabase } from '@/lib/supabase';

// Which of these people have DiveING Plus (gold frame, badge)?  One request for a whole list.
// Answers are remembered for 5 minutes. If plus.sql was not run yet, nobody is shown as Plus.
const cache = new Map<string, { plus: boolean; at: number }>();
const TTL = 5 * 60 * 1000;

export async function fetchPlusIds(ids: string[]): Promise<Set<string>> {
  const now = Date.now();
  const unique = [...new Set(ids.filter(Boolean))];
  const missing = unique.filter((id) => {
    const c = cache.get(id);
    return !c || now - c.at > TTL;
  });
  if (missing.length > 0) {
    const { data, error } = await supabase.rpc('plus_ids', { p_ids: missing.slice(0, 200) });
    if (!error && Array.isArray(data)) {
      const plus = new Set(data as string[]);
      for (const id of missing) cache.set(id, { plus: plus.has(id), at: now });
    }
  }
  return new Set(unique.filter((id) => cache.get(id)?.plus));
}

// Adds is_plus to a list of rows that have an id (or user_id)
export async function withPlus<T extends { id: string }>(rows: T[]): Promise<(T & { is_plus: boolean })[]> {
  if (rows.length === 0) return [];
  const plus = await fetchPlusIds(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, is_plus: plus.has(r.id) }));
}
