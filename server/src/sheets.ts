import { JWT } from 'google-auth-library';
import { config } from './config';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const BASE = 'https://sheets.googleapis.com/v4';

let client: JWT | null = null;
let cachedToken: { value: string; expiresAt: number } | null = null;

export class QuotaError extends Error {
  constructor(message: string, public retryAfterMs: number) {
    super(message);
    this.name = 'QuotaError';
  }
}

let quotaBlockedUntil = 0;

export function isQuotaBlocked(): boolean {
  return Date.now() < quotaBlockedUntil;
}

export function quotaRetryAfterMs(): number {
  return Math.max(quotaBlockedUntil - Date.now(), 0);
}

let readAttempts = 0;

export function consumeReadAttempts(): number {
  const n = readAttempts;
  readAttempts = 0;
  return n;
}

function parseRetryDelayMs(body: unknown): number | null {
  const details = (body as { error?: { details?: { retryInfo?: { retryDelay?: string } }[] } })?.error?.details;
  const raw = details?.find((d) => d?.retryInfo?.retryDelay)?.retryInfo?.retryDelay;
  if (!raw) return null;
  const m = /^([0-9.]+)s$/.exec(raw.trim());
  if (m) return Math.ceil(Number(m[1]) * 1000);
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.ceil(n * 1000) : null;
}

async function getClient(): Promise<JWT> {
  if (!client) {
    client = new JWT({
      email: config.serviceEmail,
      key: config.privateKey,
      scopes: SCOPES,
    });
  }
  return client;
}

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }
  const c = await getClient();
  await c.authorize();
  const value = c.credentials.access_token;
  if (!value) throw new Error('Failed to obtain Google API access token');
  cachedToken = { value, expiresAt: Date.now() + (Number(c.credentials.expiry_date) - Date.now() || 3_600_000) };
  if (!Number(c.credentials.expiry_date)) cachedToken.expiresAt = Date.now() + 3_600_000;
  return value;
}

export async function sheetsRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getToken();
  const method = (init?.method || 'GET').toUpperCase();
  if (method !== 'POST') readAttempts++;
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (body as { error?: { message?: string } })?.error?.message || res.statusText;
    if (res.status === 429) {
      const delayMs = parseRetryDelayMs(body) ?? 60_000;
      quotaBlockedUntil = Math.max(quotaBlockedUntil, Date.now() + delayMs);
      throw new QuotaError(`Google Sheets API 429: ${message}`, delayMs);
    }
    throw new Error(`Google Sheets API ${res.status}: ${message}`);
  }
  return body as T;
}

export interface SheetProperties {
  sheetId: number;
  title: string;
  index: number;
  hidden?: boolean;
  gridProperties?: { rowCount: number; columnCount: number };
}

export async function getSpreadsheetMeta(): Promise<{ sheets: SheetProperties[] }> {
  const data = await sheetsRequest<{ sheets?: { properties?: SheetProperties }[] }>(
    `/spreadsheets/${config.spreadsheetId}?fields=sheets.properties(sheetId,title,index,hidden,gridProperties(rowCount,columnCount))`,
  );
  return { sheets: (data.sheets || []).map((s) => s.properties).filter((p): p is SheetProperties => !!p) };
}

/** Quote a sheet title for use in A1 ranges. */
export function q(title: string): string {
  return `'${title.replace(/'/g, "''")}'`;
}

export async function batchGetValues(titles: string[]): Promise<Record<string, string[][]>> {
  if (titles.length === 0) return {};
  const params = titles.map((t) => `ranges=${encodeURIComponent(q(t))}`).join('&');
  const data = await sheetsRequest<{ valueRanges?: { values?: string[][] }[] }>(
    `/spreadsheets/${config.spreadsheetId}/values:batchGet?${params}&majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE`,
  );
  const out: Record<string, string[][]> = {};
  (data.valueRanges || []).forEach((vr, i) => {
    out[titles[i]] = (vr.values || []).map((row) => row.map(cellToString));
  });
  return out;
}

export async function getValues(title: string): Promise<string[][]> {
  const res = await batchGetValues([title]);
  return res[title] || [];
}

/** Dropdown options per column index, keyed by sheet title. */
export type ValidationOptions = Record<string, Record<number, string[]>>;

interface CellValidation {
  condition?: { type?: string; values?: { userEnteredValue?: string }[] };
}

/**
 * Read data-validation (dropdown) rules for the given sheets.
 * Options are collected from the first ~20 rows, which is where sheets
 * typically carry the rule for the whole column. Returns null on failure so
 * the caller can keep serving its previous cache.
 */
export async function fetchValidations(titles: string[]): Promise<ValidationOptions | null> {
  const out: ValidationOptions = {};
  if (titles.length === 0) return out;
  try {
    const params = titles
      .map((t) => `ranges=${encodeURIComponent(`${q(t)}!A1:ZZ20`)}`)
      .join('&');
    const data = await sheetsRequest<{
      sheets?: {
        properties?: { title?: string };
        data?: { rowData?: { values?: { dataValidation?: CellValidation }[] }[] }[];
      }[];
    }>(
      `/spreadsheets/${config.spreadsheetId}?includeGridData=true&${params}` +
        `&fields=sheets.properties(title),sheets.data.rowData.values.dataValidation`,
    );
    for (const sheet of data.sheets || []) {
      const title = sheet.properties?.title;
      if (!title) continue;
      const perCol: Record<number, string[]> = {};
      for (const block of sheet.data || []) {
        for (const row of block.rowData || []) {
          const values = row.values || [];
          for (let ci = 0; ci < values.length; ci++) {
            const dv = values[ci]?.dataValidation;
            if (!dv) continue;
            const rule = (dv as CellValidation & { rule?: CellValidation }).rule || dv;
            if (rule.condition?.type !== 'ONE_OF_LIST') continue;
            const list = (rule.condition.values || [])
              .map((v) => v.userEnteredValue)
              .filter((v): v is string => typeof v === 'string' && v !== '');
            if (list.length === 0) continue;
            const existing = perCol[ci] || (perCol[ci] = []);
            for (const opt of list) if (!existing.includes(opt)) existing.push(opt);
          }
        }
      }
      if (Object.keys(perCol).length > 0) out[title] = perCol;
    }
  } catch (err) {
    console.warn('[sync] validation fetch failed (keeping cached dropdowns):', err instanceof Error ? err.message : err);
    return null;
  }
  return out;
}

/** Read arbitrary A1 ranges (e.g. `'Sheet'!A5`); returns the first row of each range. */
export async function getCells(ranges: string[]): Promise<string[][]> {
  if (ranges.length === 0) return [];
  const params = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join('&');
  const data = await sheetsRequest<{ valueRanges?: { values?: string[][] }[] }>(
    `/spreadsheets/${config.spreadsheetId}/values:batchGet?${params}&majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE`,
  );
  return (data.valueRanges || []).map((vr) => ((vr.values || [])[0] || []).map(cellToString));
}

function cellToString(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

/** Retry transient Google API failures once (never quota errors). */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof QuotaError) throw err;
    await new Promise((r) => setTimeout(r, 700));
    return fn();
  }
}

export async function batchUpdateValues(
  title: string,
  updates: { a1: string; values: string[][] }[],
): Promise<void> {
  if (updates.length === 0) return;
  await withRetry(() =>
    sheetsRequest(`/spreadsheets/${config.spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        // USER_ENTERED parses numbers/dates the same way typing into the sheet does.
        valueInputOption: 'USER_ENTERED',
        includeValuesInResponse: false,
        data: updates.map((u) => ({ range: `${q(title)}!${u.a1}`, values: u.values })),
      }),
    }),
  );
}

export async function updateValues(title: string, a1: string, values: string[][]): Promise<void> {
  await batchUpdateValues(title, [{ a1, values }]);
}

export async function appendRow(title: string, cells: string[], columnCount: number): Promise<void> {
  const lastCol = columnLetter(Math.max(columnCount, cells.length) - 1);
  const range = `${q(title)}!A1:${lastCol}${config.maxRows}`;
  await withRetry(() =>
    sheetsRequest(
      `/spreadsheets/${config.spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      { method: 'POST', body: JSON.stringify({ values: [cells] }) },
    ),
  );
}

export async function deleteRow(title: string, sheetId: number, rowIndex1Based: number): Promise<void> {
  const start = rowIndex1Based - 1;
  await sheetsRequest(`/spreadsheets/${config.spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      requests: [
        {
          deleteDimension: {
            range: { sheetId, dimension: 'ROWS', startIndex: start, endIndex: start + 1 },
          },
        },
      ],
    }),
  });
}

export async function addSheet(title: string): Promise<number> {
  const data = await sheetsRequest<{ replies?: { addSheet?: { properties?: { sheetId: number } } }[] }>(
    `/spreadsheets/${config.spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title } } }] }),
    },
  );
  const id = data.replies?.[0]?.addSheet?.properties?.sheetId;
  if (typeof id !== 'number') throw new Error('Failed to create credentials tab');
  return id;
}

export async function setSheetHidden(sheetId: number, hidden: boolean): Promise<void> {
  await sheetsRequest(`/spreadsheets/${config.spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      requests: [{ updateSheetProperties: { properties: { sheetId, hidden }, fields: 'hidden' } }],
    }),
  });
}

/** 0 -> A, 25 -> Z, 26 -> AA */
export function columnLetter(index: number): string {
  let out = '';
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}
