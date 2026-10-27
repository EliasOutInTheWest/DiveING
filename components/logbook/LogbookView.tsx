'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import PlusPrompt from '@/components/billing/PlusPrompt';
import { ACTIVITIES, activityOf } from '@/lib/activities';
import { deleteEntry, fmtMinutes, loadEntries, saveEntry, stats, toCsv, type Entry, type EntryInput } from '@/lib/logbook';
import { supabase } from '@/lib/supabase';

const today = () => new Date().toISOString().slice(0, 10);

type Form = {
  entry_date: string;
  activity: string;
  title: string;
  place: string;
  spot_id: string | null;
  depth_m: string;
  duration_min: string;
  distance_km: string;
  buddy: string;
  notes: string;
};

const emptyForm = (activity = 'diving'): Form => ({
  entry_date: today(),
  activity,
  title: '',
  place: '',
  spot_id: null,
  depth_m: '',
  duration_min: '',
  distance_km: '',
  buddy: '',
  notes: '',
});

const fromEntry = (e: Entry): Form => ({
  entry_date: e.entry_date,
  activity: e.activity,
  title: e.title,
  place: e.place ?? '',
  spot_id: e.spot_id,
  depth_m: e.depth_m === null ? '' : String(e.depth_m),
  duration_min: e.duration_min === null ? '' : String(e.duration_min),
  distance_km: e.distance_km === null ? '' : String(e.distance_km),
  buddy: e.buddy ?? '',
  notes: e.notes ?? '',
});

const num = (v: string): number | null => {
  const t = v.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

const monthLabel = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
const dayLabel = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

const input = 'w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900';

export default function LogbookView() {
  const { user, isVerified, isPlus, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<Form>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [suggest, setSuggest] = useState<{ id: string; name: string }[]>([]);

  const uid = user?.id;
  const load = useCallback(async () => {
    const { data, error } = await loadEntries();
    if (error) {
      setLoadError(error);
      setState('error');
      return;
    }
    setEntries(data);
    setState('ok');
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!uid) {
      setState('ok');
      return;
    }
    void load();
  }, [authLoading, uid, load]);

  // spot suggestions while typing the place
  useEffect(() => {
    const q = form.place.trim();
    if (editing === null || q.length < 2 || form.spot_id) {
      setSuggest([]);
      return;
    }
    const t = window.setTimeout(async () => {
      const safe = q.replace(/[%_\\]/g, (c) => '\\' + c);
      const { data } = await supabase.from('spots').select('id,name').ilike('name', `%${safe}%`).limit(6);
      setSuggest((data as { id: string; name: string }[] | null) ?? []);
    }, 250);
    return () => window.clearTimeout(t);
  }, [form.place, form.spot_id, editing]);

  const shown = useMemo(() => (filter === 'all' ? entries : entries.filter((e) => e.activity === filter)), [entries, filter]);
  const s = useMemo(() => stats(shown), [shown]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of entries) c[e.activity] = (c[e.activity] ?? 0) + 1;
    return c;
  }, [entries]);

  const groups = useMemo(() => {
    const out: { month: string; items: Entry[] }[] = [];
    for (const e of shown) {
      const m = monthLabel(e.entry_date);
      const last = out[out.length - 1];
      if (last && last.month === m) last.items.push(e);
      else out.push({ month: m, items: [e] });
    }
    return out;
  }, [shown]);

  function startNew() {
    setForm(emptyForm(filter !== 'all' ? filter : 'diving'));
    setEditing('new');
    setError('');
  }
  function startEdit(e: Entry) {
    setForm(fromEntry(e));
    setEditing(e.id);
    setError('');
  }

  async function submit() {
    const title = form.title.trim();
    if (!title) return setError('Please give the entry a title.');
    const depth = num(form.depth_m);
    const dur = num(form.duration_min);
    const dist = num(form.distance_km);
    if ([depth, dur, dist].some((n) => Number.isNaN(n))) return setError('Depth, time and distance must be numbers (0 or more).');
    const payload: EntryInput = {
      entry_date: form.entry_date || today(),
      activity: form.activity,
      title,
      place: form.place.trim() || null,
      spot_id: form.spot_id,
      depth_m: depth,
      duration_min: dur === null ? null : Math.round(dur),
      distance_km: dist,
      buddy: form.buddy.trim() || null,
      notes: form.notes.trim() || null,
    };
    setSaving(true);
    setError('');
    const err = await saveEntry(editing === 'new' ? null : editing, payload);
    setSaving(false);
    if (err) return setError(err);
    setEditing(null);
    await load();
  }

  async function remove(e: Entry) {
    if (!window.confirm(`Delete "${e.title}" from your logbook?`)) return;
    const err = await deleteEntry(e.id);
    if (err) return window.alert(err);
    setEntries((prev) => prev.filter((x) => x.id !== e.id));
  }

  function exportCsv() {
    const blob = new Blob([toCsv(entries)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diveing-logbook-${today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (authLoading || state === 'loading') return <p className="py-16 text-center text-sm text-gray-500">Loading…</p>;

  if (!user) {
    return (
      <div className="dv-glass rounded-3xl p-6 text-center">
        <div className="dv-title text-2xl">📓 Your logbook</div>
        <p className="mt-2 text-sm text-gray-600">Log in (top right) to see your logbook.</p>
      </div>
    );
  }

  const canWrite = isPlus && isVerified;
  const statCards: { label: string; value: string }[] = [
    { label: 'Entries', value: String(s.entries) },
    { label: 'This year', value: String(s.thisYear) },
    { label: 'Time out there', value: s.minutes ? fmtMinutes(s.minutes) : '–' },
    ...(s.deepest !== null ? [{ label: 'Deepest', value: `${s.deepest} m` }] : []),
    ...(s.km > 0 ? [{ label: 'Distance', value: `${s.km} km` }] : []),
    { label: 'Places', value: String(s.places) },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="dv-title text-3xl">📓 My logbook</h1>
          <p className="mt-1 text-sm text-gray-600">Your private adventures. Only you can see this.</p>
        </div>
        <div className="flex gap-2">
          {entries.length > 0 && (
            <button onClick={exportCsv} className="rounded-full border border-gray-300 bg-gray-50 px-4 py-1.5 text-sm font-semibold hover:bg-gray-200">
              ⬇ Export
            </button>
          )}
          {canWrite && editing === null && (
            <button onClick={startNew} className="rounded-full bg-sky-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-sky-700">
              + New entry
            </button>
          )}
        </div>
      </div>

      {state === 'error' && (
        <p className="mt-4 rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-600">
          Could not load the logbook ({loadError}). Did you run plus.sql in Supabase?
        </p>
      )}

      {!isPlus && (
        <div className="mt-4">
          <PlusPrompt variant="inline" />
          {entries.length > 0 && <p className="mt-2 text-xs text-gray-500">Your old entries stay here. You can read, export and delete them, but adding new ones needs DiveING Plus.</p>}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {statCards.map((c) => (
          <div key={c.label} className="dv-glass rounded-2xl px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{c.label}</div>
            <div className="dv-title text-xl">{c.value}</div>
          </div>
        ))}
      </div>

      {entries.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Filter by activity">
          <button onClick={() => setFilter('all')} className={`rounded-full px-3 py-1 text-sm font-medium ${filter === 'all' ? 'dv-active' : 'text-white/80 hover:text-white'}`}>
            All {entries.length}
          </button>
          {ACTIVITIES.filter((a) => counts[a.value]).map((a) => (
            <button
              key={a.value}
              onClick={() => setFilter(a.value)}
              className={`rounded-full px-3 py-1 text-sm font-medium ${filter === a.value ? 'dv-active' : 'text-white/80 hover:text-white'}`}
            >
              {a.emoji} {counts[a.value]}
            </button>
          ))}
        </div>
      )}

      {editing !== null && canWrite && (
        <section className="dv-glass dv-pop mt-4 rounded-3xl p-4 sm:p-5">
          <h2 className="dv-title text-lg">{editing === 'new' ? 'New entry' : 'Edit entry'}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-gray-700">
              Date
              <input type="date" max={today()} value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} className={`mt-1 ${input}`} />
            </label>
            <label className="text-xs font-medium text-gray-700">
              Activity
              <select value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value })} className={`mt-1 ${input}`}>
                {ACTIVITIES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.emoji} {a.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-gray-700 sm:col-span-2">
              Title
              <input maxLength={80} placeholder="e.g. Morning dive at the reef" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`mt-1 ${input}`} />
            </label>
            <div className="relative text-xs font-medium text-gray-700 sm:col-span-2">
              <label>
                Place
                <input
                  maxLength={120}
                  placeholder="Type to find a spot, or write any place"
                  value={form.place}
                  onChange={(e) => setForm({ ...form, place: e.target.value, spot_id: null })}
                  className={`mt-1 ${input}`}
                />
              </label>
              {suggest.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-gray-300 bg-white shadow-lg">
                  {suggest.map((sp) => (
                    <li key={sp.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setForm({ ...form, place: sp.name, spot_id: sp.id });
                          setSuggest([]);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100"
                      >
                        📍 {sp.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {form.spot_id && <span className="mt-1 block text-[11px] text-emerald-600">Linked to a spot on the map ✓</span>}
            </div>
            <label className="text-xs font-medium text-gray-700">
              Depth (m)
              <input inputMode="decimal" placeholder="optional" value={form.depth_m} onChange={(e) => setForm({ ...form, depth_m: e.target.value })} className={`mt-1 ${input}`} />
            </label>
            <label className="text-xs font-medium text-gray-700">
              Time (minutes)
              <input inputMode="numeric" placeholder="optional" value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: e.target.value })} className={`mt-1 ${input}`} />
            </label>
            <label className="text-xs font-medium text-gray-700">
              Distance (km)
              <input inputMode="decimal" placeholder="optional" value={form.distance_km} onChange={(e) => setForm({ ...form, distance_km: e.target.value })} className={`mt-1 ${input}`} />
            </label>
            <label className="text-xs font-medium text-gray-700">
              Buddy / group
              <input maxLength={80} placeholder="optional" value={form.buddy} onChange={(e) => setForm({ ...form, buddy: e.target.value })} className={`mt-1 ${input}`} />
            </label>
            <label className="text-xs font-medium text-gray-700 sm:col-span-2">
              Notes
              <textarea rows={4} maxLength={2000} placeholder="Conditions, what you saw, how it felt…" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`mt-1 ${input}`} />
            </label>
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <div className="mt-4 flex gap-2">
            <button onClick={submit} disabled={saving} className="rounded-full bg-sky-600 px-5 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-60">
              {saving ? 'Saving…' : 'Save entry'}
            </button>
            <button onClick={() => setEditing(null)} disabled={saving} className="rounded-full border border-gray-300 px-5 py-2 text-sm hover:bg-white/10">
              Cancel
            </button>
          </div>
        </section>
      )}

      {state === 'ok' && entries.length === 0 && editing === null && (
        <div className="dv-glass mt-4 rounded-3xl p-8 text-center">
          <div className="text-4xl">📓</div>
          <p className="mt-2 text-sm text-gray-600">
            {canWrite ? 'Your logbook is empty. Write down your first adventure.' : 'Your logbook is empty.'}
          </p>
          {canWrite && (
            <button onClick={startNew} className="mt-3 rounded-full bg-sky-600 px-5 py-2 text-sm font-bold text-white hover:bg-sky-700">
              + New entry
            </button>
          )}
        </div>
      )}

      {groups.map((g) => (
        <section key={g.month} className="mt-6">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">{g.month}</h2>
          <ul className="space-y-2">
            {g.items.map((e) => {
              const a = activityOf(e.activity);
              const chips = [
                e.depth_m !== null ? `⬇ ${e.depth_m} m` : null,
                e.duration_min !== null ? `⏱ ${fmtMinutes(e.duration_min)}` : null,
                e.distance_km !== null ? `↔ ${e.distance_km} km` : null,
                e.buddy ? `👥 ${e.buddy}` : null,
              ].filter(Boolean) as string[];
              return (
                <li key={e.id} className="dv-glass rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-xl" style={{ background: a.color + '33' }}>
                      {a.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <h3 className="dv-title truncate text-base">{e.title}</h3>
                        <span className="text-xs text-gray-500">{dayLabel(e.entry_date)}</span>
                      </div>
                      {e.place && (
                        <p className="text-xs text-gray-600">
                          📍 {e.place}
                        </p>
                      )}
                      {chips.length > 0 && (
                        <p className="mt-1.5 flex flex-wrap gap-1.5">
                          {chips.map((c) => (
                            <span key={c} className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-gray-700">
                              {c}
                            </span>
                          ))}
                        </p>
                      )}
                      {e.notes && <p className="mt-2 whitespace-pre-line text-sm text-gray-700">{e.notes}</p>}
                      <div className="mt-2 flex gap-3 text-xs">
                        {canWrite && (
                          <button onClick={() => startEdit(e)} className="font-semibold text-sky-700 hover:underline">
                            Edit
                          </button>
                        )}
                        <button onClick={() => remove(e)} className="font-semibold text-red-600 hover:underline">
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
