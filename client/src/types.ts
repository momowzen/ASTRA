export interface TabMeta {
  title: string;
  sheetId: number;
  index: number;
  headerRows: 1 | 2;
  headers: string[][];
  columnCount: number;
  /** Dropdown options from sheet data validation, keyed by column index. */
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

export interface DataResponse {
  rev: string;
  ts: number;
  serverTime?: number;
  role: 'ADMIN' | 'MEMBER';
  username: string;
  ign: string;
  tabs: TabData[];
  unchanged?: boolean;
}

export interface Session {
  token: string;
  role: 'ADMIN' | 'MEMBER';
  username: string;
  ign: string;
}

export interface Column {
  index: number;
  label: string;
  group: string;
}

/** Database-only sheet tabs backing the boss attendance tracker. Never shown in any nav. */
export const INTERNAL_TABS = ['BOSS ATTENDANCE', 'BOSS CONFIG'];

/** Sheet tabs hidden from members but visible to admins. */
export const MEMBER_HIDDEN_TABS = ['BOSS ATTENDANCE', 'BOSS CONFIG', 'DISTRIBUTION HISTORY'];
