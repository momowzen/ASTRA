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

function detectHeaderRows(values: string[][]): 1 | 2 {
  if (values.length < 2) return 1;
  const first = values[0] || [];
  const second = values[1] || [];
  const firstCol = (first[0] || '').trim();
  const secondCol = (second[0] || '').trim();
  const secondHasData = second.some((c) => c.trim() !== '');
  return secondCol === '' && firstCol !== '' && secondHasData ? 2 : 1;
}

function buildTab(title: string, sheetId: number, index: number, columnCount: number, values: string[][]): TabData {
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
    },
    rows,
  };
}

async function load(): Promise<Snapshot> {
  const meta = await sheets.getSpreadsheetMeta();
  const visible = meta.sheets
    .filter((s) => !s.hidden && s.title !== config.credentialsTab)
    .sort((a, b) => a.index - b.index);
  const titles = visible.map((s) => s.title);
  const values = await sheets.batchGetValues(titles);
  const tabs = visible.map((s, i) =>
    buildTab(s.title, s.sheetId, i, s.gridProperties?.columnCount ?? 100, values[s.title] || []),
  );
  const rev = createHash('sha1')
    .update(JSON.stringify(tabs.map((t) => [t.meta.title, t.rows.map((r) => [r.row, r.cells])])))
    .digest('hex')
    .slice(0, 16);
  return { rev, ts: Date.now(), tabs };
}

async function doRefresh(): Promise<void> {
  try {
    const next = await load();
    const changed = !snapshot || snapshot.rev !== next.rev;
    snapshot = next;
    lastError = null;
    if (changed) {
      console.log(`[sync] sheet snapshot rev=${next.rev} tabs=${next.tabs.length}`);
    }
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err);
    console.error('[sync] refresh failed:', lastError);
  }
}

function refresh(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = doRefresh().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Debounced immediate refresh used after writes (Google can serve stale reads for ~1-2s). */
let refreshScheduled = false;
export function scheduleRefresh(): void {
  if (refreshScheduled) return;
  refreshScheduled = true;
  const delays = [400, 1500, 3500];
  delays.forEach((delay, i) => {
    const t = setTimeout(() => {
      void refresh();
      if (i === delays.length - 1) refreshScheduled = false;
    }, delay);
      t.unref?.();
  });
}

export async function initStore(): Promise<void> {
  await refresh();
  timer = setInterval(() => void refresh(), config.pollIntervalMs);
  timer.unref?.();
}

export function getSnapshot(): Snapshot {
  if (!snapshot) throw new Error('Data not loaded yet');
  return snapshot;
}

export function getTab(title: string): TabData | undefined {
  return getSnapshot().tabs.find((t) => t.meta.title === title);
}

/** Canonical IGN for a login name, looked up in the IGN column of the roster tab. */
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
