// Uploads a photo or a video to a dive spot.
// Photos are shrunk in the browser (GPS data removed). Videos are uploaded as they are,
// plus a poster picture (a frame of the video) so the feed and the grids have a preview.

import { supabase } from '@/lib/supabase';
import { resizeImage } from '@/lib/image';
import { PHOTO_BUCKET, VIDEO_BUCKET } from '@/lib/photos';

export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 60;

export const ACCEPT_MEDIA = 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm';

const VIDEO_TYPES: Record<string, { mime: string; ext: string }> = {
  'video/mp4': { mime: 'video/mp4', ext: 'mp4' },
  'video/quicktime': { mime: 'video/quicktime', ext: 'mov' },
  'video/webm': { mime: 'video/webm', ext: 'webm' },
};

const VIDEO_BY_EXT: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
};

export function isVideoFile(file: File): boolean {
  if (file.type.startsWith('video/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return ext in VIDEO_BY_EXT;
}

function videoKind(file: File) {
  let mime = file.type;
  if (!(mime in VIDEO_TYPES)) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    mime = VIDEO_BY_EXT[ext] ?? '';
  }
  return VIDEO_TYPES[mime] ?? null;
}

const CODEC_HELP =
  'This video could not be read by your browser. Please use an MP4 (H.264) video, most phones record this by default.';

function waitFor(el: HTMLVideoElement, ok: string, ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error(CODEC_HELP));
    }, ms);
    const onOk = () => {
      cleanup();
      resolve();
    };
    const onErr = () => {
      cleanup();
      reject(new Error(CODEC_HELP));
    };
    function cleanup() {
      window.clearTimeout(timer);
      el.removeEventListener(ok, onOk);
      el.removeEventListener('error', onErr);
    }
    el.addEventListener(ok, onOk);
    el.addEventListener('error', onErr);
  });
}

// Reads the length of the video and takes a picture of an early frame
async function probeVideo(file: File): Promise<{ duration: number; poster: Blob }> {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  try {
    video.src = url;
    await waitFor(video, 'loadedmetadata', 15000);
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) throw new Error(CODEC_HELP);
    if (duration > MAX_VIDEO_SECONDS + 0.5) {
      throw new Error(`This video is too long (max. ${MAX_VIDEO_SECONDS} seconds).`);
    }

    video.currentTime = Math.min(0.5, duration / 2);
    await waitFor(video, 'seeked', 15000);

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) throw new Error(CODEC_HELP);
    const scale = Math.min(1, 720 / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create a preview picture.');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const poster = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8));
    if (!poster) throw new Error('Could not create a preview picture.');
    return { duration, poster };
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}

type Args = { file: File; spotId: string; caption: string; userId: string };

export async function uploadMedia({ file, spotId, caption, userId }: Args): Promise<void> {
  const cleanCaption = caption.trim() || null;
  const id = crypto.randomUUID();

  // ---------- video ----------
  if (isVideoFile(file)) {
    const kind = videoKind(file);
    if (!kind) throw new Error('Please use an MP4, MOV or WebM video.');
    if (file.size > MAX_VIDEO_BYTES) throw new Error('This video is too large (max. 50 MB).');

    const { duration, poster } = await probeVideo(file);

    const videoPath = `${userId}/${id}.${kind.ext}`;
    const posterPath = `${userId}/${id}_p.jpg`;

    const upPoster = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(posterPath, poster, { contentType: 'image/jpeg', cacheControl: '31536000' });
    if (upPoster.error) throw new Error(upPoster.error.message);

    const upVideo = await supabase.storage
      .from(VIDEO_BUCKET)
      .upload(videoPath, file, { contentType: kind.mime, cacheControl: '31536000' });
    if (upVideo.error) {
      await supabase.storage.from(PHOTO_BUCKET).remove([posterPath]);
      throw new Error(upVideo.error.message);
    }

    const { error: dbErr } = await supabase.from('media').insert({
      spot_id: spotId,
      type: 'video',
      storage_path: videoPath,
      poster_path: posterPath,
      duration_s: Math.max(1, Math.round(duration)),
      caption: cleanCaption,
    });
    if (dbErr) {
      await supabase.storage.from(VIDEO_BUCKET).remove([videoPath]);
      await supabase.storage.from(PHOTO_BUCKET).remove([posterPath]);
      throw new Error(dbErr.message);
    }
    return;
  }

  // ---------- photo ----------
  if (file.size > MAX_IMAGE_BYTES) throw new Error('This file is too large (max. 25 MB).');

  const { full, thumb } = await resizeImage(file);
  const path = `${userId}/${id}.${full.ext}`;
  const tPath = `${userId}/${id}_t.${thumb.ext}`;
  const contentType = full.ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const options = { contentType, cacheControl: '31536000' };

  const up1 = await supabase.storage.from(PHOTO_BUCKET).upload(path, full.blob, options);
  if (up1.error) throw new Error(up1.error.message);
  const up2 = await supabase.storage.from(PHOTO_BUCKET).upload(tPath, thumb.blob, options);
  if (up2.error) {
    await supabase.storage.from(PHOTO_BUCKET).remove([path]);
    throw new Error(up2.error.message);
  }

  const { error: dbErr } = await supabase.from('media').insert({
    spot_id: spotId,
    type: 'image',
    storage_path: path,
    caption: cleanCaption,
  });
  if (dbErr) {
    await supabase.storage.from(PHOTO_BUCKET).remove([path, tPath]);
    throw new Error(dbErr.message);
  }
}
