import { supabase } from '@/lib/supabase';

export type Entry = {
  id: string;
  entry_date: string; // YYYY-MM-DD
  activity: string;
  title: string;
  place: string | null;
  spot_id: string | null;
  depth_m: number | null;
  duration_min: number | null;
  distance_km: number | null;
  buddy: string | null;
  notes: string | null;
};

export type EntryInput = Omit<Entry, 'id'>;

export const ENTRY_COLUMNS = 'id,entry_date,activity,title,place,spot_id,depth_m,duration_min,distance_km,buddy,notes';

export async function loadEntries(): Promise<{ data: Entry[]; error: string | null }> {
  const { data, error } = await supabase
    .from('logbook_entries')
    .select(ENTRY_COLUMNS)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5000);
  if (error) return { data: [], error: error.message };
  return {
    data: ((data ?? []) as Entry[]).map((e) => ({
      ...e,
      depth_m: e.depth_m === null ? null : Number(e.depth_m),
      distance_km: e.distance_km === null ? null : Number(e.distance_km),
    })),
    error: null,
  };
}

export async function saveEntry(id: string | null, input: EntryInput): Promise<string | null> {
  const { error } = id
    ? await supabase.from('logbook_entries').update(input).eq('id', id)
    : await supabase.from('logbook_entries').insert(input);
  return error ? error.message : null;
}

export async function deleteEntry(id: string): Promise<string | null> {
  const { error } = await supabase.from('logbook_entries').delete().eq('id', id);
  return error ? error.message : null;
}

export type Stats = {
  entries: number;
  thisYear: number;
  minutes: number;
  deepest: number | null;
  km: number;
  places: number;
};

export function stats(list: Entry[]): Stats {
  const year = String(new Date().getFullYear());
  const places = new Set<string>();
  let minutes = 0;
  let km = 0;
  let deepest: number | null = null;
  let thisYear = 0;
  for (const e of list) {
    minutes += e.duration_min ?? 0;
    km += e.distance_km ?? 0;
    if (e.depth_m !== null && (deepest === null || e.depth_m > deepest)) deepest = e.depth_m;
    if (e.entry_date.startsWith(year)) thisYear++;
    const key = e.spot_id ?? e.place?.trim().toLowerCase();
    if (key) places.add(key);
  }
  return { entries: list.length, thisYear, minutes, deepest, km: Math.round(km * 10) / 10, places: places.size };
}

export function fmtMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

// A file for a spreadsheet. Cells that start with = + - @ get a leading quote so they are never run as a formula.
export function toCsv(list: Entry[]): string {
  const cell = (v: unknown) => {
    let t = v === null || v === undefined ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
    return `"${t.replace(/"/g, '""')}"`;
  };
  const head = ['Date', 'Activity', 'Title', 'Place', 'Depth (m)', 'Duration (min)', 'Distance (km)', 'Buddy', 'Notes'];
  const rows = list.map((e) =>
    [e.entry_date, e.activity, e.title, e.place, e.depth_m, e.duration_min, e.distance_km, e.buddy, e.notes].map(cell).join(',')
  );
  return '﻿' + [head.map(cell).join(','), ...rows].join('\r\n');
}
