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

function originList(value: string | undefined, fallbacks: string[]): string[] {
  const parsed = (value || '')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  return [...new Set([...fallbacks, ...parsed].map((s) => s.replace(/\/+$/, '')))];
}

export const config = {
  isProd,
  port: num(process.env.PORT, 3001),
  spreadsheetId: required('GOOGLE_SHEETS_ID'),
  serviceEmail: required('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
  privateKey: normalizePrivateKey(required('GOOGLE_PRIVATE_KEY')),
  googleProjectId: (process.env.GOOGLE_CLOUD_PROJECT || '').trim(),
  storageBucket: (process.env.GOOGLE_STORAGE_BUCKET || '').trim(),
  storagePublicBase: (process.env.GOOGLE_STORAGE_PUBLIC_BASE || '').trim(),
  jwtSecret,
  tokenTtl: process.env.TOKEN_TTL || '7d',
  corsOrigins: originList(process.env.CORS_ORIGINS, [
    'http://localhost:5173',
    'http://localhost:4173',
    'https://momowzen.github.io',
  ]),
  credentialsTab: process.env.CREDENTIALS_TAB || 'credentials',
  settingsTab: process.env.SETTINGS_TAB || 'SETTINGS',
  activityTab: process.env.ACTIVITY_LOG_TAB || 'ACTIVITY LOG',
  mediaFolderId: (process.env.MEDIA_DRIVE_FOLDER_ID || '1y82GuXV2-R5_X8FkSeu3EcieJGBFl5BZ').trim(),
  pollIntervalMs: num(process.env.SYNC_POLL_INTERVAL_MS, 5000),
  maxRows: num(process.env.SYNC_MAX_ROWS, 2000),
  adminUsername: 'admin',
  adminInitialPassword: 'admin',
  aiProviders: (process.env.AI_PROVIDER || 'gemini')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  groqApiKey: process.env.GROQ_API_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
};
