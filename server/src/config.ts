import 'dotenv/config';

function num(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}. Copy server/.env.example to server/.env and fill it in.`);
  }
  return value;
}

function normalizePrivateKey(raw: string): string {
  let key = raw.trim();
  while (key.length > 1 && /^(['"]).*\1$/s.test(key)) {
    key = key.slice(1, -1).trim();
  }
  return key
    .replace(/\\+r\\+n|\\+n|\\+r/g, '\n')
    .replace(/\r\n?/g, '\n')
    .trim();
}

const isProd = process.env.NODE_ENV === 'production';
const jwtSecret = required('JWT_SECRET');
if (isProd && jwtSecret.length < 24) {
  throw new Error('JWT_SECRET must be at least 24 characters in production');
}

export const config = {
  isProd,
  port: num(process.env.PORT, 3001),
  spreadsheetId: required('GOOGLE_SHEETS_ID'),
  serviceEmail: required('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
  privateKey: normalizePrivateKey(required('GOOGLE_PRIVATE_KEY')),
  jwtSecret,
  tokenTtl: process.env.TOKEN_TTL || '7d',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  credentialsTab: process.env.CREDENTIALS_TAB || 'credentials',
  pollIntervalMs: num(process.env.SYNC_POLL_INTERVAL_MS, 5000),
  maxRows: num(process.env.SYNC_MAX_ROWS, 2000),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  adminUsername: 'admin',
  adminInitialPassword: 'astra1221',
};
