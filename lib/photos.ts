import { supabase } from '@/lib/supabase';

export const PHOTO_BUCKET = 'spot-photos';
export const VIDEO_BUCKET = 'spot-videos';

export const photoUrl = (path: string) =>
  supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;

export const videoUrl = (path: string) =>
  supabase.storage.from(VIDEO_BUCKET).getPublicUrl(path).data.publicUrl;

// the thumbnail has the same name with "_t" before the file ending
export const thumbPath = (path: string) => path.replace(/(\.[a-z]+)$/i, '_t$1');

// What we need to know about a post to show it
export type MediaRef = {
  type: string; // 'image' | 'video'
  storage_path: string;
  poster_path: string | null;
};

// Full-size file (photo, or the video itself)
export const mediaUrl = (m: MediaRef) => (m.type === 'video' ? videoUrl(m.storage_path) : photoUrl(m.storage_path));

// Small preview picture (thumbnail of a photo, or the poster frame of a video)
export const mediaThumbUrl = (m: MediaRef): string | null => {
  if (m.type === 'video') return m.poster_path ? photoUrl(m.poster_path) : null;
  return photoUrl(thumbPath(m.storage_path));
};

// Deletes the files of a post from storage (the database row is deleted separately)
export async function removeMediaFiles(m: MediaRef) {
  if (m.type === 'video') {
    await supabase.storage.from(VIDEO_BUCKET).remove([m.storage_path]);
    if (m.poster_path) await supabase.storage.from(PHOTO_BUCKET).remove([m.poster_path]);
  } else {
    await supabase.storage.from(PHOTO_BUCKET).remove([m.storage_path, thumbPath(m.storage_path)]);
  }
}

// 75 -> "1:15"
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds < 0) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
