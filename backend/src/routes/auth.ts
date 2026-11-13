import { Router, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { requireAuth, signToken, type AuthedRequest } from '../middleware/auth.js';

const router = Router();

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

router.post('/login', async (req, res: Response) => {
  const { password } = req.body as { password?: string };
  if (!password) {
    res.status(400).json({ error: 'Password required' });
    return;
  }

  const user = await User.findOne();
  if (!user) {
    res.status(503).json({ error: 'Admin not seeded. Run npm run seed.' });
    return;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: 'Invalid passphrase' });
    return;
  }

  const token = signToken(user._id.toString());
  res.cookie('token', token, COOKIE_OPTS);
  res.json({ ok: true, token, user: { id: user._id, email: user.email } });
});

router.post('/logout', (_req, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req: AuthedRequest, res: Response) => {
  const user = await User.findById(req.user!.userId).select('email createdAt');
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  res.json({ user: { id: user._id, email: user.email } });
});

export default router;
