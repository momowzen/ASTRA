import { createHash } from 'node:crypto';
import * as sheets from './sheets';
import { config } from './config';
import { diffSnapshots, logEntries } from './activity';

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

const TAB_MUTATION_TTL_MS = 30_000;
const recentTabMutations = new Map<string, number>();

export function noteWrite(title: string, row: number, col: number, value: string): void {
  recentWrites.set(`${title}!${row}!${col}`, { row, col, value, expires: Date.now() + RECENT_WRITE_TTL_MS });
}

/**
 * Mark app-originated writes so the next sheet poll does not report them as
 * direct Google Sheet edits in the activity log.
 */
export function noteTabMutation(title: string): void {
  recentTabMutations.set(title.toLowerCase(), Date.now() + TAB_MUTATION_TTL_MS);
}

function tabRecentlyMutated(title: string): boolean {
  const until = recentTabMutations.get(title.toLowerCase());
  if (!until) return false;
  if (until < Date.now()) {
    recentTabMutations.delete(title.toLowerCase());
    return false;
  }
  return true;
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

export function intPoints(value: string | undefined): number {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * TOTAL POINTS is derived: it always equals the sum of the boss columns
 * (cols >= 2). Recompute it on every sync and rewrite any row whose stored
 * total drifted (e.g. after a boss column is added, edited, or deleted).
 * Mutates `next` and returns the writes.
 */
function recomputeAttendance(next: Snapshot): { a1: string; values: string[][] }[] {
  const tab = next.tabs.find((t) => t.meta.title.toUpperCase() === 'BOSS ATTENDANCE');
  if (!tab) return [];
  const writes: { a1: string; values: string[][] }[] = [];
  for (const r of tab.rows) {
    let sum = 0;
    for (let i = 2; i < r.cells.length; i++) sum += intPoints(r.cells[i]);
    if (intPoints(r.cells[1]) === sum) continue;
    while (r.cells.length <= 1) r.cells.push('');
    r.cells[1] = String(sum);
    writes.push({ a1: `B${r.row}`, values: [[String(sum)]] });
  }
  return writes;
}

function parseRatio(value: string | undefined): number | null {
  const s = String(value ?? '').trim().replace(/%$/, '');
  if (!s) return null;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * WAR ATTENDANCE is derived like BOSS ATTENDANCE: TOTAL POINTS is the sum of
 * the boss columns and ATTENDANCE RATIO is TOTAL / instances. Recompute both
 * on every sync and rewrite any row that drifted (e.g. after a boss column is
 * added, edited, or deleted directly in the sheet). Mutates `next`.
 */
function recomputeWar(next: Snapshot): { a1: string; values: string[][] }[] {
  const tab = next.tabs.find((t) => t.meta.title.toUpperCase() === 'WAR ATTENDANCE');
  if (!tab) return [];
  const norm = (s: string) => String(s ?? '').trim().toUpperCase();
  const headers = tab.meta.headers[0] || [];
  const totalIdx = headers.findIndex((h) => norm(h) === 'TOTAL POINTS' || norm(h) === 'TOTALPOINTS');
  const ratioIdx = headers.findIndex((h) => norm(h) === 'ATTENDANCE RATIO' || norm(h) === 'ATTENDANCERATIO');
  if (totalIdx < 0 || ratioIdx < 0) return [];
  const bossCols: number[] = [];
  for (let i = 0; i < tab.meta.columnCount; i++) {
    const h = norm(headers[i]);
    if (!h || h === 'IGN' || h === 'TOTAL POINTS' || h === 'TOTALPOINTS' || h === 'ATTENDANCE RATIO' || h === 'ATTENDANCERATIO') {
      continue;
    }
    bossCols.push(i);
  }
  // points per boss (from WAR BOSS CONFIG), used to derive the max an IGN can
  // earn this cycle so the ratio can be TOTAL POINTS / maxPoints.
  const cfgTab = next.tabs.find((t) => t.meta.title.toUpperCase() === 'WAR BOSS CONFIG');
  const cfg = new Map<string, number>();
  for (const r of cfgTab?.rows ?? []) {
    const name = (r.cells[0] || '').trim().toLowerCase();
    if (name) {
      const p = intPoints(r.cells[1]);
      cfg.set(name, p > 0 ? p : 1);
    }
  }
  let maxPoints = 0;
  for (const ci of bossCols) maxPoints += cfg.get(norm(headers[ci]).toLowerCase()) ?? 1;

  const writes: { a1: string; values: string[][] }[] = [];
  for (const r of tab.rows) {
    let total = 0;
    for (const ci of bossCols) total += intPoints(r.cells[ci]);
    const ratioPct = maxPoints > 0 ? (total / maxPoints) * 100 : 0;
    const storedTotal = intPoints(r.cells[totalIdx]);
    const storedRatio = parseRatio(r.cells[ratioIdx]);
    const totalDrift = storedTotal !== total;
    const ratioDrift = Math.abs((storedRatio ?? 0) - ratioPct) > 0.05;
    if (!totalDrift && !ratioDrift) continue;
    while (r.cells.length <= Math.max(totalIdx, ratioIdx)) r.cells.push('');
    if (totalDrift) {
      r.cells[totalIdx] = String(total);
      writes.push({ a1: `${sheets.columnLetter(totalIdx)}${r.row}`, values: [[String(total)]] });
    }
    if (ratioDrift) {
      const ratio = `${ratioPct.toFixed(1)}%`;
      r.cells[ratioIdx] = ratio;
      writes.push({ a1: `${sheets.columnLetter(ratioIdx)}${r.row}`, values: [[ratio]] });
    }
  }
  return writes;
}

async function load(): Promise<Snapshot> {
  const meta = await getMeta();
  const visible = meta.sheets
    .filter(
      (s) =>
        (!s.hidden || s.title === config.settingsTab) &&
        s.title !== config.credentialsTab &&
        s.title !== config.activityTab,
    )
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
    const previous = snapshot;
    const next = await load();
    if (previous && previous.rev !== next.rev) {
      const direct = diffSnapshots(previous, next).filter((e) => !tabRecentlyMutated(e.tab));
      if (direct.length > 0) {
        logEntries(direct);
        console.log(`[activity] recorded ${direct.length} direct sheet change(s)`);
      }
    }
    try {
      const writes = recomputeAttendance(next);
      if (writes.length > 0) {
        await sheets.batchUpdateValues('BOSS ATTENDANCE', writes);
        next.rev = computeRev(next.tabs);
        console.log(`[sync] recomputed TOTAL POINTS (${writes.length} rows)`);
      }
    } catch (err) {
      console.error('[sync] attendance recompute failed:', err instanceof Error ? err.message : err);
    }
    try {
      const writes = recomputeWar(next);
      if (writes.length > 0) {
        await sheets.batchUpdateValues('WAR ATTENDANCE', writes);
        next.rev = computeRev(next.tabs);
        console.log(`[sync] recomputed WAR total points / ratio (${writes.length} cells)`);
      }
    } catch (err) {
      console.error('[sync] war recompute failed:', err instanceof Error ? err.message : err);
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
