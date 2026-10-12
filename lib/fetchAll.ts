import { supabase } from '@/lib/supabase';

// Supabase returns at most 1000 rows per request. This loads a whole table page by page,
// so the map keeps working when you import thousands of spots.
const PAGE = 1000;

export async function fetchAll<T>(
  table: string,
  columns: string
): Promise<{ data: T[]; error: string | null }> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order('id') // a fixed order, so no row is skipped or repeated between pages
      .range(from, from + PAGE - 1);
    if (error) return { data: rows, error: error.message };
    const page = (data ?? []) as unknown as T[];
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return { data: rows, error: null };
}
