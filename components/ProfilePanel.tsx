'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { CERT_AGENCIES, CERT_LEVELS, certLabel } from '@/lib/certs';
import { countryName } from '@/lib/countries';
import { mediaThumbUrl } from '@/lib/photos';

const USERNAME_RE = /^[A-Za-z0-9_-]{3,30}$/;
const inputClass = 'w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900';

type ProfileRow = {
  username: string;
  bio: string | null;
  cert_level: string | null;
  cert_agency: string | null;
  dive_count: number | null;
  created_at: string;
};
type PrivateRow = { license_number: string | null; adult_confirmed: boolean };

type LikedSpot = {
  id: string;
  name: string;
  level: string | null;
  max_depth_m: number | null;
  country_code: string | null;
};
type LikedPhoto = {
  id: string;
  type: string;
  storage_path: string;
  poster_path: string | null;
  caption: string | null;
  spot_id: string;
};

const first = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

type Props = {
  onClose: () => void;
  onOpenSpot: (spotId: string) => void; // jump to a spot on the map
  onShowFavourites: () => void; // map: favourites only
  onLikesChanged: () => void; // tells the map to reload the hearts
};

export default function ProfilePanel({ onClose, onOpenSpot, onShowFavourites, onLikesChanged }: Props) {
  const { user, isAdmin, refresh } = useAuth();
  const uid = user?.id;
  const email = user?.email;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const [savedName, setSavedName] = useState('');
  const [savedLevel, setSavedLevel] = useState('');
  const [savedAgency, setSavedAgency] = useState('');
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [photoCount, setPhotoCount] = useState(0);
  const [spotCount, setSpotCount] = useState(0);
  const [likedSpots, setLikedSpots] = useState<LikedSpot[]>([]);
  const [likedPhotos, setLikedPhotos] = useState<LikedPhoto[]>([]);

  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [certLevel, setCertLevel] = useState('');
  const [certAgency, setCertAgency] = useState('');
  const [diveCount, setDiveCount] = useState('');
  const [license, setLicense] = useState('');
  const [adult, setAdult] = useState(false);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;

    (async () => {
      const [profileRes, privateRes, photosRes, spotsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('username,bio,cert_level,cert_agency,dive_count,created_at')
          .eq('id', uid)
          .maybeSingle(),
        supabase.from('profile_private').select('license_number,adult_confirmed').eq('user_id', uid).maybeSingle(),
        supabase.from('media').select('id', { count: 'exact', head: true }).eq('user_id', uid),
        supabase.from('spots').select('id', { count: 'exact', head: true }).eq('created_by', uid),
      ]);
      if (cancelled) return;

      const p = profileRes.data as ProfileRow | null;
      const priv = privateRes.data as PrivateRow | null;
      if (p) {
        setSavedName(p.username);
        setUsername(p.username);
        setBio(p.bio ?? '');
        setCertLevel(p.cert_level ?? '');
        setSavedLevel(p.cert_level ?? '');
        setCertAgency(p.cert_agency ?? '');
        setSavedAgency(p.cert_agency ?? '');
        setDiveCount(p.dive_count == null ? '' : String(p.dive_count));
        setMemberSince(p.created_at);
      }
      if (priv) {
        setLicense(priv.license_number ?? '');
        setAdult(priv.adult_confirmed);
      }
      setPhotoCount(photosRes.count ?? 0);
      setSpotCount(spotsRes.count ?? 0);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [uid]);

  const loadFavourites = useCallback(async () => {
    if (!uid) return;
    const [spotRes, photoRes] = await Promise.all([
      supabase
        .from('spot_likes')
        .select('created_at,spots(id,name,level,max_depth_m,country_code)')
        .eq('user_id', uid)
        .order('created_at', { ascending: false }),
      supabase
        .from('media_likes')
        .select('created_at,media(id,type,storage_path,poster_path,caption,spot_id)')
        .eq('user_id', uid)
        .order('created_at', { ascending: false }),
    ]);
    const spotRows = (spotRes.data ?? []) as unknown as { spots: LikedSpot | LikedSpot[] | null }[];
    setLikedSpots(spotRows.map((r) => first(r.spots)).filter((s): s is LikedSpot => s !== null));
    const photoRows = (photoRes.data ?? []) as unknown as { media: LikedPhoto | LikedPhoto[] | null }[];
    setLikedPhotos(photoRows.map((r) => first(r.media)).filter((p): p is LikedPhoto => p !== null));
  }, [uid]);

  useEffect(() => {
    loadFavourites();
  }, [loadFavourites]);

  async function unlikeSpot(spotId: string) {
    if (!uid) return;
    setLikedSpots((prev) => prev.filter((s) => s.id !== spotId));
    const { error: err } = await supabase.from('spot_likes').delete().eq('user_id', uid).eq('spot_id', spotId);
    if (err) {
      console.error('unlike error:', err.message);
      await loadFavourites();
      return;
    }
    onLikesChanged();
  }

  async function save() {
    if (!uid) return;
    setError('');
    setInfo('');

    const name = username.trim();
    if (!USERNAME_RE.test(name)) {
      setError('Username: 3-30 characters, letters, numbers, _ or - only.');
      return;
    }
    let dives: number | null = null;
    if (diveCount.trim() !== '') {
      const n = Number(diveCount);
      if (!Number.isInteger(n) || n < 0 || n > 100000) {
        setError('Number of dives must be a whole number.');
        return;
      }
      dives = n;
    }
    if (bio.length > 300) {
      setError('The short bio can have at most 300 characters.');
      return;
    }

    setSaving(true);

    if (name.toLowerCase() !== savedName.toLowerCase()) {
      const { data: free } = await supabase.rpc('username_available', { wanted_name: name });
      if (free === false) {
        setSaving(false);
        setError('This username is already taken.');
        return;
      }
    }

    const { error: pErr } = await supabase
      .from('profiles')
      .update({
        username: name,
        bio: bio.trim() || null,
        cert_level: certLevel || null,
        cert_agency: certAgency || null,
        dive_count: dives,
      })
      .eq('id', uid);
    if (pErr) {
      setSaving(false);
      setError(pErr.code === '23505' ? 'This username is already taken.' : pErr.message);
      return;
    }

    const { error: privErr } = await supabase.from('profile_private').upsert({
      user_id: uid,
      license_number: license.trim() || null,
      adult_confirmed: adult,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (privErr) {
      setError(privErr.message);
      return;
    }

    setSavedName(name);
    setSavedLevel(certLevel);
    setSavedAgency(certAgency);
    setInfo('Saved.');
    await refresh();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-auto bg-black/40 p-3 sm:p-6">
      <div className="w-full max-w-xl rounded-lg bg-white text-gray-900 shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 p-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              {savedName || 'My profile'}
              {isAdmin && (
                <span className="rounded bg-sky-100 px-1.5 py-0.5 text-xs font-medium text-sky-800">Admin</span>
              )}
            </h2>
            <p className="text-sm text-gray-600">
              {savedLevel ? certLabel(savedLevel) : 'No certification set'}
              {savedAgency ? ` · ${savedAgency}` : ''}
            </p>
            <p className="text-xs text-gray-500">
              {email}
              {memberSince ? ` · member since ${new Date(memberSince).toLocaleDateString()}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded px-2 text-2xl leading-none text-gray-500 hover:bg-gray-100"
          >
            ×
          </button>
        </div>

        {loading ? (
          <p className="p-4 text-sm text-gray-500">Loading…</p>
        ) : (
          <div className="space-y-5 p-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded bg-gray-50 p-3">
                <div className="text-xl font-semibold">{photoCount}</div>
                <div className="text-xs text-gray-500">Posts</div>
              </div>
              <div className="rounded bg-gray-50 p-3">
                <div className="text-xl font-semibold">{spotCount}</div>
                <div className="text-xs text-gray-500">Spots added</div>
              </div>
              <div className="rounded bg-gray-50 p-3">
                <div className="text-xl font-semibold">{diveCount.trim() === '' ? '—' : diveCount}</div>
                <div className="text-xs text-gray-500">Dives (self-reported)</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500">Favourites</h3>
                {likedSpots.length > 0 && (
                  <button onClick={onShowFavourites} className="text-xs font-medium text-sky-700 hover:underline">
                    Show favourites on the map
                  </button>
                )}
              </div>

              <div>
                <div className="text-sm font-medium">♥ Liked dive spots ({likedSpots.length})</div>
                {likedSpots.length === 0 ? (
                  <p className="mt-1 text-sm text-gray-400">
                    No liked dive spots yet. Click the heart on a dive spot.
                  </p>
                ) : (
                  <ul className="mt-1 divide-y divide-gray-100 rounded border border-gray-200 text-sm">
                    {likedSpots.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-2 px-3 py-2">
                        <button
                          onClick={() => onOpenSpot(s.id)}
                          className="min-w-0 truncate text-left font-medium text-sky-700 hover:underline"
                        >
                          {s.name}
                        </button>
                        <span className="shrink-0 text-xs text-gray-500">
                          {[
                            s.level,
                            s.max_depth_m != null ? `${s.max_depth_m} m` : null,
                            s.country_code ? countryName(s.country_code) : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                        <button
                          onClick={() => unlikeSpot(s.id)}
                          aria-label="Remove from favourites"
                          title="Remove from favourites"
                          className="shrink-0 text-red-500 hover:text-red-600"
                        >
                          ♥
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <div className="text-sm font-medium">♥ Liked posts ({likedPhotos.length})</div>
                {likedPhotos.length === 0 ? (
                  <p className="mt-1 text-sm text-gray-400">
                    No liked posts yet. Open a photo or video and click the heart.
                  </p>
                ) : (
                  <div className="mt-1 grid grid-cols-4 gap-1.5">
                    {likedPhotos.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => onOpenSpot(p.spot_id)}
                        title="Open this dive spot"
                        className="relative aspect-square overflow-hidden rounded bg-gray-100"
                      >
                        {mediaThumbUrl(p) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={mediaThumbUrl(p) ?? ''}
                            alt={p.caption ?? 'Liked post'}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center bg-gray-800 text-white">▶</span>
                        )}
                        {p.type === 'video' && (
                          <span className="absolute right-1 top-1 text-[10px] text-white drop-shadow">▶</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Public profile
              </h3>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">Username</span>
                <input className={inputClass} value={username} onChange={(e) => setUsername(e.target.value)} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Certification</span>
                  <select className={inputClass} value={certLevel} onChange={(e) => setCertLevel(e.target.value)}>
                    <option value="">—</option>
                    {CERT_LEVELS.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Agency</span>
                  <select className={inputClass} value={certAgency} onChange={(e) => setCertAgency(e.target.value)}>
                    <option value="">—</option>
                    {CERT_AGENCIES.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">Number of dives</span>
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={diveCount}
                  onChange={(e) => setDiveCount(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">
                  Short bio <span className="font-normal text-gray-400">({bio.length}/300)</span>
                </span>
                <textarea
                  rows={3}
                  maxLength={300}
                  className={inputClass}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </label>
            </div>

            <div className="space-y-3 rounded border border-gray-200 bg-gray-50 p-3">
              <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Private: only you and admins can see this
              </h3>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">Licence number (optional)</span>
                <input className={inputClass} value={license} onChange={(e) => setLicense(e.target.value)} />
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={adult}
                  onChange={(e) => setAdult(e.target.checked)}
                />
                <span>I confirm that I am 18 years or older.</span>
              </label>
              {!adult && (
                <p className="text-xs text-amber-700">Please confirm that you are 18 or older.</p>
              )}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {info && <p className="text-sm text-green-700">{info}</p>}
            <div className="flex gap-2">
              <button
                onClick={save}
                disabled={saving}
                className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save profile'}
              </button>
              <button
                onClick={onClose}
                className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
