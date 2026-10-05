'use client';

import { useCallback, useEffect, useState } from 'react';
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
} from '@/lib/types';
import DiveMap from '@/components/DiveMap';
import SidePanel from '@/components/SidePanel';
import CreatePanel from '@/components/CreatePanel';
import AuthBox from '@/components/AuthBox';
import AdminPanel from '@/components/AdminPanel';
import ProfilePanel from '@/components/ProfilePanel';
import AuthProvider, { useAuth } from '@/components/AuthProvider';
import { DEPTH_LEGEND_GRADIENT, DEPTH_STOPS } from '@/lib/depth';

// The provider makes "who is logged in" available to everything inside
export default function MapApp() {
  return (
    <AuthProvider>
      <MapView />
    </AuthProvider>
  );
}

function MapView() {
  const { user, isAdmin, isVerified, schoolIds } = useAuth();
  const [spots, setSpots] = useState<Spot[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mode, setMode] = useState<Mode>({ type: 'idle' });
  const [routes, setRoutes] = useState<BoatRoute[]>([]);
  const [routesVersion, setRoutesVersion] = useState(0);
  const [depthMap, setDepthMap] = useState(false);
  const [view3d, setView3d] = useState(false);

  // load spots and schools
  useEffect(() => {
    async function load() {
      const [spotsRes, schoolsRes] = await Promise.all([
        supabase.from('spots').select(SPOT_COLUMNS),
        supabase.from('schools').select(SCHOOL_COLUMNS),
      ]);
      if (spotsRes.error) console.error('spots error:', spotsRes.error.message);
      if (schoolsRes.error) console.error('schools error:', schoolsRes.error.message);
      setSpots((spotsRes.data as Spot[]) ?? []);
      setSchools((schoolsRes.data as School[]) ?? []);
    }
    load();
  }, []);

  // load the boat routes of the selected school / spot
  useEffect(() => {
    let cancelled = false;
    async function loadRoutes() {
      if (!selected) {
        setRoutes((prev) => (prev.length ? [] : prev));
        return;
      }
      const args =
        selected.kind === 'school'
          ? { p_school: selected.id, p_spot: null }
          : { p_school: null, p_spot: selected.id };
      const { data, error } = await supabase.rpc('get_boat_routes', args);
      if (cancelled) return;
      if (error) {
        console.error('routes error:', error.message);
        setRoutes([]);
        return;
      }
      setRoutes((data as BoatRoute[]) ?? []);
    }
    loadRoutes();
    return () => {
      cancelled = true;
    };
  }, [selected, routesVersion]);

  const item = selected
    ? selected.kind === 'spot'
      ? spots.find((s) => s.id === selected.id)
      : schools.find((s) => s.id === selected.id)
    : undefined;

  function handleSaved(kind: 'spot' | 'school', updated: Spot | School) {
    if (kind === 'spot') {
      setSpots((prev) => prev.map((s) => (s.id === updated.id ? (updated as Spot) : s)));
    } else {
      setSchools((prev) => prev.map((s) => (s.id === updated.id ? (updated as School) : s)));
    }
  }

  function handleCreated(kind: 'spot' | 'school', created: Spot | School) {
    if (kind === 'spot') setSpots((prev) => [...prev, created as Spot]);
    else setSchools((prev) => [...prev, created as School]);
    setMode({ type: 'idle' });
    setSelected({ kind, id: created.id });
  }

  function startPlace(kind: 'spot' | 'school') {
    setSelected(null);
    setMode({ type: 'place', kind, at: null });
  }

  // clicks on the map while placing a pin / drawing a route
  const handleMapClick = useCallback((p: LngLat) => {
    setMode((m) => {
      if (m.type === 'place') return { ...m, at: p };
      if (m.type === 'route') return { ...m, waypoints: [...m.waypoints, p] };
      return m;
    });
  }, []);

  // Who may edit the selected item?
  let canEdit = false;
  let hint = '';
  if (selected && item) {
    if (isAdmin) {
      canEdit = true;
    } else if (selected.kind === 'spot') {
      canEdit = isVerified;
      hint = user ? 'Please confirm your email to edit spots.' : 'Log in to edit this spot.';
    } else {
      canEdit = schoolIds.includes(selected.id);
      hint = 'Only staff of this school (and admins) can edit this page.';
    }
  }

  const canAddSpot = isAdmin || isVerified;

  return (
    <div className="relative h-full w-full">
      <DiveMap
        spots={spots}
        schools={schools}
        selected={selected}
        routes={routes}
        mode={mode}
        depthMap={depthMap}
        terrain3d={view3d && mode.type === 'idle'}
        onSelect={setSelected}
        onMapClick={handleMapClick}
      />

      {/* toolbar: add pins, hints while placing / drawing */}
      <div className="absolute left-1/2 top-2.5 z-10 flex -translate-x-1/2 items-center gap-2 rounded bg-white p-2 text-sm text-gray-900 shadow">
        {mode.type === 'idle' && (
          <>
            {canAddSpot && (
              <button
                onClick={() => startPlace('spot')}
                className="rounded bg-sky-600 px-3 py-1 font-medium text-white hover:bg-sky-700"
              >
                + Add dive spot
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => startPlace('school')}
                className="rounded bg-orange-500 px-3 py-1 font-medium text-white hover:bg-orange-600"
              >
                + Add dive school
              </button>
            )}
            {!canAddSpot && <span className="text-gray-500">Log in to add dive spots</span>}
          </>
        )}
        {mode.type === 'place' && (
          <>
            <span>
              {mode.at
                ? 'Click the map to move the pin'
                : `Click on the map to place the new ${mode.kind === 'spot' ? 'dive spot' : 'dive school'}`}
            </span>
            <button
              onClick={() => setMode({ type: 'idle' })}
              className="rounded border border-gray-300 px-2 py-0.5 hover:bg-gray-50"
            >
              Cancel
            </button>
          </>
        )}
        {mode.type === 'route' && (
          <span>Drawing a boat route: click along the water to add points</span>
        )}
      </div>

      {/* depth map controls + legend */}
      <div className="absolute bottom-10 right-2.5 z-10 flex flex-col items-end gap-2">
        {depthMap && (
          <div className="w-56 rounded bg-white/95 p-2 text-[11px] leading-snug text-gray-700 shadow">
            <div className="mb-1 font-medium text-gray-900">Depth (m)</div>
            <div className="h-2.5 rounded" style={{ background: DEPTH_LEGEND_GRADIENT }} />
            <div className="mt-0.5 flex justify-between">
              {DEPTH_STOPS.map((s, i) => (
                <span key={s.depth}>
                  {s.depth}
                  {i === DEPTH_STOPS.length - 1 ? '+' : ''}
                </span>
              ))}
            </div>
            <p className="mt-1.5 text-gray-600">
              Rough overview from coarse global data (about 450 m resolution). Not for dive
              planning or navigation.
            </p>
            <p className="text-gray-400">Data: GEBCO / ETOPO1 via Mapzen Terrain Tiles.</p>
          </div>
        )}
        <div className="flex gap-1 rounded bg-white p-1 shadow">
          <button
            onClick={() => setDepthMap((v) => !v)}
            aria-pressed={depthMap}
            className={`rounded px-2.5 py-1 text-xs font-medium ${
              depthMap ? 'bg-sky-600 text-white' : 'text-gray-800 hover:bg-gray-100'
            }`}
          >
            Depth
          </button>
          <button
            onClick={() => setView3d((v) => !v)}
            aria-pressed={view3d}
            className={`rounded px-2.5 py-1 text-xs font-medium ${
              view3d ? 'bg-sky-600 text-white' : 'text-gray-800 hover:bg-gray-100'
            }`}
          >
            3D
          </button>
        </div>
      </div>

      <AuthBox onOpenAdmin={() => setAdminOpen(true)} onOpenProfile={() => setProfileOpen(true)} />
      {isAdmin && adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
      {user && profileOpen && <ProfilePanel onClose={() => setProfileOpen(false)} />}

      {mode.type === 'place' && mode.at && (
        <CreatePanel
          key={`new-${mode.kind}`}
          kind={mode.kind}
          at={mode.at}
          isAdmin={isAdmin}
          onCancel={() => setMode({ type: 'idle' })}
          onCreated={handleCreated}
        />
      )}

      {mode.type !== 'place' && selected && item && (
        <SidePanel
          key={`${selected.kind}-${selected.id}`}
          kind={selected.kind}
          item={item}
          canEdit={canEdit}
          hint={hint}
          spots={spots}
          schools={schools}
          routes={routes}
          mode={mode}
          setMode={setMode}
          onClose={() => {
            setMode({ type: 'idle' });
            setSelected(null);
          }}
          onSaved={handleSaved}
          onRoutesChanged={() => setRoutesVersion((v) => v + 1)}
          onOpen={(s) => {
            setMode({ type: 'idle' });
            setSelected(s);
          }}
        />
      )}
    </div>
  );
}
