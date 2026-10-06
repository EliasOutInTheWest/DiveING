'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { FeedItem } from '@/lib/types';
import { removeMediaFiles } from '@/lib/photos';
import AuthProvider, { useAuth } from '@/components/AuthProvider';
import { DirtyProvider } from '@/components/DirtyContext';
import AuthBox from '@/components/AuthBox';
import ProfilePanel from '@/components/ProfilePanel';
import FeedCard from '@/components/FeedCard';
import UploadPanel from '@/components/UploadPanel';

type FeedMode = 'foryou' | 'newest';
const PAGE_SIZE = 12;

export default function FeedApp() {
  return (
    <AuthProvider>
      <DirtyProvider>
        <FeedView />
      </DirtyProvider>
    </AuthProvider>
  );
}

function FeedView() {
  const router = useRouter();
  const { user, isAdmin, isVerified, loading: authLoading } = useAuth();
  const uid = user?.id;

  const [mode, setMode] = useState<FeedMode>('foryou');
  const [items, setItems] = useState<FeedItem[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<FeedItem[]>([]);
  const busy = useRef(false);
  const generation = useRef(0); // makes sure an old answer never overwrites a newer one
  const viewed = useRef(new Set<string>());

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // load the first page (reset) or the next page of the feed
  const load = useCallback(async (feedMode: FeedMode, reset: boolean) => {
    if (busy.current && !reset) return;
    if (reset) generation.current += 1;
    const myGeneration = generation.current;
    busy.current = true;
    setLoading(true);
    setError('');

    const exclude = reset ? [] : itemsRef.current.map((i) => i.id);
    const { data, error: err } = await supabase.rpc('get_feed', {
      p_mode: feedMode,
      p_limit: PAGE_SIZE,
      p_exclude: exclude,
    });
    if (myGeneration !== generation.current) return; // a newer request took over

    if (err) {
      console.error('feed error:', err.message);
      setError(
        err.message.includes('get_feed')
          ? 'The feed is not set up yet. Run videos-feed.sql in Supabase first.'
          : 'The feed could not be loaded.'
      );
    } else {
      const rows = ((data as FeedItem[] | null) ?? []).map((r) => ({ ...r, like_count: Number(r.like_count) }));
      if (reset) {
        itemsRef.current = rows;
        setItems(rows);
        setActive(0);
        scrollerRef.current?.scrollTo({ top: 0 });
      } else {
        const have = new Set(itemsRef.current.map((i) => i.id));
        const fresh = rows.filter((r) => !have.has(r.id));
        itemsRef.current = [...itemsRef.current, ...fresh];
        setItems(itemsRef.current);
      }
      setDone(rows.length < PAGE_SIZE);
    }
    busy.current = false;
    setLoading(false);
  }, []);

  // first load, and again when the tab or the logged-in user changes
  useEffect(() => {
    if (authLoading) return;
    load(mode, true);
  }, [mode, uid, authLoading, load]);

  // near the end: load more
  useEffect(() => {
    if (!done && !loading && !error && items.length > 0 && active >= items.length - 3) {
      load(mode, false);
    }
  }, [active, items.length, done, loading, error, mode, load]);

  // arrow keys
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (uploadOpen || profileOpen) return;
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const el = scrollerRef.current;
      if (!el) return;
      el.scrollBy({ top: (e.key === 'ArrowDown' ? 1 : -1) * el.clientHeight, behavior: 'smooth' });
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [uploadOpen, profileOpen]);

  const handleVisible = useCallback((index: number) => setActive(index), []);

  // remember what was seen, so "For you" shows new things first
  function recordView(id: string) {
    if (!uid || viewed.current.has(id)) return;
    viewed.current.add(id);
    supabase
      .from('media_views')
      .upsert({ user_id: uid, media_id: id }, { onConflict: 'user_id,media_id', ignoreDuplicates: true })
      .then(({ error: err }) => {
        if (err) console.error('view error:', err.message);
      });
  }

  async function toggleLike(item: FeedItem) {
    if (!uid || !isVerified) return;
    const wasLiked = item.liked;
    const apply = (liked: boolean, count: number) =>
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, liked, like_count: count } : i)));

    apply(!wasLiked, Math.max(0, item.like_count + (wasLiked ? -1 : 1))); // show it right away
    const { error: err } = wasLiked
      ? await supabase.from('media_likes').delete().eq('media_id', item.id).eq('user_id', uid)
      : await supabase.from('media_likes').insert({ media_id: item.id });
    if (err) {
      console.error('like error:', err.message);
      apply(wasLiked, item.like_count); // go back
    }
  }

  async function report(item: FeedItem) {
    const reason = window.prompt('Why are you reporting this post? (optional)');
    if (reason === null) return;
    const { error: err } = await supabase
      .from('media_reports')
      .insert({ media_id: item.id, reason: reason.trim() || null });
    if (err) {
      window.alert(err.code === '23505' ? 'You already reported this post.' : err.message);
      return;
    }
    window.alert('Thank you. An admin will take a look.');
  }

  async function remove(item: FeedItem) {
    if (!window.confirm('Delete this post?')) return;
    const { error: err } = await supabase.from('media').delete().eq('id', item.id);
    if (err) {
      window.alert(err.message);
      return;
    }
    await removeMediaFiles(item);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  }

  function openPost() {
    if (!user) {
      window.alert('Please log in to post (top right).');
    } else if (!isVerified) {
      window.alert('Please confirm your email address first.');
    } else {
      setUploadOpen(true);
    }
  }

  const tabClass = (m: FeedMode) =>
    `rounded-full px-3 py-1 text-sm font-medium ${
      mode === m ? 'bg-white text-gray-900' : 'text-white/80 hover:text-white'
    }`;

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-black">
      {/* ---------- top bar ---------- */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-3">
        <div className="pointer-events-auto flex gap-2 text-sm font-medium">
          <Link href="/" className="rounded bg-black/45 px-2.5 py-1.5 text-white backdrop-blur hover:bg-black/65">
            ←<span className="hidden sm:inline"> Home</span>
          </Link>
          <Link href="/map" className="rounded bg-black/45 px-2.5 py-1.5 text-white backdrop-blur hover:bg-black/65">
            🗺<span className="hidden sm:inline"> Map</span>
          </Link>
          <button onClick={openPost} className="rounded bg-sky-500 px-2.5 py-1.5 text-white hover:bg-sky-600">
            + Post
          </button>
        </div>
        <div className="pointer-events-auto absolute left-1/2 top-14 flex sm:top-3 -translate-x-1/2 gap-1 rounded-full bg-black/45 p-1 backdrop-blur">
          <button onClick={() => setMode('foryou')} className={tabClass('foryou')}>
            For you
          </button>
          <button onClick={() => setMode('newest')} className={tabClass('newest')}>
            Newest
          </button>
        </div>
      </div>

      <AuthBox className="absolute right-3 top-3 z-20" onOpenProfile={() => setProfileOpen(true)} />

      {/* ---------- the posts ---------- */}
      <div ref={scrollerRef} className="h-dvh snap-y snap-mandatory overflow-y-scroll overscroll-contain">
        {items.map((item, i) => (
          <FeedCard
            key={item.id}
            item={item}
            index={i}
            active={i === active}
            near={Math.abs(i - active) <= 1}
            muted={muted}
            canInteract={!!uid && isVerified}
            canDelete={item.user_id === uid || isAdmin}
            isOwn={item.user_id === uid}
            onVisible={handleVisible}
            onToggleMute={() => setMuted((m) => !m)}
            onLike={() => toggleLike(item)}
            onReport={() => report(item)}
            onDelete={() => remove(item)}
            onOpenSpot={() => router.push(`/map?spot=${item.spot_id}`)}
            onViewed={() => recordView(item.id)}
          />
        ))}

        {items.length > 0 && done && (
          <section className="flex h-dvh snap-start flex-col items-center justify-center bg-slate-900 px-6 text-center text-white">
            <div className="text-5xl">🌊</div>
            <h2 className="mt-3 text-xl font-semibold">You have seen everything for now</h2>
            <p className="mt-1 max-w-sm text-sm text-slate-300">
              Post your own photo or video, or explore more dive spots on the map.
            </p>
            <div className="mt-5 flex gap-3">
              <button onClick={openPost} className="rounded-full bg-sky-500 px-5 py-2 font-medium hover:bg-sky-600">
                + Post
              </button>
              <Link href="/map" className="rounded-full border border-white/50 px-5 py-2 font-medium hover:bg-white/10">
                Open the map
              </Link>
            </div>
          </section>
        )}
      </div>

      {/* ---------- empty / loading / error ---------- */}
      {items.length === 0 && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center text-white">
          {loading ? (
            <p className="text-gray-300">Loading…</p>
          ) : error ? (
            <>
              <p className="max-w-sm text-sm text-red-300">{error}</p>
              <button
                onClick={() => load(mode, true)}
                className="mt-3 rounded-full border border-white/50 px-4 py-1.5 text-sm hover:bg-white/10"
              >
                Try again
              </button>
            </>
          ) : (
            <>
              <div className="text-5xl">🤿</div>
              <h2 className="mt-3 text-xl font-semibold">No posts yet</h2>
              <p className="mt-1 max-w-sm text-sm text-gray-300">Be the first to share a photo or video of a dive spot.</p>
              <button onClick={openPost} className="mt-4 rounded-full bg-sky-500 px-5 py-2 font-medium hover:bg-sky-600">
                + Post
              </button>
            </>
          )}
        </div>
      )}

      {uploadOpen && (
        <UploadPanel
          onClose={() => setUploadOpen(false)}
          onUploaded={() => {
            // switch to "Newest" so you see your new post at the top
            if (mode === 'newest') load('newest', true);
            else setMode('newest');
          }}
        />
      )}

      {user && profileOpen && (
        <ProfilePanel
          onClose={() => setProfileOpen(false)}
          onOpenSpot={(id) => router.push(`/map?spot=${id}`)}
          onShowFavourites={() => router.push('/map?favourites=1')}
          onLikesChanged={() => {}}
        />
      )}
    </div>
  );
}
