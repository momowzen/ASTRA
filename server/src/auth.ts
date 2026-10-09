import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config';

export interface Session {
  username: string;
  role: 'ADMIN' | 'MEMBER';
  ign: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session?: Session;
    }
  }
}

export function signToken(session: Session): string {
  return jwt.sign(session, config.jwtSecret, { expiresIn: config.tokenTtl } as jwt.SignOptions);
}

export function readToken(token: string): Session | null {
  try {
    const payload = jwt.verify(token, config.jwtSecret) as Session;
    if (!payload || !payload.username || !payload.role) return null;
    return { username: payload.username, role: payload.role, ign: payload.ign || payload.username };
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const session = token ? readToken(token) : null;
  if (!session) {
    res.status(401).json({ error: 'Not signed in' });
    return;
  }
  req.session = session;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.session || req.session.role !== 'ADMIN') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const nowMs = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || nowMs > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: nowMs + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= max;
}

setInterval(() => {
  const nowMs = Date.now();
  buckets.forEach((b, k) => {
    if (nowMs > b.resetAt) buckets.delete(k);
  });
}, 60_000).unref?.();
