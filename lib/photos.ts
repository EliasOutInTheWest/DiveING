import { supabase } from '@/lib/supabase';

export const PHOTO_BUCKET = 'spot-photos';

export const photoUrl = (path: string) =>
  supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;

// the thumbnail has the same name with "_t" before the file ending
export const thumbPath = (path: string) => path.replace(/(\.[a-z]+)$/i, '_t$1');
