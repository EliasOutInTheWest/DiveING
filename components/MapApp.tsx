'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  SCHOOL_COLUMNS,
  SPOT_COLUMNS,
  type BoatRoute,
  type LngLat,
  type Mode,
  type RatingInfo,
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
import FilterPanel from '@/components/FilterPanel';
import { DEFAULT_FILTERS, activeFilterCount, applyFilters, type Filters } from '@/lib/filters';
import AuthProvider, { useAuth } from '@/components/AuthProvider';
import { DirtyProvider, useDirty } from '@/components/DirtyContext';
import { DEPTH_LEGEND_GRADIENT, DEPTH_STOPS } from '@/lib/depth';

// The provider makes "who is logged in" available to everything inside
export default function MapApp() {
  return (
    <AuthProvider>
      <DirtyProvider>
        <MapView />
      </DirtyProvider>
    </AuthProvider>
  );
}

function MapView() {
  const { user, isAdmin, isVerified, schoolIds } = useAuth();
  const { isDirty } = useDirty();
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
  const [ratings, setRatings] = useState<Record<string, RatingInfo>>({});
  const [ratingsVersion, setRatingsVersion] = useState(0);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [likedSpotIds, setLikedSpotIds] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [likesVersion, setLikesVersion] = useState(0);
  const uid = user?.id;

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

  // load likes: the numbers for everybody, and which spots I liked
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const countRes = await supabase.rpc('spot_like_counts');
      const counts: Record<string, number> = {};
      ((countRes.data as { spot_id: string; like_count: number }[] | null) ?? []).forEach((r) => {
        counts[r.spot_id] = Number(r.like_count);
      });
      let mine = new Set<string>();
      if (uid) {
        const { data } = await supabase.from('spot_likes').select('spot_id').eq('user_id', uid);
        mine = new Set(((data as { spot_id: string }[] | null) ?? []).map((r) => r.spot_id));
      }
      if (cancelled) return;
      setLikeCounts(counts);
      setLikedSpotIds(mine);
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, likesVersion]);

  // links from the feed: /map?spot=ID selects a spot, /map?favourites=1 shows favourites only
  const [linkSpot, setLinkSpot] = useState<string | null>(null);
  const [linkFavourites, setLinkFavourites] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setLinkSpot(params.get('spot'));
    setLinkFavourites(params.get('favourites') === '1');
  }, []);

  useEffect(() => {
    if (!linkSpot || spots.length === 0) return;
    if (spots.some((s) => s.id === linkSpot)) setSelected({ kind: 'spot', id: linkSpot });
    setLinkSpot(null);
  }, [linkSpot, spots]);

  useEffect(() => {
    if (!linkFavourites || !uid) return;
    setFilters((f) => ({ ...f, favouritesOnly: true }));
    setFiltersOpen(true);
    setLinkFavourites(false);
  }, [linkFavourites, uid]);

  // "favourites only" makes no sense when logged out
  useEffect(() => {
    if (!uid) setFilters((f) => (f.favouritesOnly ? { ...f, favouritesOnly: false } : f));
  }, [uid]);

  // load the average ratings of all spots and schools
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [spotRes, schoolRes] = await Promise.all([
        supabase.from('spot_ratings').select('spot_id,avg_rating,review_count'),
        supabase.from('school_ratings').select('school_id,avg_rating,review_count'),
      ]);
      if (cancelled) return;
      const map: Record<string, RatingInfo> = {};
      ((spotRes.data as { spot_id: string; avg_rating: number; review_count: number }[] | null) ?? []).forEach((r) => {
        map[`spot:${r.spot_id}`] = { avg: Number(r.avg_rating), count: Number(r.review_count) };
      });
      ((schoolRes.data as { school_id: string; avg_rating: number; review_count: number }[] | null) ?? []).forEach((r) => {
        map[`school:${r.school_id}`] = { avg: Number(r.avg_rating), count: Number(r.review_count) };
      });
      setRatings(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [ratingsVersion]);

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

  // pins after the filters
  const { visibleSpots, visibleSchools } = useMemo(
    () => applyFilters(spots, schools, filters, likedSpotIds),
    [spots, schools, filters, likedSpotIds]
  );
  const countryCodes = useMemo(() => {
    const set = new Set<string>();
    spots.forEach((s) => s.country_code && set.add(s.country_code));
    schools.forEach((s) => s.country_code && set.add(s.country_code));
    return [...set];
  }, [spots, schools]);
  const hasUnknownCountry = useMemo(
    () => spots.some((s) => !s.country_code) || schools.some((s) => !s.country_code),
    [spots, schools]
  );
  const filterCount = activeFilterCount(filters);

  async function toggleSpotLike(spotId: string) {
    if (!uid || !isVerified) return;
    const liked = likedSpotIds.has(spotId);
    // show the change right away, then save it
    setLikedSpotIds((prev) => {
      const next = new Set(prev);
      if (liked) next.delete(spotId);
      else next.add(spotId);
      return next;
    });
    setLikeCounts((prev) => ({ ...prev, [spotId]: Math.max(0, (prev[spotId] ?? 0) + (liked ? -1 : 1)) }));

    const { error } = liked
      ? await supabase.from('spot_likes').delete().eq('spot_id', spotId).eq('user_id', uid)
      : await supabase.from('spot_likes').insert({ spot_id: spotId });
    if (error) {
      console.error('like error:', error.message);
      setLikesVersion((v) => v + 1); // go back to what is really saved
    }
  }

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

  // click on the empty map closes the panel (and asks first if there is unsaved input)
  const handleBackgroundClick = useCallback(() => {
    if (!selected) return;
    if (isDirty() && !window.confirm('You have unsaved changes. Close this panel anyway?')) return;
    setSelected(null);
  }, [selected, isDirty]);

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
        visibleSpots={visibleSpots}
        visibleSchools={visibleSchools}
        selected={selected}
        routes={routes}
        mode={mode}
        depthMap={depthMap}
        terrain3d={view3d && mode.type === 'idle'}
        onSelect={setSelected}
        onMapClick={handleMapClick}
        onBackgroundClick={handleBackgroundClick}
      />

      <Link
        href="/"
        className="absolute bottom-6 left-2.5 z-10 rounded bg-white px-3 py-1.5 text-sm font-medium text-sky-800 shadow hover:bg-gray-50"
      >
        ← Home
      </Link>
      <Link
        href="/feed"
        className="absolute bottom-6 left-24 z-10 rounded bg-white px-3 py-1.5 text-sm font-medium text-sky-800 shadow hover:bg-gray-50"
      >
        ▶ Feed
      </Link>

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
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              className={`rounded border px-3 py-1 font-medium ${
                filterCount > 0
                  ? 'border-sky-600 bg-sky-50 text-sky-800'
                  : 'border-gray-300 text-gray-800 hover:bg-gray-50'
              }`}
            >
              Filters{filterCount > 0 ? ` (${filterCount})` : ''}
            </button>
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
        {mode.type === 'idle' && filtersOpen && (
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            countryCodes={countryCodes}
            hasUnknownCountry={hasUnknownCountry}
            shown={visibleSpots.length}
            total={spots.length}
            loggedIn={!!user}
          />
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
      {user && profileOpen && (
        <ProfilePanel
          onClose={() => setProfileOpen(false)}
          onOpenSpot={(id) => {
            setProfileOpen(false);
            setMode({ type: 'idle' });
            setSelected({ kind: 'spot', id });
          }}
          onShowFavourites={() => {
            setProfileOpen(false);
            setFilters((f) => ({ ...f, favouritesOnly: true }));
            setFiltersOpen(true);
          }}
          onLikesChanged={() => setLikesVersion((v) => v + 1)}
        />
      )}

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
          rating={ratings[`${selected.kind}:${selected.id}`]}
          onReviewsChanged={() => setRatingsVersion((v) => v + 1)}
          liked={selected.kind === 'spot' && likedSpotIds.has(selected.id)}
          likeCount={selected.kind === 'spot' ? (likeCounts[selected.id] ?? 0) : 0}
          canLike={isVerified}
          onToggleLike={selected.kind === 'spot' ? () => toggleSpotLike(selected.id) : undefined}
          onOpen={(s) => {
            setMode({ type: 'idle' });
            setSelected(s);
          }}
        />
      )}
    </div>
  );
}
