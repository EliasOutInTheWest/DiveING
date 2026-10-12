import { supabase } from '@/lib/supabase';

export const AVATAR_BUCKET = 'avatars';

// profiles.avatar_url stores the path inside the bucket
export const avatarSrc = (path: string | null | undefined): string | null =>
  path ? supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl : null;

// Crops to a centred square, shrinks to 384 px and removes hidden data (EXIF/GPS)
export async function makeAvatar(file: File): Promise<{ blob: Blob; ext: 'webp' | 'jpg' }> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('This image could not be read. Please use a JPG, PNG or WebP file.');
  }
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;
    const size = Math.min(384, side);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not process the image.');
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
    const toBlob = (type: string) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, 0.85));
    const webp = await toBlob('image/webp');
    if (webp && webp.type === 'image/webp') return { blob: webp, ext: 'webp' };
    const jpg = await toBlob('image/jpeg');
    if (!jpg) throw new Error('Could not process the image.');
    return { blob: jpg, ext: 'jpg' };
  } finally {
    bitmap.close();
  }
}

// Uploads a new profile picture, saves the path in the profile, removes the old file.
export async function uploadAvatar(uid: string, file: File, oldPath: string | null): Promise<string> {
  if (file.size > 25 * 1024 * 1024) throw new Error('Please choose an image under 25 MB.');
  const { blob, ext } = await makeAvatar(file);
  const path = `${uid}/${Date.now()}.${ext}`;
  const up = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, blob, { contentType: blob.type, cacheControl: '31536000' });
  if (up.error) throw new Error(up.error.message);
  const { error } = await supabase.from('profiles').update({ avatar_url: path }).eq('id', uid);
  if (error) {
    await supabase.storage.from(AVATAR_BUCKET).remove([path]);
    throw new Error(error.message);
  }
  if (oldPath) await supabase.storage.from(AVATAR_BUCKET).remove([oldPath]);
  return path;
}

export async function removeAvatar(uid: string, oldPath: string | null): Promise<void> {
  const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', uid);
  if (error) throw new Error(error.message);
  if (oldPath) await supabase.storage.from(AVATAR_BUCKET).remove([oldPath]);
}
