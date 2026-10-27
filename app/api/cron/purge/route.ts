import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/server/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PHOTOS = 'spot-photos';
const VIDEOS = 'spot-videos';

type Row = { id: string; type: string; storage_path: string; poster_path: string | null };

// "folder/abc.webp" -> "folder/abc_t.webp" (the small preview picture of a photo)
const thumbOf = (path: string) => path.replace(/(\.[A-Za-z0-9]+)$/, '_t$1');

// Runs once a day (see vercel.json). Deletes the photos and videos that people posted WHILE they had
// DiveING Plus, once their subscription ended more than 30 days ago.
// Posts within the free monthly limit, spots, reviews and the logbook always stay.
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
    let posts = 0;
    let ok = true;
    try {
      for (let round = 0; round < 25; round++) {
        const { data: list, error: listErr } = await admin.rpc('plus_media_for_purge', { p_user: userId });
        if (listErr) throw new Error(listErr.message);
        const rows = (list ?? []) as Row[];
        if (rows.length === 0) break;

        const photoFiles: string[] = [];
        const videoFiles: string[] = [];
        for (const m of rows) {
          if (m.type === 'video') {
            videoFiles.push(m.storage_path);
            if (m.poster_path) photoFiles.push(m.poster_path);
          } else {
            photoFiles.push(m.storage_path, thumbOf(m.storage_path));
          }
        }
        // only paths inside the user's own folder are ever removed
        const own = (p: string) => p.startsWith(`${userId}/`) && !p.includes('..');
        for (const [bucket, paths] of [[PHOTOS, photoFiles.filter(own)], [VIDEOS, videoFiles.filter(own)]] as const) {
          if (paths.length === 0) continue;
          const { error: rmErr } = await admin.storage.from(bucket).remove(paths);
          if (rmErr) throw new Error(rmErr.message);
          files += paths.length;
        }
        // files are gone: now remove the posts themselves (likes, views and reports go with them)
        const { data: gone, error: delErr } = await admin
          .from('media')
          .delete()
          .in('id', rows.map((m) => m.id))
          .select('id');
        if (delErr) throw new Error(delErr.message);
        posts += gone?.length ?? 0;
      }
      result.push({ user: userId, files, posts, ok });
    } catch (e) {
      ok = false;
      console.error('purge failed for', userId, e);
      result.push({ user: userId, files, posts, ok });
    }
  }

  return NextResponse.json({ checked: result.length, result });
}
