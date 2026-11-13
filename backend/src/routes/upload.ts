import { Router, type Response } from 'express';
import { isIP } from 'node:net';
import multer from 'multer';
import { Asset } from '../models/Asset.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { destroyAsset, uploadBuffer } from '../services/storage.js';
import { isBlobConfigured } from '../config/env.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const uploadRouter = Router();
const assetsRouter = Router();

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

function blockedImageHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true;
  if (!isIP(host)) return false;
  if (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) return true;
  if (host === '0.0.0.0' || host.startsWith('127.') || host.startsWith('10.') || host.startsWith('192.168.') || host.startsWith('169.254.')) {
    return true;
  }
  const [first, second] = host.split('.').map(Number);
  return first === 172 && second >= 16 && second <= 31;
}

function imageTypeFromBytes(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png';
  if (buffer.length >= 6) {
    const head = buffer.toString('ascii', 0, 6);
    if (head === 'GIF87a' || head === 'GIF89a') return 'image/gif';
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

uploadRouter.get('/proxy', requireAuth, async (req: AuthedRequest, res: Response) => {
  const raw = typeof req.query.url === 'string' ? req.query.url : '';
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    res.status(400).json({ error: 'Invalid image URL' });
    return;
  }
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    res.status(400).json({ error: 'Image URL must start with http or https' });
    return;
  }
  if (blockedImageHost(target.hostname)) {
    res.status(400).json({ error: 'That image URL cannot be cropped' });
    return;
  }

  try {
    const upstream = await fetch(target, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
      headers: { Accept: 'image/*,*/*;q=0.8', 'User-Agent': 'GiaTinhCrop/1.0' },
    });
    if (!upstream.ok) {
      res.status(400).json({ error: 'Could not download that image' });
      return;
    }
    const type = (upstream.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (type && !type.startsWith('image/') && !type.startsWith('application/octet-stream') && type !== 'binary/octet-stream') {
      res.status(400).json({ error: 'That URL is not an image' });
      return;
    }
    const advertised = Number(upstream.headers.get('content-length') || 0);
    if (advertised > MAX_IMAGE_BYTES) {
      res.status(400).json({ error: 'Image is too large to crop' });
      return;
    }
    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (buffer.length > MAX_IMAGE_BYTES) {
      res.status(400).json({ error: 'Image is too large to crop' });
      return;
    }
    const sniffed = imageTypeFromBytes(buffer);
    const resolvedType = type.startsWith('image/') ? type : sniffed;
    if (!resolvedType) {
      res.status(400).json({ error: 'That URL is not an image' });
      return;
    }
    res.setHeader('Content-Type', resolvedType);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(buffer);
  } catch (err) {
    console.error('Image proxy failed:', err);
    res.status(400).json({ error: 'Could not download that image' });
  }
});

uploadRouter.post(
  '/',
  requireAuth,
  upload.single('file'),
  async (req: AuthedRequest, res: Response) => {
    if (!isBlobConfigured()) {
      res.status(503).json({
        error: 'File storage is not configured. Set BLOB_READ_WRITE_TOKEN.',
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'file field required (multipart)' });
      return;
    }

    const folderRaw = typeof req.body.folder === 'string' ? req.body.folder : 'vault';
    const folder = `giatinh/${folderRaw.replace(/[^a-zA-Z0-9/_-]/g, '') || 'vault'}`;

    try {
      const result = await uploadBuffer(req.file.buffer, {
        folder,
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });

      const saveToVault = req.body.saveToVault !== 'false' && req.body.saveToVault !== false;
      let asset = null;
      if (saveToVault) {
        asset = await Asset.create({
          url: result.url,
          publicId: result.publicId,
          resourceType: result.resourceType,
          filename: req.file.originalname,
          folder: folderRaw,
        });
      }

      res.status(201).json({
        url: result.url,
        publicId: result.publicId,
        resourceType: result.resourceType,
        asset,
      });
    } catch (err) {
      console.error('Upload failed:', err);
      res.status(500).json({ error: 'Upload failed' });
    }
  }
);

assetsRouter.get('/', requireAuth, async (_req: AuthedRequest, res: Response) => {
  const assets = await Asset.find().sort({ createdAt: -1 });
  res.json({ assets });
});

assetsRouter.delete('/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
  const asset = await Asset.findByIdAndDelete(req.params.id);
  if (!asset) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  try {
    await destroyAsset(asset.publicId);
  } catch (err) {
    console.warn('Storage delete failed:', err);
  }

  res.json({ ok: true });
});

export { uploadRouter, assetsRouter };
