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

export interface DataResponse {
  rev: string;
  ts: number;
  serverTime?: number;
  role: 'ADMIN' | 'MEMBER';
  username: string;
  ign: string;
  tabs: TabData[];
  roster?: RosterMember[];
  unchanged?: boolean;
}

export interface RosterMember {
  ign: string;
  role: string;
  guild: string;
  cp: string;
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

export const INTERNAL_TABS = ['BOSS ATTENDANCE', 'BOSS CONFIG'];

export const MEMBER_HIDDEN_TABS = ['BOSS ATTENDANCE', 'BOSS CONFIG', 'DISTRIBUTION HISTORY', 'CP HISTORY'];
