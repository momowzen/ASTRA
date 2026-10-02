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
