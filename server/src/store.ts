import { createHash } from 'node:crypto';
import * as sheets from './sheets';
import { config } from './config';

export interface TabMeta {
  title: string;
  sheetId: number;
  index: number;
  headerRows: 1 | 2;
  headers: string[][];
  columnCount: number;
  options?: Record<number, string[]>;
}

export interface RowData {
  row: number;
  cells: string[];
}

export interface TabData {
  meta: TabMeta;
  rows: RowData[];
}

export interface Snapshot {
  rev: string;
  ts: number;
  tabs: TabData[];
}

let snapshot: Snapshot | null = null;
let inFlight: Promise<void> | null = null;
let timer: NodeJS.Timeout | null = null;
export let lastError: string | null = null;

const RECENT_WRITE_TTL_MS = 8_000;
const recentWrites = new Map<string, { row: number; col: number; value: string; expires: number }>();

export function noteWrite(title: string, row: number, col: number, value: string): void {
  recentWrites.set(`${title}!${row}!${col}`, { row, col, value, expires: Date.now() + RECENT_WRITE_TTL_MS });
}

function applyRecentWrites(title: string, values: string[][]): void {
  const now = Date.now();
  for (const [key, w] of recentWrites) {
    if (!key.startsWith(`${title}!`)) continue;
    if (w.expires < now) {
      recentWrites.delete(key);
      continue;
    }
    const idx = w.row - 1;
    while (values.length <= idx) values.push([]);
    while (values[idx].length <= w.col) values[idx].push('');
    values[idx][w.col] = w.value;
  }
}

function detectHeaderRows(values: string[][]): 1 | 2 {
  if (values.length < 2) return 1;
  const second = values[1] || [];
  const secondCol = (second[0] || '').trim();
  const secondHasData = second.some((c) => c.trim() !== '');
  return secondCol === '' && secondHasData ? 2 : 1;
}

function buildTab(
  title: string,
  sheetId: number,
  index: number,
  columnCount: number,
  values: string[][],
  options?: Record<number, string[]>,
): TabData {
  const headerRows = detectHeaderRows(values);
  const headers = headerRows === 2 ? [values[0] || [], values[1] || []] : [values[0] || []];
  const rows: RowData[] = [];
  let maxLen = headers.reduce((m, h) => Math.max(m, h.length), 0);
  for (let i = headerRows; i < values.length; i++) {
    const cells = values[i] || [];
    if (cells.every((c) => c.trim() === '')) continue;
    maxLen = Math.max(maxLen, cells.length);
    rows.push({ row: i + 1, cells });
  }
  return {
    meta: {
      title,
      sheetId,
      index,
      headerRows,
      headers,
      columnCount: Math.min(Math.max(maxLen, 1), columnCount || maxLen),
      ...(options && Object.keys(options).length > 0 ? { options } : {}),
    },
    rows,
  };
}

const VALIDATION_TTL_MS = 60_000;
let validationCache: sheets.ValidationOptions | null = null;
let validationCacheKey = '';
let validationCacheAt = 0;

async function loadValidations(titles: string[]): Promise<sheets.ValidationOptions> {
  const key = titles.join('|');
  const stale =
    !validationCache ||
    key !== validationCacheKey ||
    Date.now() - validationCacheAt > VALIDATION_TTL_MS;
  if (stale) {
    const fresh = await sheets.fetchValidations(titles);
    if (fresh) validationCache = fresh;
    validationCacheKey = key;
    validationCacheAt = Date.now();
  }
  return validationCache ?? {};
}

const META_TTL_MS = 60_000;
let metaCache: { sheets: sheets.SheetProperties[] } | null = null;
let metaCacheAt = 0;

async function getMeta(): Promise<{ sheets: sheets.SheetProperties[] }> {
  if (!metaCache || Date.now() - metaCacheAt > META_TTL_MS) {
    metaCache = await sheets.getSpreadsheetMeta();
    metaCacheAt = Date.now();
  }
  return metaCache;
}

function computeRev(tabs: TabData[]): string {
  return createHash('sha1')
    .update(
      JSON.stringify(
        tabs.map((t) => [t.meta.title, t.meta.options ?? null, t.rows.map((r) => [r.row, r.cells])]),
      ),
    )
    .digest('hex')
    .slice(0, 16);
}

function intPoints(value: string | undefined): number {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * When a boss column is deleted directly in the sheet, Sheets shifts the
 * remaining columns but leaves TOTAL POINTS untouched. Detect the removed
 * boss columns (by diffing the header row) and subtract their recorded points
 * from the affected rows' TOTAL POINTS. Mutates `next` and returns the writes.
 */
function reconcileAttendance(prev: Snapshot, next: Snapshot): { a1: string; values: string[][] }[] {
  const prevTab = prev.tabs.find((t) => t.meta.title.toUpperCase() === 'BOSS ATTENDANCE');
  const nextTab = next.tabs.find((t) => t.meta.title.toUpperCase() === 'BOSS ATTENDANCE');
  if (!prevTab || !nextTab) return [];

  const prevHeaders = (prevTab.meta.headers[0] || []).map((h) => String(h || '').trim());
  const nextHeaders = (nextTab.meta.headers[0] || []).map((h) => String(h || '').trim());

  const remaining = new Map<string, number>();
  for (let i = 2; i < nextHeaders.length; i++) {
    const key = nextHeaders[i].toLowerCase();
    if (key) remaining.set(key, (remaining.get(key) ?? 0) + 1);
  }

  const deletedIdx: number[] = [];
  for (let i = 2; i < prevHeaders.length; i++) {
    const key = prevHeaders[i].toLowerCase();
    if (!key) continue;
    const c = remaining.get(key) ?? 0;
    if (c > 0) remaining.set(key, c - 1);
    else deletedIdx.push(i);
  }
  if (deletedIdx.length === 0) return [];

  const deduction = new Map<string, number>();
  for (const r of prevTab.rows) {
    const ign = (r.cells[0] || '').trim().toLowerCase();
    if (!ign) continue;
    let d = 0;
    for (const i of deletedIdx) d += intPoints(r.cells[i]);
    if (d > 0) deduction.set(ign, (deduction.get(ign) ?? 0) + d);
  }
  if (deduction.size === 0) return [];

  const writes: { a1: string; values: string[][] }[] = [];
  for (const r of nextTab.rows) {
    const ign = (r.cells[0] || '').trim().toLowerCase();
    const d = deduction.get(ign) ?? 0;
    if (d === 0) continue;
    const adjusted = intPoints(r.cells[1]) - d;
    while (r.cells.length <= 1) r.cells.push('');
    r.cells[1] = String(adjusted);
    writes.push({ a1: `B${r.row}`, values: [[String(adjusted)]] });
  }
  return writes;
}

async function load(): Promise<Snapshot> {
  const meta = await getMeta();
  const visible = meta.sheets
    .filter((s) => (!s.hidden || s.title === config.settingsTab) && s.title !== config.credentialsTab)
    .sort((a, b) => a.index - b.index);
  const titles = visible.map((s) => s.title);
  const values = await sheets.batchGetValues(titles);
  for (const title of titles) {
    if (!values[title]) values[title] = [];
    applyRecentWrites(title, values[title]);
  }
  const validations = await loadValidations(titles);
  const tabs = visible.map((s, i) =>
    buildTab(
      s.title,
      s.sheetId,
      i,
      s.gridProperties?.columnCount ?? 100,
      values[s.title] || [],
      validations[s.title],
    ),
  );
  const rev = computeRev(tabs);
  return { rev, ts: Date.now(), tabs };
}

export function applyLocalWrite(title: string, row: number, col: number, value: string): void {
  if (!snapshot) return;
  const tab = snapshot.tabs.find((t) => t.meta.title === title);
  if (!tab) return;
  const target = tab.rows.find((r) => r.row === row);
  if (!target) return;
  while (target.cells.length <= col) target.cells.push('');
  target.cells[col] = value;
  snapshot = { rev: computeRev(snapshot.tabs), ts: Date.now(), tabs: snapshot.tabs };
}

const REFRESH_MIN_GAP_MS = 1500;
let lastLoadAt = 0;
let trailingTimer: NodeJS.Timeout | null = null;
let quotaLogged = false;

async function doRefresh(): Promise<void> {
  if (sheets.isQuotaBlocked()) {
    if (!quotaLogged) {
      quotaLogged = true;
      console.error(
        `[quota] read limit hit, backing off ${Math.max(Math.round(sheets.quotaRetryAfterMs() / 1000), 1)}s`,
      );
    }
    return;
  }
  try {
    const next = await load();
    if (snapshot) {
      try {
        const writes = reconcileAttendance(snapshot, next);
        if (writes.length > 0) {
          await sheets.batchUpdateValues('BOSS ATTENDANCE', writes);
          next.rev = computeRev(next.tabs);
          console.log(`[sync] adjusted TOTAL POINTS after boss column deletion (${writes.length} rows)`);
        }
      } catch (err) {
        console.error('[sync] attendance reconcile failed:', err instanceof Error ? err.message : err);
      }
    }
    const changed = !snapshot || snapshot.rev !== next.rev;
    snapshot = next;
    lastError = null;
    if (quotaLogged) {
      quotaLogged = false;
      console.log('[quota] read quota recovered');
    }
    if (changed) {
      console.log(`[sync] sheet snapshot rev=${next.rev} tabs=${next.tabs.length}`);
    }
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err);
    if (err instanceof sheets.QuotaError) {
      if (!quotaLogged) {
        quotaLogged = true;
        console.error(
          `[quota] read limit hit, backing off ${Math.max(Math.round(err.retryAfterMs / 1000), 1)}s`,
        );
      }
    } else {
      console.error('[sync] refresh failed:', lastError);
    }
  }
}

function refresh(): Promise<void> {
  if (inFlight) return inFlight;
  const wait = lastLoadAt + REFRESH_MIN_GAP_MS - Date.now();
  if (wait > 0) {
    if (!trailingTimer) {
      trailingTimer = setTimeout(() => {
        trailingTimer = null;
        void refresh();
      }, wait);
      trailingTimer.unref?.();
    }
    return Promise.resolve();
  }
  lastLoadAt = Date.now();
  inFlight = doRefresh().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

let refreshTimer: NodeJS.Timeout | null = null;
export function scheduleRefresh(): void {
  if (refreshTimer) return;
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    void refresh();
  }, 1500);
  refreshTimer.unref?.();
}

export async function initStore(): Promise<void> {
  await refresh();
  timer = setInterval(() => void refresh(), config.pollIntervalMs);
  timer.unref?.();
  const readsTimer = setInterval(() => {
    const reads = sheets.consumeReadAttempts();
    if (reads > 0) console.log(`[sync] reads last 60s: ${reads}`);
  }, 60_000);
  readsTimer.unref?.();
}

export function getSnapshot(): Snapshot {
  if (!snapshot) throw new Error('Data not loaded yet');
  return snapshot;
}

export function getTab(title: string): TabData | undefined {
  return getSnapshot().tabs.find((t) => t.meta.title === title);
}

export function memberEditEnabled(): boolean {
  const tab = snapshot?.tabs.find(
    (t) => t.meta.title.toUpperCase() === config.settingsTab.toUpperCase(),
  );
  if (!tab) return true;
  for (const r of tab.rows) {
    if ((r.cells[0] || '').trim().toLowerCase() === 'member_edit') {
      return (r.cells[1] || '').trim().toLowerCase() !== 'off';
    }
  }
  return true;
}

export function findIgn(name: string): string | null {
  const want = name.trim().toLowerCase();
  if (!want) return null;
  const tabs = getSnapshot().tabs;
  const roster =
    tabs.find((t) => t.meta.title.toUpperCase() === 'BASIC INFORMATION') ||
    tabs.find((t) => (t.meta.headers[0]?.[0] || '').trim().toUpperCase() === 'IGN');
  if (!roster) return null;
  for (const row of roster.rows) {
    const ign = (row.cells[0] || '').trim();
    if (ign && ign.toLowerCase() === want) return ign;
  }
  return null;
}

export function rowBelongsTo(tab: TabData, rowNumber: number, ign: string): boolean {
  const row = tab.rows.find((r) => r.row === rowNumber);
  if (!row) return false;
  return (row.cells[0] || '').trim().toLowerCase() === ign.trim().toLowerCase();
}
