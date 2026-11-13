import { Router, type Response } from 'express';
import slugify from 'slugify';
import { Post } from '../models/Post.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';

const publicRouter = Router();
const adminRouter = Router();

function readCoverFocus(value: unknown): { x: number; y: number } | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as { x?: unknown; y?: unknown };
  const x = typeof raw.x === 'number' ? raw.x : Number(raw.x);
  const y = typeof raw.y === 'number' ? raw.y : Number(raw.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
  return {
    x: Math.min(100, Math.max(0, x)),
    y: Math.min(100, Math.max(0, y)),
  };
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = slugify(base, { lower: true, strict: true }) || 'entry';
  let n = 0;
  while (true) {
    const candidate = n === 0 ? slug : `${slug}-${n}`;
    const existing = await Post.findOne({
      slug: candidate,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    });
    if (!existing) return candidate;
    n += 1;
  }
}

publicRouter.get('/', async (_req, res: Response) => {
  const posts = await Post.find({ status: 'published' })
    .sort({ publishedAt: -1, createdAt: -1 })
    .select('-blocks');
  res.json({ posts });
});

publicRouter.get('/:slug', async (req, res: Response) => {
  const post = await Post.findOne({ slug: req.params.slug, status: 'published' });
  if (!post) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({ post });
});

adminRouter.get('/', requireAuth, async (_req: AuthedRequest, res: Response) => {
  const posts = await Post.find().sort({ updatedAt: -1 });
  res.json({ posts });
});

adminRouter.post('/', requireAuth, async (req: AuthedRequest, res: Response) => {
  const {
    title,
    subtitle,
    status,
    blocks,
    coverUrl,
    coverPublicId,
    coverFocus,
    slug: rawSlug,
  } = req.body as Record<string, unknown>;

  if (typeof title !== 'string' && title != null) {
    res.status(400).json({ error: 'title must be a string' });
    return;
  }

  const resolvedTitle = typeof title === 'string' && title.trim() ? title.trim() : 'Untitled';

  const slug = await uniqueSlug(
    typeof rawSlug === 'string' && rawSlug.trim() ? rawSlug : resolvedTitle
  );

  const nextStatus = status === 'published' ? 'published' : 'draft';
  const post = await Post.create({
    title: resolvedTitle,
    subtitle: typeof subtitle === 'string' ? subtitle : '',
    slug,
    status: nextStatus,
    blocks: Array.isArray(blocks) ? blocks : [],
    coverUrl: typeof coverUrl === 'string' ? coverUrl : null,
    coverPublicId: typeof coverPublicId === 'string' ? coverPublicId : null,
    coverFocus: readCoverFocus(coverFocus) ?? { x: 50, y: 50 },
    publishedAt: nextStatus === 'published' ? new Date() : null,
  });

  res.status(201).json({ post });
});

adminRouter.put('/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const body = req.body as Record<string, unknown>;

  if (typeof body.title === 'string') post.title = body.title.trim() || 'Untitled';
  if (typeof body.subtitle === 'string') post.subtitle = body.subtitle;
  if (Array.isArray(body.blocks)) post.blocks = body.blocks as typeof post.blocks;
  if (typeof body.coverUrl === 'string' || body.coverUrl === null) {
    post.coverUrl = body.coverUrl as string | null;
  }
  if (typeof body.coverPublicId === 'string' || body.coverPublicId === null) {
    post.coverPublicId = body.coverPublicId as string | null;
  }
  const focus = readCoverFocus(body.coverFocus);
  if (focus) post.coverFocus = focus;

  if (typeof body.slug === 'string' && body.slug.trim()) {
    post.slug = await uniqueSlug(body.slug, post._id.toString());
  }

  if (body.status === 'published' || body.status === 'draft') {
    const wasPublished = post.status === 'published';
    post.status = body.status;
    if (body.status === 'published' && !wasPublished) {
      post.publishedAt = new Date();
    }
    if (body.status === 'draft') {
      post.publishedAt = null;
    }
  }

  await post.save();
  res.json({ post });
});

adminRouter.delete('/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
  const post = await Post.findByIdAndDelete(req.params.id);
  if (!post) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({ ok: true });
});

export { publicRouter as postsPublicRouter, adminRouter as postsAdminRouter };
