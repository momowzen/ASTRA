import type { Column, TabMeta } from './types';

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

export function formatCp(value: string): string {
  const digits = value.replace(/[^0-9]/g, '');
  if (digits === '') return value.trim() === '' ? '' : value;
  return Number(digits).toLocaleString('en-US');
}

/** Numeric value of a formatted CP string (strips separators). NaN when empty. */
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
