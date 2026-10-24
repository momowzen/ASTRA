import * as sheets from './sheets';
import { applyLocalWrite, getTab, noteWrite, scheduleRefresh } from './store';
import type { TabData } from './store';

const AVATAR_LABELS = new Set([
  'PROFILE PICTURE',
  'PROFILE PICTURES',
  'PROFILE PIC',
  'AVATAR',
  'AVATAR URL',
  'PFP',
]);

export function isAvatarLabel(label: string): boolean {
  return AVATAR_LABELS.has(label.trim().toUpperCase());
}

export function findAvatarColumn(tab: TabData): number {
  const headers = tab.meta.headers[0] || [];
  for (let i = 0; i < headers.length; i++) {
    if (isAvatarLabel(String(headers[i] ?? ''))) return i;
  }
  return -1;
}

function findAvatarRow(tab: TabData, ign: string) {
  const want = ign.trim().toLowerCase();
  if (!want) return undefined;
  return tab.rows.find((r) => (r.cells[0] ?? '').trim().toLowerCase() === want);
}

async function ensureAvatarColumn(tab: TabData): Promise<number> {
  const existing = findAvatarColumn(tab);
  if (existing >= 0) return existing;

  const headers = tab.meta.headers[0] || [];
  let last = 0;
  for (let i = 1; i < headers.length; i++) {
    if (String(headers[i] ?? '').trim()) last = i;
  }
  const index = Math.max(last + 1, 1);
  await sheets.updateValuesRaw('BASIC INFORMATION', `${sheets.columnLetter(index)}1`, [['PROFILE PICTURE']]);
  tab.meta.headers[0] = tab.meta.headers[0] || [];
  tab.meta.headers[0][index] = 'PROFILE PICTURE';
  tab.meta.columnCount = Math.max(tab.meta.columnCount, index + 1);
  return index;
}

export async function setAvatar(
  ign: string,
  url: string,
): Promise<{ previous: string; row: number; col: number } | null> {
  const tab = getTab('BASIC INFORMATION');
  if (!tab) return null;
  const row = findAvatarRow(tab, ign);
  if (!row) return null;

  const col = await ensureAvatarColumn(tab);
  const previous = String(row.cells[col] ?? '').trim();
  await sheets.updateValuesRaw('BASIC INFORMATION', `${sheets.columnLetter(col)}${row.row}`, [[url]]);
  noteWrite('BASIC INFORMATION', row.row, col, url);
  applyLocalWrite('BASIC INFORMATION', row.row, col, url);
  scheduleRefresh();
  return { previous, row: row.row, col };
}

export async function clearAvatar(
  ign: string,
): Promise<{ previous: string; row: number; col: number } | null> {
  const tab = getTab('BASIC INFORMATION');
  if (!tab) return null;
  const row = findAvatarRow(tab, ign);
  if (!row) return null;
  const col = findAvatarColumn(tab);
  if (col < 0) return { previous: '', row: row.row, col: -1 };

  const previous = String(row.cells[col] ?? '').trim();
  if (!previous) return { previous: '', row: row.row, col };
  await sheets.updateValuesRaw('BASIC INFORMATION', `${sheets.columnLetter(col)}${row.row}`, [['']]);
  noteWrite('BASIC INFORMATION', row.row, col, '');
  applyLocalWrite('BASIC INFORMATION', row.row, col, '');
  scheduleRefresh();
  return { previous, row: row.row, col };
}

export function avatarMap(): Record<string, string> {
  const tab = getTab('BASIC INFORMATION');
  if (!tab) return {};
  const col = findAvatarColumn(tab);
  if (col < 0) return {};

  const out: Record<string, string> = {};
  for (const row of tab.rows) {
    const ign = String(row.cells[0] ?? '').trim();
    const url = String(row.cells[col] ?? '').trim();
    if (ign && /^https?:\/\//i.test(url)) out[ign.toLowerCase()] = url;
  }
  return out;
}
