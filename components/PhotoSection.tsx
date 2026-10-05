'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { resizeImage } from '@/lib/image';

const BUCKET = 'spot-photos';

type Row = {
  id: string;
  user_id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
  profiles: { username: string } | { username: string }[] | null;
};

type Photo = Omit<Row, 'profiles'> & { username: string | null };

const urlOf = (path: string) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
// thumbnail has the same name with "_t" before the file ending
const thumbOf = (path: string) => path.replace(/(\.[a-z]+)$/i, '_t$1');

export default function PhotoSection({ spotId }: { spotId: string }) {
  const { user, isAdmin, isVerified } = useAuth();
  const canUpload = isVerified || isAdmin;

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<Photo | null>(null);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('media')
      .select('id,user_id,storage_path,caption,created_at,profiles(username)')
      .eq('spot_id', spotId)
      .eq('type', 'image')
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
        storage_path: r.storage_path,
        caption: r.caption,
        created_at: r.created_at,
        username: Array.isArray(r.profiles) ? (r.profiles[0]?.username ?? null) : (r.profiles?.username ?? null),
      }))
    );
    setLoading(false);
  }, [spotId]);

  useEffect(() => {
    load();
  }, [load]);

  async function upload() {
    if (!file || !user) return;
    setUploading(true);
    setError('');
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error('This file is too large (max. 25 MB).');

      const { full, thumb } = await resizeImage(file);
      const id = crypto.randomUUID();
      const path = `${user.id}/${id}.${full.ext}`;
      const tPath = `${user.id}/${id}_t.${thumb.ext}`;
      const contentType = full.ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const options = { contentType, cacheControl: '31536000' };

      const up1 = await supabase.storage.from(BUCKET).upload(path, full.blob, options);
      if (up1.error) throw new Error(up1.error.message);
      const up2 = await supabase.storage.from(BUCKET).upload(tPath, thumb.blob, options);
      if (up2.error) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw new Error(up2.error.message);
      }

      const { error: dbErr } = await supabase.from('media').insert({
        spot_id: spotId,
        type: 'image',
        storage_path: path,
        caption: caption.trim() || null,
      });
      if (dbErr) {
        await supabase.storage.from(BUCKET).remove([path, tPath]);
        throw new Error(dbErr.message);
      }

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
    if (!window.confirm('Delete this photo?')) return;
    const { error: dbErr } = await supabase.from('media').delete().eq('id', p.id);
    if (dbErr) {
      setError(dbErr.message);
      return;
    }
    await supabase.storage.from(BUCKET).remove([p.storage_path, thumbOf(p.storage_path)]);
    setOpen(null);
    await load();
  }

  async function report(p: Photo) {
    const reason = window.prompt('Why are you reporting this photo? (optional)');
    if (reason === null) return;
    const { error: err } = await supabase
      .from('media_reports')
      .insert({ media_id: p.id, reason: reason.trim() || null });
    if (err) {
      window.alert(err.code === '23505' ? 'You already reported this photo.' : err.message);
      return;
    }
    window.alert('Thank you. An admin will take a look.');
  }

  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Photos</div>

      {loading ? (
        <p className="mt-1 text-sm text-gray-400">Loading…</p>
      ) : photos.length === 0 ? (
        <p className="mt-1 text-sm text-gray-400">No photos yet.</p>
      ) : (
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {photos.map((p) => (
            <button
              key={p.id}
              onClick={() => setOpen(p)}
              className="aspect-square overflow-hidden rounded bg-gray-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={urlOf(thumbOf(p.storage_path))}
                alt={p.caption ?? 'Dive photo'}
                loading="lazy"
                className="h-full w-full object-cover"
              />
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
              Only upload photos you took yourself. The photo is shrunk in your browser and hidden
              data such as the GPS position is removed.
            </p>
            <div className="flex gap-2">
              <button
                onClick={upload}
                disabled={uploading}
                className="rounded bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
              >
                {uploading ? 'Uploading…' : 'Upload'}
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
            + Add photo
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
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
          {user ? 'Please confirm your email to add photos.' : 'Log in to add photos.'}
        </p>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {open && (
        <div
          className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/85 p-4"
          onClick={() => setOpen(null)}
        >
          <div className="flex max-h-full max-w-3xl flex-col items-center" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={urlOf(open.storage_path)}
              alt={open.caption ?? 'Dive photo'}
              className="max-h-[75vh] max-w-full rounded object-contain"
            />
            <div className="mt-3 text-center text-sm text-white">
              {open.caption && <div className="mb-1">{open.caption}</div>}
              <div className="text-xs text-gray-300">
                by {open.username ?? 'unknown'} · {new Date(open.created_at).toLocaleDateString()}
              </div>
            </div>
            <div className="mt-3 flex gap-2">
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
