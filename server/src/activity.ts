import { randomBytes } from 'node:crypto';
import { config } from './config';
import * as sheets from './sheets';
import type { RowData, Snapshot, TabData } from './store';

export type ActivityRole = 'MEMBER' | 'ADMIN' | 'SHEET' | 'SYSTEM';
export type ActivitySource = 'profile' | 'admin' | 'sheet' | 'system';
export type ActivityAction = 'update' | 'row_added' | 'row_deleted';

export interface ActivityActor {
  actor: string;
  role: ActivityRole;
  source: ActivitySource;
}

export interface ActivityEntry {
  id: string;
  at: string;
  actor: string;
  role: ActivityRole;
  source: ActivitySource;
  tab: string;
  row: number;
  column: number;
  field: string;
  member: string;
  previous: string;
  next: string;
  action: ActivityAction;
}

const TITLE = config.activityTab;
const HEADER = [
  'ID',
  'TIMESTAMP',
  'ACTOR',
  'ROLE',
  'SOURCE',
  'TAB',
  'ROW',
  'COLUMN',
  'FIELD',
  'MEMBER',
  'PREVIOUS',
  'NEW',
  'ACTION',
];
const COLUMN_COUNT = HEADER.length;
const MAX_CELL_LEN = 4000;

let cache: ActivityEntry[] = [];
let loaded = false;
let initPromise: Promise<void> | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function newId(): string {
  return `${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`;
}

function clean(value: unknown): string {
  return String(value ?? '').slice(0, MAX_CELL_LEN);
}

function fieldLabel(tab: TabData, col: number): string {
  const top = String(tab.meta.headers[0]?.[col] ?? '').trim();
  const sub =
    tab.meta.headerRows > 1 ? String(tab.meta.headers[1]?.[col] ?? '').trim() : '';
  return sub || top || `Column ${col + 1}`;
}

function rowMember(row: RowData | undefined): string {
  return String(row?.cells[0] ?? '').trim();
}

export function makeCellEntry(
  tab: TabData,
  row: number,
  col: number,
  previous: string,
  next: string,
  actor: ActivityActor,
  action: ActivityAction = 'update',
): ActivityEntry {
  const rowData = tab.rows.find((r) => r.row === row);
  return {
    id: newId(),
    at: new Date().toISOString(),
    actor: actor.actor,
    role: actor.role,
    source: actor.source,
    tab: tab.meta.title,
    row,
    column: col + 1,
    field: fieldLabel(tab, col),
    member: rowMember(rowData),
    previous: clean(previous),
    next: clean(next),
    action,
  };
}

function toRow(e: ActivityEntry): string[] {
  return [
    e.id,
    e.at,
    e.actor,
    e.role,
    e.source,
    e.tab,
    String(e.row),
    String(e.column),
    e.field,
    e.member,
    e.previous,
    e.next,
    e.action,
  ];
}

function fromRow(row: string[]): ActivityEntry | null {
  const id = String(row[0] ?? '').trim();
  if (!id || id.toUpperCase() === 'ID') return null;
  return {
    id,
    at: String(row[1] ?? ''),
    actor: String(row[2] ?? ''),
    role: String(row[3] ?? 'SYSTEM') as ActivityRole,
    source: String(row[4] ?? 'system') as ActivitySource,
    tab: String(row[5] ?? ''),
    row: Number(row[6]) || 0,
    column: Number(row[7]) || 0,
    field: String(row[8] ?? ''),
    member: String(row[9] ?? ''),
    previous: String(row[10] ?? ''),
    next: String(row[11] ?? ''),
    action: String(row[12] ?? 'update') as ActivityAction,
  };
}

async function ensureActivityTab(): Promise<void> {
  const meta = await sheets.getSpreadsheetMeta();
  let tab = meta.sheets.find((s) => s.title === TITLE);
  if (!tab) {
    try {
      const sheetId = await sheets.addSheet(TITLE);
      await sheets.setSheetHidden(sheetId, true);
      console.log(`[activity] created hidden activity tab "${TITLE}"`);
      return;
    } catch (err) {
      console.warn(
        '[activity] addSheet failed, re-checking:',
        err instanceof Error ? err.message : err,
      );
      tab = (await sheets.getSpreadsheetMeta()).sheets.find((s) => s.title === TITLE);
      if (!tab) throw err;
    }
  }
  if (!tab.hidden) {
    await sheets.setSheetHidden(tab.sheetId, true);
    console.log(`[activity] hid activity tab "${TITLE}"`);
  }
}

async function load(): Promise<void> {
  await ensureActivityTab();
  const values = await sheets.getValues(TITLE);
  const hasHeader = String(values[0]?.[0] ?? '').trim().toUpperCase() === 'ID';
  if (!hasHeader) {
    await sheets.updateValues(TITLE, `A1:${sheets.columnLetter(COLUMN_COUNT - 1)}1`, [HEADER]);
  }
  cache = values
    .map((row) => fromRow(row))
    .filter((e): e is ActivityEntry => e !== null)
    .sort((a, b) => a.at.localeCompare(b.at));
  loaded = true;
}

export function initActivityLog(): Promise<void> {
  if (loaded) return Promise.resolve();
  if (!initPromise) {
    initPromise = load().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

export function logEntries(entries: ActivityEntry[]): void {
  if (entries.length === 0) return;
  if (!loaded) {
    void initActivityLog()
      .then(() => logEntries(entries))
      .catch((err) => {
        console.error('[activity] could not initialize:', err instanceof Error ? err.message : err);
      });
    return;
  }
  cache.push(...entries);
  const rows = entries.map(toRow);
  writeQueue = writeQueue
    .then(() => sheets.appendRows(TITLE, rows, COLUMN_COUNT, 'RAW'))
    .catch((err) => {
      console.error('[activity] persist failed:', err instanceof Error ? err.message : err);
    });
}

export interface ActivityCounts {
  profile: number;
  admin: number;
  sheet: number;
  system: number;
}

export async function listActivity(
  limit = 1000,
): Promise<{ entries: ActivityEntry[]; total: number; counts: ActivityCounts }> {
  await initActivityLog();
  const cap = Math.min(Math.max(limit, 1), 5000);
  const counts: ActivityCounts = { profile: 0, admin: 0, sheet: 0, system: 0 };
  for (const entry of cache) {
    if (entry.source === 'profile') counts.profile += 1;
    else if (entry.source === 'admin') counts.admin += 1;
    else if (entry.source === 'sheet') counts.sheet += 1;
    else counts.system += 1;
  }
  return { entries: cache.slice(-cap).reverse(), total: cache.length, counts };
}

function rowKey(row: RowData): string {
  const ign = String(row.cells[0] ?? '').trim().toLowerCase();
  return ign ? `ign:${ign}` : `row:${row.row}`;
}

function cellValue(row: RowData | undefined, col: number): string {
  return String(row?.cells[col] ?? '');
}

/**
 * Compare two snapshots and produce activity entries for edits made directly
 * in Google Sheets. App-originated writes update the local snapshot or mark
 * the tab as recently mutated, so they are intentionally excluded here.
 */
export function diffSnapshots(previous: Snapshot, next: Snapshot): ActivityEntry[] {
  const out: ActivityEntry[] = [];
  const before = new Map(previous.tabs.map((t) => [t.meta.title, t]));
  const skipped = new Set([config.activityTab.toLowerCase(), config.credentialsTab.toLowerCase()]);
  const actor: ActivityActor = { actor: 'Google Sheet', role: 'SHEET', source: 'sheet' };

  for (const nextTab of next.tabs) {
    const key = nextTab.meta.title.toLowerCase();
    if (skipped.has(key)) continue;
    const prevTab = before.get(nextTab.meta.title);
    if (!prevTab) continue;

    const prevRows = new Map(prevTab.rows.map((r) => [rowKey(r), r]));
    const nextRows = new Map(nextTab.rows.map((r) => [rowKey(r), r]));

    for (const [k, nextRow] of nextRows) {
      const prevRow = prevRows.get(k);
      if (!prevRow) {
        for (let col = 0; col < nextRow.cells.length; col++) {
          const value = String(nextRow.cells[col] ?? '');
          if (!value.trim()) continue;
          out.push(
            makeCellEntry(nextTab, nextRow.row, col, '', value, actor, 'row_added'),
          );
        }
        continue;
      }
      const max = Math.max(prevRow.cells.length, nextRow.cells.length);
      for (let col = 0; col < max; col++) {
        const prevValue = cellValue(prevRow, col);
        const nextValue = cellValue(nextRow, col);
        if (prevValue === nextValue) continue;
        out.push(
          makeCellEntry(nextTab, nextRow.row, col, prevValue, nextValue, actor),
        );
      }
    }

    for (const [k, prevRow] of prevRows) {
      if (nextRows.has(k)) continue;
      for (let col = 0; col < prevRow.cells.length; col++) {
        const value = String(prevRow.cells[col] ?? '');
        if (!value.trim()) continue;
        out.push(
          makeCellEntry(prevTab, prevRow.row, col, value, '', actor, 'row_deleted'),
        );
      }
    }
  }

  return out;
}

export function snapshotValue(tab: TabData, row: number, col: number): string {
  return String(tab.rows.find((r) => r.row === row)?.cells[col] ?? '');
}
