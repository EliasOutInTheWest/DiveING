'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useDirtyFlag } from '@/components/DirtyContext';
import { ACCEPT_MEDIA, MAX_VIDEO_SECONDS, isVideoFile, uploadMedia } from '@/lib/upload';
import { countryName } from '@/lib/countries';
import { activityOf } from '@/lib/activities';

type SpotOption = { id: string; name: string; country_code: string | null; activity: string | null };

type Props = {
  onClose: () => void;
  onUploaded: () => void;
};

// "Post" window of the feed: choose the dive spot, a photo or video and a caption
export default function UploadPanel({ onClose, onUploaded }: Props) {
  const { user } = useAuth();
  const [spots, setSpots] = useState<SpotOption[]>([]);
  const [search, setSearch] = useState('');
  const [spotId, setSpotId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useDirtyFlag('feed-upload', file !== null || caption.trim() !== '');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('spots').select('id,name,country_code,activity').order('name');
      if (!cancelled) setSpots((data as SpotOption[] | null) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // small preview of the chosen file
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? spots.filter((s) => s.name.toLowerCase().includes(q)) : spots;
    return list.slice(0, 40);
  }, [spots, search]);

  const chosen = spots.find((s) => s.id === spotId);
  const video = file ? isVideoFile(file) : false;

  async function submit() {
    if (!user || !file || !spotId) return;
    setBusy(true);
    setError('');
    try {
      await uploadMedia({ file, spotId, caption, userId: user.id });
      onUploaded();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }

  function close() {
    if (busy) return;
    if ((file || caption.trim()) && !window.confirm('Discard this post?')) return;
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-3" onClick={close}>
      <div
        className="max-h-full w-full max-w-md overflow-auto rounded-lg bg-white p-4 text-sm text-gray-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">New post</h2>
          <button onClick={close} className="text-gray-500 hover:text-gray-800" aria-label="Close">
            ✕
          </button>
        </div>

        {/* 1) spot */}
        <div className="mt-3">
          <div className="font-medium text-gray-700">1. Where was it taken?</div>
          {chosen ? (
            <div className="mt-1 flex items-center justify-between rounded border border-sky-300 bg-sky-50 px-2 py-1.5">
              <span>
                {activityOf(chosen.activity).emoji} {chosen.name}
                {chosen.country_code ? ` (${countryName(chosen.country_code)})` : ''}
              </span>
              <button onClick={() => setSpotId('')} disabled={busy} className="text-xs text-sky-700 hover:underline">
                change
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                placeholder="Search a spot…"
                className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-gray-900"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <ul className="mt-1 max-h-40 overflow-auto rounded border border-gray-200">
                {matches.length === 0 && <li className="px-2 py-1.5 text-gray-400">No spot found.</li>}
                {matches.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => setSpotId(s.id)}
                      className="block w-full px-2 py-1.5 text-left hover:bg-sky-50"
                    >
                      {activityOf(s.activity).emoji} {s.name}
                      {s.country_code && <span className="text-gray-400"> · {countryName(s.country_code)}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* 2) file */}
        <div className="mt-4">
          <div className="font-medium text-gray-700">2. Photo or video</div>
          {file ? (
            <div className="mt-1">
              <div className="flex max-h-60 justify-center overflow-hidden rounded bg-black">
                {previewUrl &&
                  (video ? (
                    <video src={previewUrl} muted playsInline controls className="max-h-60 max-w-full" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt="" className="max-h-60 max-w-full object-contain" />
                  ))}
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                <span className="truncate">{file.name}</span>
                <button onClick={() => setFile(null)} disabled={busy} className="text-sky-700 hover:underline">
                  remove
                </button>
              </div>
            </div>
          ) : (
            <label className="mt-1 flex cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed border-gray-300 px-3 py-6 text-center text-gray-600 hover:border-sky-400 hover:bg-sky-50">
              <span className="text-2xl">📷 🎬</span>
              <span className="mt-1 font-medium">Choose a photo or video</span>
              <span className="mt-0.5 text-xs text-gray-500">
                Photos: JPG, PNG, WebP. Videos: MP4, MOV or WebM, max. {MAX_VIDEO_SECONDS} seconds and 50 MB.
              </span>
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
          )}
        </div>

        {/* 3) caption */}
        <div className="mt-4">
          <div className="font-medium text-gray-700">3. Caption (optional)</div>
          <input
            type="text"
            maxLength={200}
            placeholder="What can we see?"
            className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-gray-900"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Only post content you created yourself. Photos are shrunk and stripped of hidden data such as the GPS
          position. Videos are uploaded as they are, so check that your video does not show a location you want
          to keep private.
        </p>

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <div className="mt-4 flex gap-2">
          <button
            onClick={submit}
            disabled={busy || !file || !spotId}
            className="rounded bg-sky-600 px-4 py-1.5 font-medium text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {busy ? (video ? 'Uploading video…' : 'Uploading…') : 'Post'}
          </button>
          <button
            onClick={close}
            disabled={busy}
            className="rounded border border-gray-300 px-4 py-1.5 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
