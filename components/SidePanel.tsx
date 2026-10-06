'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  SCHOOL_COLUMNS,
  SPOT_COLUMNS,
  type BoatRoute,
  type LngLat,
  type Mode,
  type School,
  type Selection,
  type Spot,
  type RatingInfo,
} from '@/lib/types';
import { FIELDS, buildPayload, inputClass, type Field, type Kind } from '@/lib/fields';
import { lengthKm } from '@/lib/geo';
import { countryName } from '@/lib/countries';
import PhotoSection from '@/components/PhotoSection';
import ReviewsSection from '@/components/ReviewsSection';
import Stars from '@/components/Stars';
import { useDirtyFlag } from '@/components/DirtyContext';

const BOAT_SPEED_KMH = 25; // used for the duration estimate of a new route

function renderValue(f: Field, v: string | number | null) {
  if (v == null || v === '') return <span className="text-gray-400">—</span>;
  if (f.key === 'country_code') return countryName(String(v));
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
  spots: Spot[];
  schools: School[];
  routes: BoatRoute[];
  mode: Mode;
  setMode: (m: Mode) => void;
  onClose: () => void;
  onSaved: (kind: Kind, updated: Spot | School) => void;
  onRoutesChanged: () => void;
  onOpen: (s: Selection) => void;
  rating?: RatingInfo;
  onReviewsChanged: () => void;
  liked?: boolean;
  likeCount?: number;
  canLike?: boolean;
  onToggleLike?: () => void;
};

export default function SidePanel({
  kind,
  item,
  canEdit,
  hint,
  spots,
  schools,
  routes,
  mode,
  setMode,
  onClose,
  onSaved,
  onRoutesChanged,
  onOpen,
  rating,
  onReviewsChanged,
  liked = false,
  likeCount = 0,
  canLike = false,
  onToggleLike,
}: Props) {
  const fields = FIELDS[kind];
  const record = item as unknown as Record<string, string | number | null>;

  // editing the details
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // drawing a boat route
  const [duration, setDuration] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [routeError, setRouteError] = useState('');

  const drawing = mode.type === 'route' && kind === 'school' && mode.schoolId === item.id ? mode : null;

  useDirtyFlag('details', editing);
  useDirtyFlag('route', !!drawing);

  const spotName = (id: string) => spots.find((s) => s.id === id)?.name ?? 'Unknown spot';
  const schoolName = (id: string) => schools.find((s) => s.id === id)?.name ?? 'Unknown school';
  const myRoutes = routes.filter((r) => (kind === 'school' ? r.school_id === item.id : r.spot_id === item.id));

  // ----- details -----
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
    const built = buildPayload(fields, form);
    if ('error' in built) {
      setError(built.error);
      return;
    }
    setSaving(true);
    setError('');
    const table = kind === 'spot' ? 'spots' : 'schools';
    const columns = kind === 'spot' ? SPOT_COLUMNS : SCHOOL_COLUMNS;
    const { data, error: err } = await supabase
      .from(table)
      .update(built.payload)
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

  // ----- boat routes -----
  function startRoute() {
    setDuration(null);
    setNotes('');
    setRouteError('');
    setMode({ type: 'route', schoolId: item.id, spotId: null, waypoints: [] });
  }

  const spot = drawing?.spotId ? spots.find((s) => s.id === drawing.spotId) : undefined;
  const start: LngLat = [item.lng, item.lat];
  const path: LngLat[] = drawing
    ? [start, ...drawing.waypoints, ...(spot ? [[spot.lng, spot.lat] as LngLat] : [])]
    : [];
  const km = lengthKm(path);
  const estimate = Math.max(1, Math.round((km / BOAT_SPEED_KMH) * 60));

  async function saveRoute() {
    if (!drawing || !spot) {
      setRouteError('Choose the destination spot first.');
      return;
    }
    const minutes = duration === null || duration.trim() === '' ? estimate : Number(duration);
    if (!Number.isInteger(minutes) || minutes < 1) {
      setRouteError('Duration must be a whole number of minutes.');
      return;
    }
    setSaving(true);
    setRouteError('');
    const { error: err } = await supabase.rpc('save_boat_route', {
      p_school: item.id,
      p_spot: spot.id,
      p_geojson: { type: 'LineString', coordinates: path },
      p_duration: minutes,
      p_notes: notes.trim() || null,
    });
    setSaving(false);
    if (err) {
      console.error('route error:', err.message);
      setRouteError(`Could not save the route. ${err.message}`);
      return;
    }
    setMode({ type: 'idle' });
    onRoutesChanged();
  }

  async function deleteRoute(r: BoatRoute) {
    if (!window.confirm(`Delete the route to ${spotName(r.spot_id)}?`)) return;
    const { error: err } = await supabase.from('boat_routes').delete().eq('id', r.id);
    if (err) {
      setRouteError(err.message);
      return;
    }
    onRoutesChanged();
  }

  const sortedSpots = [...spots].sort((a, b) => a.name.localeCompare(b.name));

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
          {!editing && (
            <h2 className="mt-2 text-xl font-semibold">{drawing ? `Boat route from ${item.name}` : item.name}</h2>
          )}
          {!editing && !drawing && (
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="flex items-center gap-2">
                {rating && rating.count > 0 ? (
                  <>
                    <Stars value={rating.avg} />
                    <span className="text-gray-600">
                      {rating.avg.toFixed(1)} ({rating.count})
                    </span>
                  </>
                ) : (
                  <span className="text-gray-400">No reviews yet</span>
                )}
              </span>
              {kind === 'spot' && onToggleLike && (
                <button
                  onClick={onToggleLike}
                  disabled={!canLike}
                  aria-pressed={liked}
                  title={
                    canLike
                      ? liked
                        ? 'Remove from favourites'
                        : 'Add to favourites'
                      : 'Log in and confirm your email to like dive spots'
                  }
                  className={`flex items-center gap-1 disabled:opacity-60 ${
                    liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
                  }`}
                >
                  <span className="text-lg leading-none">{liked ? '♥' : '♡'}</span>
                  <span className="text-gray-600">{likeCount}</span>
                </button>
              )}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="rounded px-2 text-2xl leading-none text-gray-500 hover:bg-gray-100"
        >
          ×
        </button>
      </div>

      {drawing ? (
        // ---------- route builder ----------
        <div className="space-y-4 text-sm">
          <p className="text-gray-600">
            Choose the destination, then click on the map along the water to add points. The route
            starts at the school and ends at the spot.
          </p>

          <label className="block">
            <span className="mb-1 block font-medium text-gray-700">Destination spot</span>
            <select
              className={inputClass}
              value={drawing.spotId ?? ''}
              onChange={(e) => setMode({ ...drawing, spotId: e.target.value || null })}
            >
              <option value="">Choose a spot…</option>
              {sortedSpots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded bg-gray-50 p-3">
            <div>
              {drawing.waypoints.length} point{drawing.waypoints.length === 1 ? '' : 's'} added ·{' '}
              {km.toFixed(1)} km
            </div>
            {spot && drawing.waypoints.length === 0 && (
              <div className="mt-1 text-xs text-amber-700">
                No points yet, so the route is a straight line. Add points to go around land.
              </div>
            )}
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setMode({ ...drawing, waypoints: drawing.waypoints.slice(0, -1) })}
                disabled={drawing.waypoints.length === 0}
                className="rounded border border-gray-300 px-3 py-1 text-xs hover:bg-white disabled:opacity-50"
              >
                Undo last point
              </button>
              <button
                onClick={() => setMode({ ...drawing, waypoints: [] })}
                disabled={drawing.waypoints.length === 0}
                className="rounded border border-gray-300 px-3 py-1 text-xs hover:bg-white disabled:opacity-50"
              >
                Clear points
              </button>
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block font-medium text-gray-700">Duration (minutes)</span>
            <input
              type="number"
              min={1}
              className={inputClass}
              value={duration ?? String(estimate)}
              onChange={(e) => setDuration(e.target.value)}
            />
            <span className="mt-1 block text-xs text-gray-500">
              Estimated at {BOAT_SPEED_KMH} km/h. You can change it.
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block font-medium text-gray-700">Notes</span>
            <textarea
              rows={3}
              className={inputClass}
              placeholder="e.g. leaves 8:30, depends on weather"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          {routeError && <p className="text-sm text-red-600">{routeError}</p>}
          <div className="flex gap-2">
            <button
              onClick={saveRoute}
              disabled={saving}
              className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save route'}
            </button>
            <button
              onClick={() => setMode({ type: 'idle' })}
              disabled={saving}
              className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : editing ? (
        // ---------- edit details ----------
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
        // ---------- read ----------
        <div className="space-y-4">
          {fields
            .filter((f) => f.key !== 'name')
            .map((f) => (
              <div key={f.key}>
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{f.label}</div>
                <div className="mt-0.5 whitespace-pre-wrap text-sm">{renderValue(f, record[f.key])}</div>
              </div>
            ))}

          {kind === 'spot' && <PhotoSection spotId={item.id} />}

          {(kind === 'school' || myRoutes.length > 0) && (
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {kind === 'school' ? 'Boat routes' : 'Reachable by boat from'}
              </div>
              <ul className="mt-1 space-y-1.5 text-sm">
                {myRoutes.length === 0 && <li className="text-gray-400">—</li>}
                {myRoutes.map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-2">
                    <div>
                      {kind === 'school' ? (
                        <button
                          onClick={() => onOpen({ kind: 'spot', id: r.spot_id })}
                          className="font-medium text-sky-700 hover:underline"
                        >
                          {spotName(r.spot_id)}
                        </button>
                      ) : (
                        <button
                          onClick={() => onOpen({ kind: 'school', id: r.school_id })}
                          className="font-medium text-orange-700 hover:underline"
                        >
                          {schoolName(r.school_id)}
                        </button>
                      )}
                      <span className="text-gray-600">
                        {' '}
                        · {r.duration_min ? `${r.duration_min} min` : 'duration unknown'}
                      </span>
                      {r.notes && <div className="text-xs text-gray-500">{r.notes}</div>}
                    </div>
                    {kind === 'school' && canEdit && (
                      <button
                        onClick={() => deleteRoute(r)}
                        className="shrink-0 text-xs text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {routeError && <p className="mt-1 text-xs text-red-600">{routeError}</p>}
              {kind === 'school' && canEdit && (
                <button
                  onClick={startRoute}
                  className="mt-2 rounded border border-sky-600 px-3 py-1.5 text-sm font-medium text-sky-700 hover:bg-sky-50"
                >
                  + Add boat route
                </button>
              )}
            </div>
          )}

          {canEdit ? (
            <button
              onClick={startEdit}
              className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
            >
              Edit details
            </button>
          ) : (
            hint && <p className="text-xs text-gray-400">{hint}</p>
          )}

          <ReviewsSection kind={kind} targetId={item.id} info={rating} onChanged={onReviewsChanged} />
        </div>
      )}
    </aside>
  );
}
