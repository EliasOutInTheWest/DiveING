'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useDirtyFlag } from '@/components/DirtyContext';
import { mediaThumbUrl, mediaUrl, removeMediaFiles, formatDuration } from '@/lib/photos';
import { ACCEPT_MEDIA, MAX_VIDEO_SECONDS, isVideoFile, uploadMedia } from '@/lib/upload';

type Row = {
  id: string;
  user_id: string;
  type: string;
  storage_path: string;
  poster_path: string | null;
  duration_s: number | null;
  caption: string | null;
  created_at: string;
  profiles: { username: string } | { username: string }[] | null;
};

type Photo = Omit<Row, 'profiles'> & { username: string | null };

export default function PhotoSection({ spotId }: { spotId: string }) {
  const { user, isAdmin, isVerified } = useAuth();
  const canUpload = isVerified || isAdmin;
  const uid = user?.id;

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<Photo | null>(null);
  useDirtyFlag('photo', file !== null);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('media')
      .select('id,user_id,type,storage_path,poster_path,duration_s,caption,created_at,profiles(username)')
      .eq('spot_id', spotId)
      .order('created_at', { ascending: false });
    if (err) {
      console.error('photos error:', err.message);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as unknown as Row[];
    setPhotos(
      rows.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        type: r.type,
        storage_path: r.storage_path,
        poster_path: r.poster_path,
        duration_s: r.duration_s,
        caption: r.caption,
        created_at: r.created_at,
        username: Array.isArray(r.profiles) ? (r.profiles[0]?.username ?? null) : (r.profiles?.username ?? null),
      }))
    );
    setLoading(false);

    // likes: numbers for everybody, and which ones are mine
    const ids = rows.map((r) => r.id);
    if (ids.length === 0) return;
    const countRes = await supabase.rpc('media_like_counts', { p_spot: spotId });
    const map: Record<string, number> = {};
    ((countRes.data as { media_id: string; like_count: number }[] | null) ?? []).forEach((c) => {
      map[c.media_id] = Number(c.like_count);
    });
    setCounts(map);

    if (uid) {
      const { data: mine } = await supabase
        .from('media_likes')
        .select('media_id')
        .eq('user_id', uid)
        .in('media_id', ids);
      setLikedIds(new Set(((mine as { media_id: string }[] | null) ?? []).map((m) => m.media_id)));
    } else {
      setLikedIds(new Set());
    }
  }, [spotId, uid]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleLike(p: Photo) {
    if (!uid || !isVerified) return;
    const liked = likedIds.has(p.id);
    // show the change right away, then save it
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (liked) next.delete(p.id);
      else next.add(p.id);
      return next;
    });
    setCounts((prev) => ({ ...prev, [p.id]: Math.max(0, (prev[p.id] ?? 0) + (liked ? -1 : 1)) }));

    const { error: err } = liked
      ? await supabase.from('media_likes').delete().eq('media_id', p.id).eq('user_id', uid)
      : await supabase.from('media_likes').insert({ media_id: p.id });
    if (err) {
      console.error('like error:', err.message);
      await load(); // go back to what is really saved
    }
  }

  async function upload() {
    if (!file || !user) return;
    setUploading(true);
    setError('');
    try {
      await uploadMedia({ file, spotId, caption, userId: user.id });

      setFile(null);
      setCaption('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function remove(p: Photo) {
    if (!window.confirm(`Delete this ${p.type === 'video' ? 'video' : 'photo'}?`)) return;
    const { error: dbErr } = await supabase.from('media').delete().eq('id', p.id);
    if (dbErr) {
      setError(dbErr.message);
      return;
    }
    await removeMediaFiles(p);
    setOpen(null);
    await load();
  }

  async function report(p: Photo) {
    const reason = window.prompt('Why are you reporting this post? (optional)');
    if (reason === null) return;
    const { error: err } = await supabase
      .from('media_reports')
      .insert({ media_id: p.id, reason: reason.trim() || null });
    if (err) {
      window.alert(err.code === '23505' ? 'You already reported this post.' : err.message);
      return;
    }
    window.alert('Thank you. An admin will take a look.');
  }

  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Photos and videos</div>

      {loading ? (
        <p className="mt-1 text-sm text-gray-400">Loading…</p>
      ) : photos.length === 0 ? (
        <p className="mt-1 text-sm text-gray-400">No photos or videos yet.</p>
      ) : (
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {photos.map((p) => (
            <button
              key={p.id}
              onClick={() => setOpen(p)}
              className="relative aspect-square overflow-hidden rounded bg-gray-100"
            >
              {mediaThumbUrl(p) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediaThumbUrl(p) ?? ''}
                  alt={p.caption ?? 'Dive photo'}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-gray-800 text-white">▶</span>
              )}
              {p.type === 'video' && (
                <span className="absolute right-1 top-0.5 text-[11px] font-medium text-white drop-shadow">
                  ▶ {formatDuration(p.duration_s)}
                </span>
              )}
              {(counts[p.id] ?? 0) > 0 && (
                <span className="absolute bottom-0.5 left-1 text-[11px] font-medium text-white drop-shadow">
                  ♥ {counts[p.id]}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {canUpload ? (
        file ? (
          <div className="mt-3 space-y-2 rounded bg-gray-50 p-3 text-sm">
            <div className="truncate text-gray-700">{file.name}</div>
            <input
              type="text"
              maxLength={200}
              placeholder="Caption (optional)"
              className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              {isVideoFile(file)
                ? `Only upload videos you made yourself (max. ${MAX_VIDEO_SECONDS} seconds, 50 MB). Videos are uploaded as they are, so check that they do not show a location you want to keep private.`
                : 'Only upload photos you took yourself. The photo is shrunk in your browser and hidden data such as the GPS position is removed.'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={upload}
                disabled={uploading}
                className="rounded bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
              >
                {uploading ? (isVideoFile(file) ? 'Uploading video…' : 'Uploading…') : 'Upload'}
              </button>
              <button
                onClick={() => setFile(null)}
                disabled={uploading}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-white disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <label className="mt-3 inline-block cursor-pointer rounded border border-sky-600 px-3 py-1.5 text-sm font-medium text-sky-700 hover:bg-sky-50">
            + Add photo or video
            <input
              type="file"
              accept={ACCEPT_MEDIA}
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setError('');
                e.target.value = '';
              }}
            />
          </label>
        )
      ) : (
        <p className="mt-2 text-xs text-gray-400">
          {user ? 'Please confirm your email to add photos or videos.' : 'Log in to add photos or videos.'}
        </p>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {open && (
        <div
          className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/85 p-4"
          onClick={() => setOpen(null)}
        >
          <div className="flex max-h-full max-w-3xl flex-col items-center" onClick={(e) => e.stopPropagation()}>
            {open.type === 'video' ? (
              <video
                src={mediaUrl(open)}
                poster={mediaThumbUrl(open) ?? undefined}
                controls
                autoPlay
                playsInline
                loop
                className="max-h-[75vh] max-w-full rounded bg-black"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaUrl(open)}
                alt={open.caption ?? 'Dive photo'}
                className="max-h-[75vh] max-w-full rounded object-contain"
              />
            )}
            <div className="mt-3 text-center text-sm text-white">
              {open.caption && <div className="mb-1">{open.caption}</div>}
              <div className="text-xs text-gray-300">
                by {open.username ?? 'unknown'} · {new Date(open.created_at).toLocaleDateString()}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <button
                onClick={() => toggleLike(open)}
                disabled={!isVerified}
                title={isVerified ? undefined : 'Log in and confirm your email to like'}
                aria-pressed={likedIds.has(open.id)}
                className={`rounded border px-3 py-1.5 text-sm font-medium disabled:opacity-60 ${
                  likedIds.has(open.id)
                    ? 'border-red-500 bg-red-500 text-white'
                    : 'border-gray-300 text-white hover:bg-white/10'
                }`}
              >
                {likedIds.has(open.id) ? '♥' : '♡'} {counts[open.id] ?? 0}
              </button>
              {(open.user_id === user?.id || isAdmin) && (
                <button
                  onClick={() => remove(open)}
                  className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                >
                  Delete
                </button>
              )}
              {isVerified && open.user_id !== user?.id && (
                <button
                  onClick={() => report(open)}
                  className="rounded border border-gray-300 px-3 py-1.5 text-sm text-white hover:bg-white/10"
                >
                  Report
                </button>
              )}
              <button
                onClick={() => setOpen(null)}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm text-white hover:bg-white/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
