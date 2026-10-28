import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import { config } from './config';
import { api } from './routes';
import { initStore } from './store';
import { ensureCredentialsTab } from './credentials';
import { ensureSettingsTab } from './settings';
import { initActivityLog } from './activity';

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}

async function main(): Promise<void> {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '10mb' }));

  const allowedOrigins = new Set(config.corsOrigins.map(normalizeOrigin));
  const corsOptions: cors.CorsOptions = {
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      const normalized = normalizeOrigin(origin);
      if (allowedOrigins.has(normalized)) return cb(null, true);
      console.warn(`[cors] blocked origin: ${origin}`);
      cb(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'If-Range', 'Accept'],
    exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'],
    optionsSuccessStatus: 204,
    maxAge: 86400,
  };
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  app.use(
    '/api/avatars',
    express.static(path.resolve(process.cwd(), 'uploads', 'avatars'), {
      maxAge: '1y',
      immutable: true,
      fallthrough: true,
    }),
  );
  app.use('/api', api);

  if (!config.storageBucket) {
    console.info(
      '[avatars] GOOGLE_STORAGE_BUCKET is not set; avatars will be embedded as data: URLs in Google Sheets.',
    );
  }

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err.message === 'Origin not allowed') {
      res.status(403).json({ error: 'Origin not allowed' });
      return;
    }
    console.error('[server] unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  await ensureCredentialsTab();
  await ensureSettingsTab();
  await initActivityLog().catch((err) => {
    console.error('[activity] failed to initialize:', err instanceof Error ? err.message : err);
  });
  await initStore();

  const server = app.listen(config.port, () => {
    console.log(`[server] listening on :${config.port} (env=${config.isProd ? 'production' : 'development'})`);
  });
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
}

void main().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
