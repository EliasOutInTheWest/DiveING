// Shrinks a photo in the browser before it is uploaded.
// Saves storage + loading time, and removes hidden data such as GPS position (EXIF).

export type Resized = { blob: Blob; ext: 'webp' | 'jpg' };

function render(bitmap: ImageBitmap, maxSide: number, type: string, quality: number): Promise<Blob | null> {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function make(bitmap: ImageBitmap, maxSide: number, quality: number, preferWebp: boolean): Promise<Resized> {
  if (preferWebp) {
    const webp = await render(bitmap, maxSide, 'image/webp', quality);
    if (webp && webp.type === 'image/webp') return { blob: webp, ext: 'webp' };
  }
  const jpg = await render(bitmap, maxSide, 'image/jpeg', quality);
  if (!jpg) throw new Error('Could not process the image.');
  return { blob: jpg, ext: 'jpg' };
}

export async function resizeImage(file: File): Promise<{ full: Resized; thumb: Resized }> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('This image could not be read. Please use a JPG, PNG or WebP file.');
  }
  try {
    const full = await make(bitmap, 1600, 0.82, true);
    const thumb = await make(bitmap, 400, 0.8, full.ext === 'webp'); // same format as the full image
    return { full, thumb };
  } finally {
    bitmap.close();
  }
}
