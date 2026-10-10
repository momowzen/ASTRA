import type { Column, TabData, TabMeta } from './types';

export function expandedGroups(meta: TabMeta): string[] {
  const row = meta.headers[0] || [];
  const out: string[] = [];
  let last = '';
  for (let i = 0; i < meta.columnCount; i++) {
    const v = (row[i] || '').trim();
    if (v) last = v;
    out.push(last);
  }
  return out;
}

export function buildColumns(meta: TabMeta): Column[] {
  const groups = expandedGroups(meta);
  const sub = meta.headerRows === 2 ? meta.headers[1] || [] : [];
  const cols: Column[] = [];
  for (let i = 0; i < meta.columnCount; i++) {
    if (meta.headerRows === 1) {
      const first = (meta.headers[0]?.[i] || '').trim();
      cols.push({ index: i, label: first || `Column ${i + 1}`, group: '' });
    } else {
      const g = groups[i] || '';
      const s = (sub[i] || '').trim();
      const label = s ? (g && i > 0 ? `${g} · ${s}` : s) : g || `Column ${i + 1}`;
      cols.push({ index: i, label, group: i === 0 ? '' : g });
    }
  }
  return cols;
}

const MARKS = new Set([
  'o',
  'v',
  'x',
  '✔',
  '✘',
  '✓',
  '√',
  '1',
  'y',
  'yes',
  'true',
  'ok',
  'done',
]);

export function isMark(value: string): boolean {
  return MARKS.has(value.trim().toLowerCase());
}

export function initials(name: string): string {
  const cleaned = name.replace(/^[^0-9A-Za-z가-힯ぁ-んァ-ヶ一-鿿]+/, '');
  const chars = [...cleaned].filter((c) => /[\p{L}\p{N}]/u.test(c));
  const first = (chars[0] || name[0] || '?').toUpperCase();
  const second = (chars[1] || '').toUpperCase();
  return (first + second) || '?';
}

export function clsx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

export function isCpLabel(label: string): boolean {
  return label.trim().toUpperCase() === 'CP';
}

export const MEMBER_READONLY = new Set(['CP', 'ROLE', 'STATUS']);

export const COMPLETION_EXCLUDED = new Set(['CP', 'ROLE', 'STATUS', 'NICKNAME', 'NOTES']);

export interface ProfileColumn {
  index: number;
  group: string;
  sub: string;
}

export function profileColumns(meta: TabMeta): ProfileColumn[] {
  const h0 = meta.headers[0] || [];
  const h1 = meta.headers[1] || [];
  const groups = expandedGroups(meta);
  const width = Math.max(h0.length, h1.length);
  const out: ProfileColumn[] = [];
  for (let i = 1; i < width; i++) {
    const first = String(h0[i] ?? '').trim();
    if (meta.headerRows === 2) {
      const g = String(groups[i] ?? '').trim();
      const s = String(h1[i] ?? '').trim();
      if ((g || s) && !COMPLETION_EXCLUDED.has((s || g).toUpperCase())) out.push({ index: i, group: g, sub: s });
    } else if (first && !COMPLETION_EXCLUDED.has(first.toUpperCase())) {
      out.push({ index: i, group: '', sub: first });
    }
  }
  return out;
}

export function memberCompletion(tabs: TabData[], ign: string): number {
  const want = ign.trim().toLowerCase();
  let total = 0;
  let filled = 0;
  for (const tab of tabs) {
    const cols = profileColumns(tab.meta);
    if (cols.length === 0) continue;
    const row = tab.rows.find((r) => (r.cells[0] || '').trim().toLowerCase() === want);
    for (const c of cols) {
      total += 1;
      if ((row?.cells[c.index] ?? '').trim()) filled += 1;
    }
  }
  return total > 0 ? Math.round((filled / total) * 100) : 0;
}

export function formatCp(value: string): string {
  const digits = value.replace(/[^0-9]/g, '');
  if (digits === '') return value.trim() === '' ? '' : value;
  return Number(digits).toLocaleString('en-US');
}

export function parseCpNumber(value: string | undefined): number {
  const digits = (value ?? '').replace(/[^0-9]/g, '');
  return digits === '' ? NaN : Number(digits);
}

const OPTION_PALETTE: Record<string, string> = {
  o: '#3ddc97',
  x: '#ff6b7a',
  '✔': '#3ddc97',
  '✘': '#ff6b7a',
  rare: '#58a6ff',
  epic: '#8b7cff',
  legend: '#f5b942',
  mythic: '#ff6b7a',
  'guild leader': '#f5b942',
  'co-leader': '#ff9d3d',
  officer: '#8b7cff',
  'guild support': '#58a6ff',
  senior: '#a5e34b',
  core: '#8b7cff',
  active: '#3ddc97',
  busy: '#f5b942',
  reserve: '#58a6ff',
  probation: '#ff9d3d',
  'pending transfer': '#ff79c6',
  inactive: '#ff6b7a',
};

export function optionColor(value: string): string | undefined {
  return OPTION_PALETTE[value.trim().toLowerCase()];
}

export function isDateLabel(label: string): boolean {
  return /\bdate\b/i.test(label.trim());
}

export function toIsoDate(raw: string | undefined): string {
  const v = (raw ?? '').trim();
  if (!v) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  if (/^\d+(\.\d+)?$/.test(v)) {
    const serial = Number(v);
    if (serial > 0) {
      const d = new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000);
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
  }
  const ymd = v.match(/^(\d{4})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{1,2})/);
  if (ymd) return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
  const mdy = v.match(/^(\d{1,2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{2,4})/);
  if (mdy) {
    const year = Number(mdy[3]) < 100 ? Number(mdy[3]) + 2000 : Number(mdy[3]);
    return `${year}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`;
  }
  const d = new Date(v.replace(/\./g, '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim());
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return '';
}
