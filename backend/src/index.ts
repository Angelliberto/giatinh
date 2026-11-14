import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { connectDb } from './config/db.js';
import { syncAdminPassword } from './services/adminPassword.js';
import authRoutes from './routes/auth.js';
import heroRoutes from './routes/hero.js';
import { postsPublicRouter, postsAdminRouter } from './routes/posts.js';
import { uploadRouter, assetsRouter } from './routes/upload.js';

async function main() {
  await connectDb();
  const passwordSync = await syncAdminPassword();
  if (passwordSync !== 'unchanged') {
    console.log(`Admin password ${passwordSync} from ADMIN_PASSWORD`);
  }

  const app = express();

  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'giatinh-api' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/hero', heroRoutes);
  app.use('/api/posts', postsPublicRouter);
  app.use('/api/admin/posts', postsAdminRouter);
  app.use('/api/upload', uploadRouter);
  app.use('/api/assets', assetsRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      console.error(err);
      res.status(500).json({ error: err.message || 'Server error' });
    }
  );

  app.listen(env.port, '0.0.0.0', () => {
    console.log(`API listening on 0.0.0.0:${env.port}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
