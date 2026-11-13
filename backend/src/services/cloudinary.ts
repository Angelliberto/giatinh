import { v2 as cloudinary } from 'cloudinary';
import { env, isCloudinaryConfigured } from '../config/env.js';

let configured = false;

function ensureConfigured(): void {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_* env vars.');
  }
  if (!configured) {
    cloudinary.config({
      cloud_name: env.cloudinary.cloudName,
      api_key: env.cloudinary.apiKey,
      api_secret: env.cloudinary.apiSecret,
    });
    configured = true;
  }
}

export type UploadResult = {
  url: string;
  publicId: string;
  resourceType: 'image' | 'video' | 'raw';
};

export async function uploadBuffer(
  buffer: Buffer,
  options: { folder?: string; filename?: string; resourceType?: 'image' | 'video' | 'auto' | 'raw' } = {}
): Promise<UploadResult> {
  ensureConfigured();

  const folder = options.folder ?? 'giatinh/vault';
  const resourceType = options.resourceType ?? 'auto';

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        public_id: options.filename ? options.filename.replace(/\.[^.]+$/, '') : undefined,
      },
      (err, result) => {
        if (err || !result) {
          reject(err ?? new Error('Cloudinary upload failed'));
          return;
        }
        const rt = (result.resource_type === 'video' || result.resource_type === 'raw'
          ? result.resource_type
          : 'image') as UploadResult['resourceType'];
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: rt,
        });
      }
    );
    stream.end(buffer);
  });
}

export async function destroyAsset(
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<void> {
  if (!isCloudinaryConfigured() || !publicId) return;
  ensureConfigured();
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}
