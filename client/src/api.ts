import type { DataResponse, Session } from './types';

const TOKEN_KEY = 'astra.token';
const SESSION_KEY = 'astra.session';
const API_SESSION_KEY = 'astra.apiOverride';

declare global {
  interface Window {
    ASTRA_CONFIG?: { apiBase?: string };
  }
}

export function apiBase(): string {
  const fromQuery = new URLSearchParams(window.location.search).get('api');
  if (fromQuery) {
    sessionStorage.setItem(API_SESSION_KEY, fromQuery);
    return fromQuery.replace(/\/+$/, '');
  }
  const override = sessionStorage.getItem(API_SESSION_KEY);
  if (override) return override.replace(/\/+$/, '');
  // In dev, Vite proxies /api to the local backend — ignore config.js so a
  // deployed API URL never hijacks local development.
  if (!import.meta.env.DEV) {
    const cfg = window.ASTRA_CONFIG?.apiBase?.trim();
    if (cfg) return cfg.replace(/\/+$/, '');
  }
  return '/api';
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getSession(): Session | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function setSession(session: Session): void {
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(apiBase() + path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers || {}),
      },
    });
  } catch {
    const base = apiBase();
    if (base === '/api' && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      throw new ApiError(
        'API address is not configured. Set apiBase in config.js to your backend URL (e.g. https://your-app.up.railway.app/api).',
        0,
      );
    }
    throw new ApiError('Cannot reach the server. Check your connection and API address.', 0);
  }

  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (res.status === 401) {
    // A 401 on an authenticated request means the stored session is dead;
    // a 401 without a token (e.g. a login attempt) means bad credentials, so
    // surface the server's actual reason instead of "session expired".
    if (token) {
      clearSession();
      window.dispatchEvent(new Event('astra:unauthorized'));
      throw new ApiError('Your session expired. Please sign in again.', 401);
    }
    const message =
      body && typeof body === 'object' && 'error' in body
        ? String((body as { error: unknown }).error)
        : 'Invalid username or password';
    throw new ApiError(message, 401);
  }

  if (!res.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body
        ? String((body as { error: unknown }).error)
        : `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }

  return body as T;
}

export async function login(username: string, password: string): Promise<Session> {
  // Drop any stale token so the login request is clean and a 401 reports the
  // real reason (bad credentials) rather than "session expired".
  clearSession();
  const res = await request<{ token: string; role: Session['role']; username: string; ign: string }>(
    '/auth/login',
    { method: 'POST', body: JSON.stringify({ username, password }) },
  );
  const session: Session = {
    token: res.token,
    role: res.role,
    username: res.username,
    ign: res.ign,
  };
  setSession(session);
  return session;
}

export async function fetchData(lastRev?: string): Promise<DataResponse> {
  const query = lastRev ? `?rev=${encodeURIComponent(lastRev)}` : '';
  return request<DataResponse>(`/data${query}`);
}

export interface CellUpdate {
  row: number;
  col: number;
  value: string;
}

const FLUSH_DELAY_MS = 1000;
const FLUSH_MAX_CELLS = 150;

interface WriteBatch {
  cells: Map<string, CellUpdate>;
  waiters: { resolve: () => void; reject: (err: unknown) => void }[];
  timer: ReturnType<typeof setTimeout> | null;
}

const writeBatches = new Map<string, WriteBatch>();
let flushChain: Promise<void> = Promise.resolve();

function flushWriteBatch(tabTitle: string, keepalive = false): void {
  const batch = writeBatches.get(tabTitle);
  if (!batch) return;
  writeBatches.delete(tabTitle);
  if (batch.timer) clearTimeout(batch.timer);
  const updates = [...batch.cells.values()];
  const settle = () =>
    request('/tabs/' + encodeURIComponent(tabTitle) + '/values', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
      ...(keepalive ? { keepalive: true } : {}),
    });
  const task = flushChain.then(settle, settle);
  flushChain = task.then(
    () => undefined,
    () => undefined,
  );
  task.then(
    () => {
      for (const w of batch.waiters) w.resolve();
    },
    (err) => {
      for (const w of batch.waiters) w.reject(err);
    },
  );
}

function flushAllWrites(keepalive: boolean): void {
  for (const tabTitle of [...writeBatches.keys()]) flushWriteBatch(tabTitle, keepalive);
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => flushAllWrites(true));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushAllWrites(true);
  });
}

export function saveCells(
  tabTitle: string,
  updates: { row: number; col: number; value: string }[],
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let batch = writeBatches.get(tabTitle);
    if (!batch) {
      batch = { cells: new Map(), waiters: [], timer: null };
      writeBatches.set(tabTitle, batch);
    }
    for (const u of updates) batch.cells.set(`${u.row}:${u.col}`, u);
    batch.waiters.push({ resolve, reject });
    if (batch.cells.size >= FLUSH_MAX_CELLS) {
      flushWriteBatch(tabTitle);
      return;
    }
    if (batch.timer) clearTimeout(batch.timer);
    batch.timer = setTimeout(() => {
      batch!.timer = null;
      flushWriteBatch(tabTitle);
    }, FLUSH_DELAY_MS);
  });
}

export async function addRow(tabTitle: string, cells: string[]): Promise<void> {
  await request('/tabs/' + encodeURIComponent(tabTitle) + '/rows', {
    method: 'POST',
    body: JSON.stringify({ cells }),
  });
}

export async function deleteRow(tabTitle: string, row: number): Promise<void> {
  await request(`/tabs/${encodeURIComponent(tabTitle)}/rows?row=${row}`, { method: 'DELETE' });
}

export async function seedBossConfig(): Promise<{ ok: boolean; seeded: boolean; count?: number }> {
  return request('/boss/config/seed', { method: 'POST' });
}

export interface DistributionBand {
  ign: string;
  points: number;
  diamonds: number;
}

export interface DistributionResult {
  ok: boolean;
  date: string;
  pool: number;
  totalBandPoints: number;
  band: DistributionBand[];
}

export async function distribute(pool: number): Promise<DistributionResult> {
  return request('/boss/distribute', {
    method: 'POST',
    body: JSON.stringify({ pool }),
  });
}

export interface CpItem {
  ign: string;
  cp: string;
  matched: boolean;
}

export async function updateCp(items: { ign: string; cp: string }[]): Promise<{ ok: boolean; date: string; count: number }> {
  return request('/cp/update', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await request('/auth/password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function changeUsername(currentPassword: string, newUsername: string): Promise<Session> {
  const res = await request<{ token: string; role: Session['role']; username: string; ign: string }>(
    '/auth/username',
    { method: 'POST', body: JSON.stringify({ currentPassword, username: newUsername }) },
  );
  const session: Session = { token: res.token, role: res.role, username: res.username, ign: res.ign };
  setSession(session);
  return session;
}
