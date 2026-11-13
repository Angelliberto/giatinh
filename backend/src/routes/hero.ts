import { Router, type Response } from 'express';
import { HeroImage } from '../models/HeroImage.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { destroyAsset } from '../services/storage.js';

const router = Router();

router.get('/', async (_req, res: Response) => {
  const images = await HeroImage.find().sort({ order: 1 });
  res.json({ images });
});

router.post('/', requireAuth, async (req: AuthedRequest, res: Response) => {
  const { caption, imageUrl, publicId } = req.body as {
    caption?: string;
    imageUrl?: string;
    publicId?: string | null;
  };

  if (!imageUrl) {
    res.status(400).json({ error: 'imageUrl required' });
    return;
  }

  const count = await HeroImage.countDocuments();
  const image = await HeroImage.create({
    caption: caption?.trim() || 'Untitled',
    imageUrl,
    publicId: publicId ?? null,
    order: count,
  });

  res.status(201).json({ image });
});

router.put('/', requireAuth, async (req: AuthedRequest, res: Response) => {
  const { images } = req.body as {
    images?: Array<{
      id?: string;
      _id?: string;
      caption: string;
      imageUrl: string;
      publicId?: string | null;
    }>;
  };

  if (!Array.isArray(images)) {
    res.status(400).json({ error: 'images array required' });
    return;
  }

  await HeroImage.deleteMany({});
  const docs = await HeroImage.insertMany(
    images.map((img, index) => ({
      caption: img.caption?.trim() || 'Untitled',
      imageUrl: img.imageUrl,
      publicId: img.publicId ?? null,
      order: index,
    }))
  );

  res.json({ images: docs });
});

router.delete('/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
  const image = await HeroImage.findByIdAndDelete(req.params.id);
  if (!image) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  if (image.publicId) {
    try {
      await destroyAsset(image.publicId);
    } catch (err) {
      console.warn('Storage delete failed for hero image:', err);
    }
  }

  const remaining = await HeroImage.find().sort({ order: 1 });
  await Promise.all(
    remaining.map((img, index) => {
      img.order = index;
      return img.save();
    })
  );

  res.json({ ok: true });
});

export default router;
