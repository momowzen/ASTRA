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
  leaderboard?: { ign: string; points: number; perfect?: number }[];
  avatars?: Record<string, string>;
  memberEdit?: boolean;
  sheetUrl?: string;
  unchanged?: boolean;
}

export interface RosterMember {
  ign: string;
  role: string;
  status: string;
  guild: string;
  cp: string;
  country?: string;
  nickname?: string;
  joined?: string;
  notes?: string;
  mainWeapon?: string;
}

export interface Session {
  token: string;
  role: 'ADMIN' | 'MEMBER';
  username: string;
  ign: string;
}

export type ActivitySource = 'profile' | 'admin' | 'sheet' | 'system';
export type ActivityAction = 'update' | 'row_added' | 'row_deleted';

export interface ActivityEntry {
  id: string;
  at: string;
  actor: string;
  role: 'MEMBER' | 'ADMIN' | 'SHEET' | 'SYSTEM';
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

export interface ActivityResponse {
  entries: ActivityEntry[];
  total: number;
  counts: {
    profile: number;
    admin: number;
    sheet: number;
    system: number;
  };
}

export interface Column {
  index: number;
  label: string;
  group: string;
}

export const INTERNAL_TABS = ['BOSS ATTENDANCE', 'BOSS CONFIG', 'SETTINGS'];

export const MEMBER_HIDDEN_TABS = ['BOSS ATTENDANCE', 'BOSS CONFIG', 'DISTRIBUTION HISTORY', 'CP HISTORY', 'SETTINGS'];
