import bcrypt from 'bcryptjs';
import { connectDb } from '../config/db.js';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { HeroImage } from '../models/HeroImage.js';
import { Post } from '../models/Post.js';

const DEFAULT_HERO = [
  {
    caption: 'Void Study No.7 — Berlin 2026',
    imageUrl: 'https://images.unsplash.com/photo-1682407799061-66e5ca0fbecc?w=1200&h=900&fit=crop&auto=format',
    publicId: null,
    order: 0,
  },
  {
    caption: 'Negative Architectures — 2026',
    imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1200&h=900&fit=crop&auto=format',
    publicId: null,
    order: 1,
  },
  {
    caption: 'Shadow Archive — Prenzlauer Berg',
    imageUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1200&h=900&fit=crop&auto=format',
    publicId: null,
    order: 2,
  },
];

async function seed() {
  await connectDb();

  const passwordHash = await bcrypt.hash(env.adminPassword, 12);
  let user = await User.findOne();
  if (!user) {
    user = await User.create({
      email: 'admin@studio.local',
      passwordHash,
    });
    console.log('Created admin user');
  } else {
    user.passwordHash = passwordHash;
    await user.save();
    console.log('Updated admin password from ADMIN_PASSWORD');
  }

  const heroCount = await HeroImage.countDocuments();
  if (heroCount === 0) {
    await HeroImage.insertMany(DEFAULT_HERO);
    console.log(`Seeded ${DEFAULT_HERO.length} hero slides`);
  } else {
    console.log(`Hero slides already present (${heroCount}), skipping`);
  }

  const postCount = await Post.countDocuments();
  if (postCount === 0) {
    await Post.create({
      title: 'Void Study No. 7',
      subtitle: 'Negative Architectures',
      slug: 'void-study-no-7',
      status: 'published',
      publishedAt: new Date('2026-09-15'),
      coverUrl:
        'https://images.unsplash.com/photo-1682407799061-66e5ca0fbecc?w=1200&h=700&fit=crop&auto=format',
      blocks: [
        {
          type: 'text',
          content:
            'The first of these was made at 5:43 in the morning, the sky still undecided between the purple of the previous night and the grey reluctance of dawn.',
        },
        {
          type: 'image',
          url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500&h=600&fit=crop&auto=format',
          meta: { label: 'FIG. 02' },
        },
        {
          type: 'audio',
          content: 'Nocturne in Static',
          meta: { duration: '04:32' },
        },
      ],
    });
    console.log('Seeded sample published post');
  } else {
    console.log(`Posts already present (${postCount}), skipping`);
  }

  console.log('Seed complete');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
