'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { activityOf } from '@/lib/activities';
import { countryName } from '@/lib/countries';
import { mediaThumbUrl } from '@/lib/photos';

type LikedSpot = { id: string; name: string; level: string | null; max_depth_m: number | null; country_code: string | null; activity: string | null };
type LikedPost = { id: string; type: string; storage_path: string; poster_path: string | null; caption: string | null; spot_id: string };

const first = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

// Spots and posts you liked (only visible on your own profile)
export default function Favourites({ userId }: { userId: string }) {
  const [spots, setSpots] = useState<LikedSpot[]>([]);
  const [posts, setPosts] = useState<LikedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [s, p] = await Promise.all([
        supabase.from('spot_likes').select('created_at,spots(id,name,level,max_depth_m,country_code,activity)').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('media_likes').select('created_at,media(id,type,storage_path,poster_path,caption,spot_id)').eq('user_id', userId).order('created_at', { ascending: false }),
      ]);
      if (cancelled) return;
      setSpots(((s.data ?? []) as unknown as { spots: LikedSpot | LikedSpot[] | null }[]).map((r) => first(r.spots)).filter((x): x is LikedSpot => x !== null));
      setPosts(((p.data ?? []) as unknown as { media: LikedPost | LikedPost[] | null }[]).map((r) => first(r.media)).filter((x): x is LikedPost => x !== null));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) return <p className="py-6 text-center text-sm text-gray-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">♥ Liked spots ({spots.length})</h3>
          {spots.length > 0 && (
            <Link href="/map?favourites=1" className="text-xs font-medium text-sky-700 hover:underline">
              Show on the map
            </Link>
          )}
        </div>
        {spots.length === 0 ? (
          <p className="text-sm text-gray-500">No liked spots yet. Click the heart on a spot.</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white text-sm">
            {spots.map((s) => (
              <li key={s.id}>
                <Link href={`/map?spot=${s.id}`} className="flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-gray-50">
                  <span className="min-w-0 truncate font-medium">
                    {activityOf(s.activity).emoji} {s.name}
                  </span>
                  <span className="shrink-0 text-xs text-gray-500">
                    {[s.level, s.activity === 'diving' && s.max_depth_m != null ? `${s.max_depth_m} m` : null, s.country_code ? countryName(s.country_code) : null].filter(Boolean).join(' · ')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">♥ Liked posts ({posts.length})</h3>
        {posts.length === 0 ? (
          <p className="text-sm text-gray-500">No liked posts yet. Open a photo or video and click the heart.</p>
        ) : (
          <div className="grid grid-cols-4 gap-1.5">
            {posts.map((p) => (
              <Link key={p.id} href={`/map?spot=${p.spot_id}`} title="Open this spot" className="relative aspect-square overflow-hidden rounded-md bg-gray-200">
                {mediaThumbUrl(p) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaThumbUrl(p) ?? ''} alt={p.caption ?? 'Liked post'} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-gray-800 text-white">▶</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
