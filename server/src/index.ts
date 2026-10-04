import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { config } from './config';
import { api } from './routes';
import { initStore } from './store';
import { ensureCredentialsTab } from './credentials';

async function main(): Promise<void> {
  const app = express();
  app.set('trust proxy', 1);
  // 10mb: attendance OCR forwards base64 screenshots to the AI reader.
  app.use(express.json({ limit: '10mb' }));
  app.use(
    cors({
      origin(origin, cb) {
        // allow same-origin / curl requests and the configured browser origins
        if (!origin || config.corsOrigins.includes(origin)) return cb(null, true);
        cb(new Error('Origin not allowed'));
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    }),
  );

  app.use('/api', api);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err.message === 'Origin not allowed') {
      res.status(403).json({ error: 'Origin not allowed' });
      return;
    }
    console.error('[server] unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  await ensureCredentialsTab();
  await initStore();

  const server = app.listen(config.port, () => {
    console.log(`[server] listening on :${config.port} (env=${config.isProd ? 'production' : 'development'})`);
  });
  // Keep idle sockets alive longer than reverse proxies (Vite, Railway) do,
  // otherwise reused sockets are reset mid-request and show up as 502s.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
}

void main().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
