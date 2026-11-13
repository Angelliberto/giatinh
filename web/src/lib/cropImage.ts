import type { Area } from 'react-easy-crop';
import { API_URL, getToken } from '@/lib/api';

const localImages = new Map<string, Promise<string>>();

async function imageForCanvas(src: string): Promise<string> {
  if (src.startsWith('blob:') || src.startsWith('data:')) return src;
  const cached = localImages.get(src);
  if (cached) return cached;

  const pending = (async () => {
    const headers = new Headers();
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const res = await fetch(`${API_URL}/api/upload/proxy?url=${encodeURIComponent(src)}`, {
      headers,
      credentials: 'include',
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || 'Could not load that image for cropping');
    }
    const blob = await res.blob();
    if (blob.type && !blob.type.startsWith('image/')) {
      throw new Error('That URL is not an image');
    }
    return URL.createObjectURL(blob);
  })().catch((err) => {
    localImages.delete(src);
    throw err;
  });

  localImages.set(src, pending);
  return pending;
}

export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: Area,
  mimeType = 'image/jpeg',
  quality = 0.92
): Promise<Blob> {
  const image = await loadImage(await imageForCanvas(imageSrc));
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  const width = Math.max(1, Math.round(pixelCrop.width));
  const height = Math.max(1, Math.round(pixelCrop.height));
  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    width,
    height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('Crop failed'));
        else resolve(blob);
      },
      mimeType,
      quality
    );
  });
}

export async function getCroppedImageDataUrl(
  imageSrc: string,
  pixelCrop: Area,
  mimeType = 'image/jpeg',
  quality = 0.85
): Promise<string> {
  const image = await loadImage(await imageForCanvas(imageSrc));
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  const maxEdge = 960;
  const scale = Math.min(1, maxEdge / Math.max(pixelCrop.width, pixelCrop.height));
  const width = Math.max(1, Math.round(pixelCrop.width * scale));
  const height = Math.max(1, Math.round(pixelCrop.height * scale));
  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    width,
    height
  );

  return canvas.toDataURL(mimeType, quality);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('blob:') && !src.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for crop'));
    img.src = src;
  });
}

export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type || 'image/jpeg' });
}
