import { del, put } from '@vercel/blob';
import { env, isBlobConfigured } from '../config/env.js';

export type UploadResult = {
  url: string;
  publicId: string;
  resourceType: 'image' | 'video' | 'raw';
};

function resourceTypeFromMime(mime: string): UploadResult['resourceType'] {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/') || mime.startsWith('audio/')) return 'video';
  return 'raw';
}

export async function uploadBuffer(
  buffer: Buffer,
  options: { folder?: string; filename?: string; contentType?: string } = {}
): Promise<UploadResult> {
  if (!isBlobConfigured()) {
    throw new Error('Blob storage is not configured. Set BLOB_READ_WRITE_TOKEN.');
  }

  const folder = (options.folder ?? 'giatinh/vault').replace(/^\/+|\/+$/g, '');
  const filename = (options.filename ?? 'file').replace(/[^a-zA-Z0-9._-]/g, '_') || 'file';
  const contentType = options.contentType || 'application/octet-stream';

  const blob = await put(`${folder}/${filename}`, buffer, {
    access: 'public',
    token: env.blobToken,
    contentType,
    addRandomSuffix: true,
  });

  return {
    url: blob.url,
    publicId: blob.url,
    resourceType: resourceTypeFromMime(contentType),
  };
}

/** Deletes a Vercel Blob file. Ignores ids left over from the old host. */
export async function destroyAsset(publicId: string): Promise<void> {
  if (!isBlobConfigured() || !publicId.includes('blob.vercel-storage.com')) return;
  await del(publicId, { token: env.blobToken });
}
