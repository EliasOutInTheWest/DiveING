'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { activityOf } from '@/lib/activities';
import { mediaThumbUrl, mediaUrl, removeMediaFiles } from '@/lib/photos';

type Post = {
  id: string;
  type: string;
  storage_path: string;
  poster_path: string | null;
  caption: string | null;
  spot_id: string;
  created_at: string;
  spots: { name: string; activity: string | null } | { name: string; activity: string | null }[] | null;
};

const PAGE = 24;
const spotOf = (p: Post) => (Array.isArray(p.spots) ? (p.spots[0] ?? null) : p.spots);

type Props = { userId: string; isMe: boolean; onCountChange: (delta: number) => void };

// Photos and videos a person posted, as a grid. Click opens a viewer.
export default function PostGrid({ userId, isMe, onCountChange }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(
    async (offset: number) => {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('media')
        .select('id,type,storage_path,poster_path,caption,spot_id,created_at,spots(name,activity)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE - 1);
      setLoading(false);
      if (err) {
        setError('Could not load posts.');
        return;
      }
      const rows = (data ?? []) as unknown as Post[];
      setPosts((prev) => (offset === 0 ? rows : [...prev, ...rows]));
      setMore(rows.length === PAGE);
    },
    [userId]
  );

  useEffect(() => {
    setPosts([]);
    setOpen(null);
    load(0);
  }, [load]);

  // keyboard in the viewer
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
      if (e.key === 'ArrowRight') setOpen((i) => (i !== null && i < posts.length - 1 ? i + 1 : i));
      if (e.key === 'ArrowLeft') setOpen((i) => (i !== null && i > 0 ? i - 1 : i));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, posts.length]);

  async function remove(post: Post) {
    if (!window.confirm('Delete this post for good?')) return;
    const { error: err } = await supabase.from('media').delete().eq('id', post.id);
    if (err) {
      setError('Could not delete: ' + err.message);
      return;
    }
    await removeMediaFiles(post);
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
    setOpen(null);
    onCountChange(-1);
  }

  if (error) return <p className="py-6 text-center text-sm text-red-600">{error}</p>;
  if (!loading && posts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white py-10 text-center text-sm text-gray-500">
        {isMe ? (
          <>
            You have not posted yet.{' '}
            <Link href="/feed" className="font-medium text-sky-700 hover:underline">
              Open the feed
            </Link>{' '}
            and use Upload to share your first photo or video.
          </>
        ) : (
          'No posts yet.'
        )}
      </div>
    );
  }

  const current = open !== null ? posts[open] : null;
  const currentSpot = current ? spotOf(current) : null;

  return (
    <div>
      <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
        {posts.map((p, i) => {
          const thumb = mediaThumbUrl(p);
          const spot = spotOf(p);
          return (
            <button
              key={p.id}
              onClick={() => setOpen(i)}
              aria-label={`Open ${p.type} from ${spot?.name ?? 'a spot'}`}
              className="group relative aspect-square overflow-hidden rounded-md bg-gray-200"
            >
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb} alt={p.caption ?? ''} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-gray-800 text-2xl text-white">▶</span>
              )}
              {p.type === 'video' && <span className="absolute right-1.5 top-1.5 text-xs text-white drop-shadow">▶</span>}
              <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/60 to-transparent px-1.5 pb-1 pt-4 text-left text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                {activityOf(spot?.activity).emoji} {spot?.name}
              </span>
            </button>
          );
        })}
      </div>
      {loading && <p className="py-4 text-center text-sm text-gray-500">Loading…</p>}
      {!loading && more && (
        <button
          onClick={() => load(posts.length)}
          className="mx-auto mt-3 block rounded-full border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium hover:bg-gray-50"
        >
          Show more
        </button>
      )}

      {current && open !== null && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/90"
          role="dialog"
          aria-modal="true"
          aria-label="Post"
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(null)}
        >
          <div className="flex items-center justify-between p-3 text-white">
            <span className="text-sm text-gray-300">
              {open + 1} / {posts.length}
            </span>
            <button onClick={() => setOpen(null)} aria-label="Close" className="px-2 text-3xl leading-none">
              ×
            </button>
          </div>
          <div
            className="relative flex min-h-0 flex-1 items-center justify-center px-2"
            onMouseDown={(e) => e.target === e.currentTarget && setOpen(null)}
          >
            {open > 0 && (
              <button
                onClick={() => setOpen(open - 1)}
                aria-label="Previous"
                className="absolute left-2 z-10 rounded-full bg-white/15 px-3 py-2 text-2xl text-white hover:bg-white/25"
              >
                ‹
              </button>
            )}
            {current.type === 'video' ? (
              <video key={current.id} src={mediaUrl(current)} poster={mediaThumbUrl(current) ?? undefined} controls autoPlay playsInline className="max-h-full max-w-full rounded" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={current.id} src={mediaUrl(current)} alt={current.caption ?? ''} className="max-h-full max-w-full rounded object-contain" />
            )}
            {open < posts.length - 1 && (
              <button
                onClick={() => setOpen(open + 1)}
                aria-label="Next"
                className="absolute right-2 z-10 rounded-full bg-white/15 px-3 py-2 text-2xl text-white hover:bg-white/25"
              >
                ›
              </button>
            )}
          </div>
          <div className="flex items-end justify-between gap-3 p-4 text-white">
            <div className="min-w-0">
              {current.caption && <p className="mb-1 text-sm">{current.caption}</p>}
              <Link href={`/map?spot=${current.spot_id}`} className="text-sm font-medium text-sky-300 hover:underline">
                {activityOf(currentSpot?.activity).emoji} {currentSpot?.name ?? 'Open spot'} on the map
              </Link>
              <span className="ml-2 text-xs text-gray-400">{new Date(current.created_at).toLocaleDateString()}</span>
            </div>
            {isMe && (
              <button onClick={() => remove(current)} className="shrink-0 rounded-full border border-white/30 px-3 py-1 text-xs hover:bg-white/10">
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
