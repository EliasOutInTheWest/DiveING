import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/server/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BUCKETS = ['spot-photos', 'spot-videos'];

// Runs once a day (see vercel.json). Deletes the photos and videos of people whose
// subscription ended more than 30 days ago. Spots and reviews stay.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not set.' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Not allowed.' }, { status: 401 });
  }

  const admin = adminClient();
  const { data: due, error } = await admin.rpc('users_due_for_purge', { p_limit: 20 });
  if (error) {
    console.error('purge list error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result: { user: string; files: number; posts: number; ok: boolean }[] = [];

  for (const row of (due ?? []) as { user_id: string }[]) {
    const userId = row.user_id;
    let files = 0;
    let ok = true;
    try {
      // every file of this user lives in a folder named like the user id (photos, thumbnails, posters, videos)
      for (const bucket of BUCKETS) {
        for (let round = 0; round < 50; round++) {
          const { data: list, error: listErr } = await admin.storage.from(bucket).list(userId, { limit: 100 });
          if (listErr) throw new Error(listErr.message);
          if (!list || list.length === 0) break;
          const { error: rmErr } = await admin.storage.from(bucket).remove(list.map((f) => `${userId}/${f.name}`));
          if (rmErr) throw new Error(rmErr.message);
          files += list.length;
        }
      }
      // files are gone: now remove the posts themselves (likes, views and reports go with them)
      const { data: gone, error: delErr } = await admin.from('media').delete().eq('user_id', userId).select('id');
      if (delErr) throw new Error(delErr.message);
      result.push({ user: userId, files, posts: gone?.length ?? 0, ok });
    } catch (e) {
      ok = false;
      console.error('purge failed for', userId, e);
      result.push({ user: userId, files, posts: 0, ok });
    }
  }

  return NextResponse.json({ checked: result.length, result });
}
