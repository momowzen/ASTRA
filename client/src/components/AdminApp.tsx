import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type CSSProperties } from 'react';
import type { RefObject } from 'react';
import { INTERNAL_TABS } from '../types';
import type { Column, DataResponse, RowData, Session } from '../types';
import { buildColumns, formatCp, isCpLabel, isDateLabel, optionColor, parseCpNumber, timeInGuildParts, toIsoDate } from '../utils';
import { addRow as apiAddRow, deleteRow as apiDeleteRow, saveCells, ApiError } from '../api';
import { DatePicker, Select } from './Dropdown';
import { IconBulb, IconClose, IconGear, IconGrid, IconHistory, IconLogout, IconMenu, IconOverview, IconPlus, IconReward, IconSearch, IconTrash, IconTrendingUp, IconTrophy, IconUserCheck } from './icons';
import AdminSettings from './AdminSettings';
import BossTracker from './BossTracker';
import GuildRoster from './GuildRoster';
import AdminTools from './AdminTools';
import ActivityLog from './ActivityLog';
import CpUpdate from './CpUpdate';
import CpHistoryView from './CpHistoryView';
import Avatar from './Avatar';
import ProfileCompletion from './ProfileCompletion';
import { LangToggle, useLang } from '../i18n';
import { colLabel, tabLabel, valueLabel } from '../display';

interface Props {
  data: DataResponse;
  session: Session;
  live: 'live' | 'stale' | 'error';
  liveNote: string;
  onPatch: (tabTitle: string, updates: { row: number; col: number; value: string }[]) => void;
  toast: (msg: string, kind?: 'ok' | 'err') => void;
  onLogout: () => void;
}

function leftAlignedLabel(label: string): boolean {
  const value = label.trim().toUpperCase();
  return value === 'IGN' || value === 'NICKNAME' || value === 'NOTES';
}

type SortKey = 'ign' | 'cp' | 'country' | 'guild' | 'role' | 'status' | 'joined' | 'tenure';
type SortState = { key: SortKey; dir: 'asc' | 'desc' };

function sortKeyForColumn(c: Column): SortKey | null {
  if (c.index === 0) return 'ign';
  const label = c.label.trim().toUpperCase();
  if (label === 'CP') return 'cp';
  if (label === 'COUNTRY') return 'country';
  if (label === 'GUILD') return 'guild';
  if (label === 'ROLE') return 'role';
  if (label === 'STATUS') return 'status';
  if (label === 'DATE JOINED') return 'joined';
  return null;
}

function SortButton({
  label,
  active,
  dir,
  title,
  onClick,
}: {
  label: string;
  active: boolean;
  dir?: 'asc' | 'desc';
  title: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`th-sort-btn${active ? ' active' : ''}`} title={title} onClick={onClick}>
      <span>{label}</span>
      <span className="th-sort-arrow" aria-hidden="true">
        {active ? (dir === 'asc' ? '▲' : '▼') : '↕'}
      </span>
    </button>
  );
}

function EditableCell({
  initial,
  options,
  format,
  isDate,
  onCommit,
  onCancel,
}: {
  initial: string;
  options?: string[];
  format?: boolean;
  isDate?: boolean;
  onCommit: (value: string) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [val, setVal] = useState(() => (isDate ? toIsoDate(initial) : initial));
  const { t, lang } = useLang();
  const ref = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const closing = useRef(false);

  useEffect(() => {
    ref.current?.focus();
    if (ref.current instanceof HTMLInputElement) ref.current.select();
  }, []);

  async function commit() {
    if (closing.current) return;
    closing.current = true;
    const ok = await onCommit(format ? formatCp(val) : val);
    if (!ok) closing.current = false;
  }

  if (isDate) {
    return (
      <DatePicker
        variant="cell"
        value={val}
        onChange={(iso) => {
          closing.current = true;
          void onCommit(iso).then((ok) => {
            if (!ok) closing.current = false;
          });
        }}
      />
    );
  }

  if (options) {
    const list = (options.includes(val) ? options : [val, ...options]).filter((o) => o !== '');
    return (
      <Select
        variant="cell"
        value={val}
        onChange={(next) => {
          closing.current = true;
          void onCommit(next).then((ok) => {
            if (!ok) {
              closing.current = false;
              setVal(initial);
            }
          });
        }}
        options={list.map((o) => ({ value: o, label: valueLabel(o, t, lang), color: optionColor(o) }))}
      />
    );
  }

  return (
    <input
      ref={ref as RefObject<HTMLInputElement>}
      className="cell-input"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => void commit()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          void commit();
        } else if (e.key === 'Escape') {
          closing.current = true;
          e.preventDefault();
          onCancel();
        }
        e.stopPropagation();
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

export default function AdminApp({
  data,
  session,
  live,
  liveNote,
  onPatch,
  toast,
  onLogout,
}: Props) {
  const [activeTitle, setActiveTitle] = useState(data.tabs[0]?.meta.title ?? '');
  const [search, setSearch] = useState('');
  const [showCol, setShowCol] = useState(-1);
  const [filterVal, setFilterVal] = useState('');
  const [bossView, setBossView] = useState<'dashboard' | 'attendance' | 'config' | null>(null);
  const [toolView, setToolView] = useState<'distribution' | 'cp-update' | 'profile-completion' | 'activity-log' | null>(null);
  const [rosterView, setRosterView] = useState(true);
  const [editing, setEditing] = useState<{ row: number; col: number } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sort, setSort] = useState<SortState | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<{
    url: string;
    ign: string;
    originX: number;
    originY: number;
  } | null>(null);

  const { t, lang } = useLang();

  const guildDuration = (value: string): string => {
    const p = timeInGuildParts(value);
    if (!p) return '';
    if (p.n === 0) return t('time.today');
    return t(`time.${p.unit}${p.n === 1 ? '' : 's'}`, { n: p.n });
  };

  const sheetTabs = data.tabs.filter((tb) => !INTERNAL_TABS.includes(tb.meta.title.toUpperCase()));

  const fit = toolView === 'distribution' || toolView === 'cp-update' || toolView === 'profile-completion' || bossView !== null || (!rosterView && !bossView && !toolView);

  useLayoutEffect(() => {
    const el = document.querySelector<HTMLElement>('.topbar');
    if (!el) return;
    const measure = () =>
      document.documentElement.style.setProperty('--topbar-h', `${Math.round(el.getBoundingClientRect().height)}px`);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const tab = data.tabs.find((t) => t.meta.title === activeTitle) || data.tabs[0];
  const isBasic = (tab?.meta.title ?? '').toUpperCase() === 'BASIC INFORMATION';
  const isCpH = (tab?.meta.title ?? '').toUpperCase() === 'CP HISTORY';

  const rosterTab = useMemo(
    () =>
      data.tabs.find((tb) => tb.meta.title.toUpperCase() === 'BASIC INFORMATION') ||
      data.tabs.find((tb) => (tb.meta.headers[0]?.[0] || '').trim().toUpperCase() === 'IGN'),
    [data.tabs],
  );
  const nickCol = useMemo(() => {
    const h = rosterTab?.meta.headers[0] || [];
    return h.findIndex((x) => String(x).trim().toLowerCase() === 'nickname');
  }, [rosterTab]);
  const nickIgns = useMemo(() => {
    const q = search.trim().toLowerCase();
    const set = new Set<string>();
    if (!q || nickCol < 0 || !rosterTab) return set;
    for (const r of rosterTab.rows) {
      if ((r.cells[nickCol] || '').toLowerCase().includes(q)) {
        const ign = (r.cells[0] || '').trim().toLowerCase();
        if (ign) set.add(ign);
      }
    }
    return set;
  }, [search, nickCol, rosterTab]);

  const allCols = useMemo(() => (tab ? buildColumns(tab.meta) : []), [tab]);
  const projecting = showCol >= 0;
  const joinedIdx = useMemo(() => allCols.find((c) => /date\s*joined/i.test(c.label))?.index ?? -1, [allCols]);
  const showTime = (tab?.meta.title ?? '').toUpperCase() === 'BASIC INFORMATION' && !projecting && joinedIdx >= 0;
  const cols = useMemo(
    () => (projecting ? allCols.filter((c) => c.index === 0 || c.index === showCol) : allCols),
    [allCols, showCol, projecting],
  );

  const filterChoices = useMemo(() => {
    if (!tab || showCol < 0) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const r of tab.rows) {
      const v = (r.cells[showCol] ?? '').trim();
      if (v && !seen.has(v)) {
        seen.add(v);
        out.push(v);
      }
    }
    return out;
  }, [tab, showCol]);

  const rows = useMemo(() => {
    if (!tab) return [];
    const q = search.trim().toLowerCase();
    const filtered = tab.rows.filter((r) => {
      if (q) {
        const ign = (r.cells[0] || '').trim().toLowerCase();
        if (!ign.includes(q) && !nickIgns.has(ign)) return false;
      }
      if (showCol >= 0 && filterVal && (r.cells[showCol] ?? '').trim() !== filterVal) return false;
      return true;
    });
    if (!isBasic || !sort) return filtered;

    const labelIndex = (label: string) =>
      allCols.find((c) => c.label.trim().toUpperCase() === label)?.index ?? -1;
    const column =
      sort.key === 'ign'
        ? 0
        : sort.key === 'tenure'
          ? joinedIdx
          : sort.key === 'joined'
            ? labelIndex('DATE JOINED')
            : sort.key === 'cp'
              ? labelIndex('CP')
              : sort.key === 'country'
                ? labelIndex('COUNTRY')
                : sort.key === 'guild'
                  ? labelIndex('GUILD')
                  : sort.key === 'role'
                    ? labelIndex('ROLE')
                    : labelIndex('STATUS');
    if (column < 0) return filtered;

    const now = Date.now();
    const dir = sort.dir === 'asc' ? 1 : -1;
    const value = (r: RowData): { raw: string; num: number | null } => {
      const raw = String(r.cells[column] ?? '').trim();
      if (sort.key === 'cp') {
        const num = parseCpNumber(raw);
        return { raw, num: Number.isNaN(num) ? null : num };
      }
      if (sort.key === 'tenure') {
        const iso = toIsoDate(raw);
        const joined = iso ? new Date(`${iso}T00:00:00`).getTime() : NaN;
        return { raw, num: Number.isNaN(joined) ? null : now - joined };
      }
      if (sort.key === 'joined') {
        const iso = toIsoDate(raw);
        const joined = iso ? new Date(`${iso}T00:00:00`).getTime() : NaN;
        return { raw, num: Number.isNaN(joined) ? null : joined };
      }
      return { raw, num: null };
    };

    return [...filtered].sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      const aEmpty = av.raw === '';
      const bEmpty = bv.raw === '';
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1;
      if (bEmpty) return -1;
      if (av.num !== null && bv.num !== null) return (av.num - bv.num) * dir;
      return av.raw.localeCompare(bv.raw, undefined, { numeric: true, sensitivity: 'base' }) * dir;
    });
  }, [tab, search, showCol, filterVal, nickIgns, isBasic, sort, allCols, joinedIdx]);

  async function commitCell(row: number, col: number, value: string): Promise<boolean> {
    if (!tab) return false;
    setBusy(true);
    try {
      await saveCells(tab.meta.title, [{ row, col, value }]);
      onPatch(tab.meta.title, [{ row, col, value }]);
      setEditing(null);
      return true;
    } catch (err) {
      toast(err instanceof ApiError ? err.message : t('admin.couldNotSaveCell'), 'err');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleAddRow(cells: string[]) {
    if (!tab) return;
    setBusy(true);
    try {
      await apiAddRow(tab.meta.title, cells);
      setAddOpen(false);
      toast(t('admin.addedRow', { ign: cells[0], title: tabLabel(tab.meta.title, t, lang) }), 'ok');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : t('admin.couldNotAddRow'), 'err');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!tab || confirmDelete == null) return;
    setBusy(true);
    try {
      await apiDeleteRow(tab.meta.title, confirmDelete);
      setConfirmDelete(null);
      toast(t('admin.rowDeleted'), 'ok');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : t('admin.couldNotDeleteRow'), 'err');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!avatarPreview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAvatarPreview(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [avatarPreview]);

  function openAvatarPreview(ign: string, url: string, e: MouseEvent<HTMLSpanElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.min(window.innerWidth - 48, 420);
    const cardHeight = size + 74;
    const left = (window.innerWidth - size) / 2;
    const top = (window.innerHeight - cardHeight) / 2;
    const originX = ((rect.left + rect.width / 2 - left) / size) * 100;
    const originY = ((rect.top + rect.height / 2 - top) / cardHeight) * 100;
    setAvatarPreview({
      url,
      ign,
      originX: Math.max(6, Math.min(94, originX)),
      originY: Math.max(6, Math.min(94, originY)),
    });
  }

  function toggleSort(key: SortKey): void {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      return prev.dir === 'asc' ? { key, dir: 'desc' } : null;
    });
  }

  const sortAria = (key: SortKey | null): 'ascending' | 'descending' | 'none' | undefined => {
    if (!key) return undefined;
    if (sort?.key !== key) return 'none';
    return sort.dir === 'asc' ? 'ascending' : 'descending';
  };

  const groupRuns: { label: string; span: number }[] = [];
  const subHeaders = tab?.meta.headers[1] ?? [];
  const grouped = !!tab && tab.meta.headerRows === 2 && !projecting;
  const groupEnds = new Set<number>();
  if (grouped) {
    for (let i = 1; i < cols.length; i++) {
      const g = cols[i].group;
      const last = groupRuns[groupRuns.length - 1];
      if (last && last.label === g) last.span += 1;
      else groupRuns.push({ label: g, span: 1 });
      if (i === cols.length - 1 || cols[i + 1].group !== g) groupEnds.add(i);
    }
  }

  return (
    <div className={`shell${toolView === 'profile-completion' ? ' shell-free' : ''}`}>
      <aside
        className={menuOpen ? 'sidebar open' : 'sidebar'}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('.nav-item')) setMenuOpen(false);
        }}
      >
        <div className="brand">
          <span className="brand-crest">
            <img className="mark" src="./assets/logo.png" alt="" />
          </span>
          <div className="brand-text">
            <div className="name">ASTRA</div>
            <div className="tag">{t('admin.tag')}</div>
          </div>
          <button
            className="drawer-close"
            aria-label={t('common.close')}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(false);
            }}
          >
            <IconClose />
          </button>
        </div>

        <div className="section-label">{t('admin.rosterSection')}</div>
        <button
          className={`nav-item nav-caps ${rosterView ? 'active' : ''}`}
          onClick={() => {
            setRosterView(true);
            setBossView(null);
            setToolView(null);
            setEditing(null);
            setShowCol(-1);
            setFilterVal('');
          }}
        >
          <span className="ico">
            <IconOverview />
          </span>
          {t('admin.rosterOverview')}
        </button>
        <button
          className={`nav-item nav-caps ${toolView === 'profile-completion' ? 'active' : ''}`}
          onClick={() => {
            setToolView('profile-completion');
            setBossView(null);
            setRosterView(false);
            setEditing(null);
            setShowCol(-1);
            setFilterVal('');
          }}
        >
          <span className="ico">
            <IconUserCheck />
          </span>
          {t('tools.profileCompletion')}
        </button>

        <div className="section-label">{t('admin.trackerSection')}</div>
        <button
          className={`nav-item nav-caps ${bossView === 'dashboard' ? 'active' : ''}`}
          onClick={() => {
            setBossView('dashboard');
            setToolView(null);
            setRosterView(false);
          }}
        >
          <span className="ico">
            <IconTrophy />
          </span>
          {t('admin.dashboard')}
        </button>
        <button
          className={`nav-item nav-caps ${bossView === 'attendance' ? 'active' : ''}`}
          onClick={() => {
            setBossView('attendance');
            setToolView(null);
            setRosterView(false);
          }}
        >
          <span className="ico">
            <IconPlus />
          </span>
          {t('admin.attendance')}
        </button>
        <button
          className={`nav-item nav-caps ${bossView === 'config' ? 'active' : ''}`}
          onClick={() => {
            setBossView('config');
            setToolView(null);
            setRosterView(false);
          }}
        >
          <span className="ico">
            <IconGear />
          </span>
          {t('admin.bossConfig')}
        </button>

        <div className="section-label">{t('tools.section')}</div>
        <button
          className={`nav-item nav-caps ${toolView === 'distribution' ? 'active' : ''}`}
          onClick={() => {
            setToolView('distribution');
            setBossView(null);
            setRosterView(false);
            setEditing(null);
            setShowCol(-1);
            setFilterVal('');
          }}
        >
          <span className="ico">
            <IconReward />
          </span>
          {t('tools.distribution')}
        </button>
        <button
          className={`nav-item nav-caps ${toolView === 'cp-update' ? 'active' : ''}`}
          onClick={() => {
            setToolView('cp-update');
            setBossView(null);
            setRosterView(false);
            setEditing(null);
            setShowCol(-1);
            setFilterVal('');
          }}
        >
          <span className="ico">
            <IconTrendingUp />
          </span>
          {t('tools.cpUpdate')}
        </button>
        <button
          className={`nav-item nav-caps ${toolView === 'activity-log' ? 'active' : ''}`}
          onClick={() => {
            setToolView('activity-log');
            setBossView(null);
            setRosterView(false);
            setEditing(null);
            setShowCol(-1);
            setFilterVal('');
          }}
        >
          <span className="ico">
            <IconHistory />
          </span>
          {t('tools.activityLog')}
        </button>

        <div className="section-label">{t('admin.sheetTabs')}</div>
        <div className="tab-scroll">
          {data.tabs
            .filter((tb) => !INTERNAL_TABS.includes(tb.meta.title.toUpperCase()))
            .map((tb) => (
              <button
                key={tb.meta.title}
                className={`nav-item ${!bossView && !toolView && !rosterView && tb.meta.title === tab?.meta.title ? 'active' : ''}`}
                onClick={() => {
                  setActiveTitle(tb.meta.title);
                  setBossView(null);
                  setToolView(null);
                  setRosterView(false);
                  setEditing(null);
                  setShowCol(-1);
                  setFilterVal('');
                }}
              >
                <span className="ico">
                  <IconGrid />
                </span>
                {tabLabel(tb.meta.title, t, lang)}
              </button>
            ))}
        </div>

        <div className="userbox">
          <div className="section-label" style={{ paddingTop: 0 }}>
            {t('admin.signedInAs', { user: session.username })}
          </div>
          <button className="nav-item" onClick={() => setSettingsOpen(true)}>
            <span className="ico">
              <IconGear />
            </span>
            {t('common.settings')}
          </button>
          <button className="nav-item" onClick={onLogout}>
            <span className="ico">
              <IconLogout />
            </span>
            {t('common.signOut')}
          </button>
        </div>
      </aside>

      {menuOpen && <div className="nav-backdrop" onClick={() => setMenuOpen(false)} />}

      <main className="main">
        <header className="topbar">
          <button className="menu-btn" aria-label={t('common.menu')} onClick={() => setMenuOpen(true)}>
            <IconMenu />
          </button>
          <div className="topbar-heading">
            <h2>
              <span className="topbar-tab-title">
                {rosterView
                  ? t('admin.rosterOverview')
                  : bossView
                    ? bossView === 'dashboard'
                      ? t('admin.dashboard')
                      : bossView === 'attendance'
                        ? t('admin.attendance')
                        : t('admin.bossConfig')
                    : toolView
                      ? toolView === 'cp-update'
                        ? t('tools.cpUpdate')
                        : toolView === 'profile-completion'
                          ? t('tools.profileCompletion')
                          : toolView === 'activity-log'
                            ? t('tools.activityLog')
                            : t('tools.distribution')
                      : tab
                      ? tabLabel(tab.meta.title, t, lang)
                      : t('member.loading')}
              </span>
              <span className="topbar-brand">ASTRA</span>
            </h2>
          </div>
          <div className="grow" />
          {!bossView && !toolView && !rosterView && (
            <div className="toolbar">
              <div className="search">
                <IconSearch />
                <input
                  className="input"
                  placeholder={t('admin.searchPh')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {(search || showCol >= 0 || filterVal) && (
                  <button
                    type="button"
                    className="search-clear"
                    aria-label={t('admin.clear')}
                    onClick={() => {
                      setSearch('');
                      setShowCol(-1);
                      setFilterVal('');
                    }}
                  >
                    <IconClose />
                  </button>
                )}
              </div>
              <div className="col-filter">
                <Select
                  value={String(showCol)}
                  onChange={(v) => {
                    setShowCol(Number(v));
                    setFilterVal('');
                    setEditing(null);
                  }}
                  clearable={false}
                  options={[
                    { value: '-1', label: t('admin.allColumns') },
                    ...allCols.map((c) => ({ value: String(c.index), label: colLabel(c.label, t, lang) })),
                  ]}
                />
                <Select
                  value={filterVal}
                  onChange={(v) => {
                    setFilterVal(v);
                    setEditing(null);
                  }}
                  disabled={showCol < 0}
                  clearable={false}
                  title={t('admin.filterBy', {
                    col: colLabel(cols.find((c) => c.index === showCol)?.label ?? '', t, lang),
                  })}
                  options={[
                    { value: '', label: t('admin.allValues') },
                    ...filterChoices.map((v) => ({ value: v, label: valueLabel(v, t, lang), color: optionColor(v) })),
                  ]}
                />
              </div>
              <button
                className={`btn btn-ghost btn-sm toolbar-clear ${search || showCol >= 0 || filterVal ? '' : 'is-empty'}`}
                disabled={!search && showCol < 0 && !filterVal}
                onClick={() => {
                  setSearch('');
                  setShowCol(-1);
                  setFilterVal('');
                }}
              >
                {t('admin.clear')}
              </button>
              {isBasic && (
                <button className="btn btn-primary btn-sm toolbar-add" onClick={() => setAddOpen(true)}>
                  <IconPlus /> {t('admin.addRow')}
                </button>
              )}
            </div>
          )}
          <span className={`live ${live === 'live' ? '' : live}`}>
            <span className="dot" />
            <span className="live-text">{liveNote}</span>
          </span>
          <LangToggle />
        </header>

        <div className={`content${fit ? ' content-fit' : ''}${rosterView ? ' content-roster' : ''}`}>
          {rosterView ? (
            <GuildRoster data={data} />
          ) : bossView ? (
            <BossTracker view={bossView} data={data} onPatch={onPatch} toast={toast} />
          ) : toolView ? (
            toolView === 'cp-update' ? (
              <CpUpdate data={data} toast={toast} />
            ) : toolView === 'profile-completion' ? (
              <ProfileCompletion data={data} />
            ) : toolView === 'activity-log' ? (
              <ActivityLog />
            ) : (
              <AdminTools data={data} toast={toast} />
            )
          ) : isCpH && tab ? (
            <CpHistoryView tab={tab} rows={rows} />
          ) : (
            <div className="table-card">
            <div className="table-meta">
              <div className="table-meta-info">
                <span>
                  {rows.length !== tab?.rows.length
                    ? t('admin.memberRowsOf', { a: rows.length, b: tab?.rows.length })
                    : t('admin.memberRows', { a: rows.length })}{' '}
                  ·{' '}
                  {projecting
                    ? t('admin.showingCols', { a: cols.length, b: allCols.length })
                    : t('admin.columnsCount', { a: cols.length + (showTime ? 1 : 0) })}
                </span>
              </div>
              <div className="table-meta-right">
                <span className="muted">{t('admin.editHint')}</span>
                {isBasic && (
                  <button className="btn btn-ghost btn-sm tip-btn" onClick={() => setTipOpen(true)}>
                    <IconBulb /> {t('admin.tip')}
                  </button>
                )}
              </div>
            </div>
            <div className="table-scroll">
              <table className={`grid admin-grid${grouped ? ' grouped' : ''}`}>
                <thead>
                  {tab && tab.meta.headerRows === 2 && !projecting ? (
                    <>
                      <tr className="groups">
                        <th className="rownum" rowSpan={2}>
                          #
                        </th>
                        <th className="ign-col" rowSpan={2}>
                          {colLabel(cols[0]?.label ?? '', t, lang)}
                        </th>
                        {groupRuns.map((g, i) => (
                          <th key={i} colSpan={g.span} className="col-sep">
                            {colLabel(g.label, t, lang)}
                          </th>
                        ))}
                        {isBasic && <th className="actions" rowSpan={2} />}
                      </tr>
                      <tr className="labels">
                        {cols.slice(1).map((c) => (
                          <th key={c.index} className={groupEnds.has(c.index) ? 'col-sep' : undefined}>
                            {colLabel((subHeaders[c.index] ?? '').trim() || c.label, t, lang)}
                          </th>
                        ))}
                      </tr>
                    </>
                  ) : (
                    <tr className="labels single">
                      <th className="rownum">#</th>
                      <th className="ign-col" aria-sort={isBasic ? sortAria('ign') : undefined}>
                        {isBasic ? (
                          <SortButton
                            label={colLabel(cols[0]?.label ?? 'IGN', t, lang)}
                            active={sort?.key === 'ign'}
                            dir={sort?.dir}
                            title={t('admin.sortBy', { col: colLabel(cols[0]?.label ?? 'IGN', t, lang) })}
                            onClick={() => toggleSort('ign')}
                          />
                        ) : (
                          colLabel(cols[0]?.label ?? 'IGN', t, lang)
                        )}
                      </th>
                      {cols.slice(1).map((c) => {
                        const key = isBasic ? sortKeyForColumn(c) : null;
                        const label = colLabel(c.label, t, lang);
                        return (
                          <th
                            key={c.index}
                            className={leftAlignedLabel(c.label) ? 'align-left' : undefined}
                            aria-sort={key ? sortAria(key) : undefined}
                          >
                            {key ? (
                              <SortButton
                                label={label}
                                active={sort?.key === key}
                                dir={sort?.dir}
                                title={t('admin.sortBy', { col: label })}
                                onClick={() => toggleSort(key)}
                              />
                            ) : (
                              label
                            )}
                          </th>
                        );
                      })}
                      {showTime && (
                        <th className="time-col" aria-sort={isBasic ? sortAria('tenure') : undefined}>
                          {isBasic ? (
                            <SortButton
                              label={t('col.timeInGuild')}
                              active={sort?.key === 'tenure'}
                              dir={sort?.dir}
                              title={t('admin.sortBy', { col: t('col.timeInGuild') })}
                              onClick={() => toggleSort('tenure')}
                            />
                          ) : (
                            t('col.timeInGuild')
                          )}
                        </th>
                      )}
                      {isBasic && <th className="actions" />}
                    </tr>
                  )}
                </thead>
                <tbody>
                  {rows.map((r, ri) => (
                    <tr key={r.row}>
                      <td className={`rownum ${ri < 3 ? `rank-${ri + 1}` : ''}`}>{r.row}</td>
                      {cols.map((c) => {
                        const isEditing = editing?.row === r.row && editing?.col === c.index;
                        const value = r.cells[c.index] ?? '';
                        const options = tab.meta.options?.[c.index];
                        const isOption = !!options;
                        const isDate = isDateLabel(c.label);
                        const optionList = options
                          ? (options.includes(value) ? options : [value, ...options]).filter((o) => o !== '')
                          : [];
                        const shown = isCpLabel(c.label) ? formatCp(value) : isDate ? toIsoDate(value) : options ? valueLabel(value, t, lang) : value;
                        const avatarUrl = c.index === 0 ? data.avatars?.[String(value).trim().toLowerCase()] : undefined;
                        return (
                          <td
                            key={c.index}
                            className={`${c.index === 0 ? 'ign-col' : ''}${groupEnds.has(c.index) ? ' col-sep' : ''}${leftAlignedLabel(c.label) ? ' align-left' : ''}`}
                            onClick={() => {
                              if (!busy && !isOption && !isDate) setEditing({ row: r.row, col: c.index });
                            }}
                          >
                            {isEditing && !isOption && !isDate ? (
                              <EditableCell
                                initial={value}
                                options={options}
                                format={isCpLabel(c.label)}
                                isDate={isDate}
                                onCommit={(v) => commitCell(r.row, c.index, v)}
                                onCancel={() => setEditing(null)}
                              />
                            ) : isOption ? (
                              <Select
                                variant="cell"
                                value={value}
                                disabled={busy}
                                title={shown}
                                onChange={(next) => void commitCell(r.row, c.index, next)}
                                options={optionList.map((o) => ({ value: o, label: valueLabel(o, t, lang), color: optionColor(o) }))}
                              />
                            ) : isDate ? (
                              <DatePicker
                                variant="cell"
                                value={toIsoDate(value)}
                                disabled={busy}
                                onChange={(iso) => void commitCell(r.row, c.index, iso)}
                              />
                            ) : (
                                <div className={`cell${isCpLabel(c.label) ? ' cp-value' : ''}${c.index === 0 ? ' ign-cell' : ''}`} title={shown} style={{ color: optionColor(value) }}>
                                {c.index === 0 && (
                                  <Avatar
                                    ign={String(value)}
                                    src={avatarUrl}
                                    className={`mini-avatar${avatarUrl ? ' admin-avatar' : ''}`}
                                    title={avatarUrl ? t('member.viewPhoto') : undefined}
                                    onClick={
                                      avatarUrl
                                        ? (e) => {
                                            e.stopPropagation();
                                            openAvatarPreview(String(value), avatarUrl, e);
                                          }
                                        : undefined
                                    }
                                  />
                                )}
                                {shown || <span className="muted">—</span>}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      {showTime && (
                        <td className="time-col">
                          <div className="cell">{guildDuration(r.cells[joinedIdx] ?? '')}</div>
                        </td>
                      )}
                      {isBasic && (
                        <td className="actions">
                          <button
                            className="icon-btn"
                            title={t('admin.deleteRow')}
                            onClick={() => setConfirmDelete(r.row)}
                          >
                            <IconTrash />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={cols.length + 1 + (showTime ? 1 : 0) + (isBasic ? 1 : 0)}>
                        <div className="empty">
                          <div className="big">
                            <IconGrid />
                          </div>
                          {t('admin.noRows')}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      </main>

      {addOpen && tab && (
        <AddRowModal
          columns={allCols}
          options={tab.meta.options}
          busy={busy}
          onClose={() => setAddOpen(false)}
          onSubmit={handleAddRow}
        />
      )}

      {confirmDelete != null && tab && (
        <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && setConfirmDelete(null)}>
          <div className="modal">
            <h3>{t('admin.deleteRowTitle', { n: confirmDelete })}</h3>
            <p className="desc">{t('admin.deleteRowDesc', { title: tabLabel(tab.meta.title, t, lang) })}</p>
            <div className="row">
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>
                {t('common.cancel')}
              </button>
              <button className="btn btn-danger" disabled={busy} onClick={() => void handleDelete()}>
                {busy ? <span className="spinner" /> : t('admin.deleteRow')}
              </button>
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <AdminSettings
          memberEdit={data.memberEdit !== false}
          sheetUrl={data.sheetUrl}
          onClose={() => setSettingsOpen(false)}
          toast={toast}
        />
      )}

      {tipOpen && (
        <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && setTipOpen(false)}>
          <div className="modal wide">
            <h3>{t('admin.tipTitle')}</h3>
            <div className="tip-section">
              <div className="tip-section-title">{t('admin.tipStatus')}</div>
              {(
                [
                  ['Core', 'admin.tipStCore'],
                  ['Active', 'admin.tipStActive'],
                  ['Busy', 'admin.tipStBusy'],
                  ['Reserve', 'admin.tipStReserve'],
                  ['Probation', 'admin.tipStProbation'],
                  ['Pending Transfer', 'admin.tipStPending'],
                  ['Inactive', 'admin.tipStInactive'],
                ] as const
              ).map(([label, key]) => (
                <div className="tip-row" key={label}>
                  <span className="tip-key">{valueLabel(label, t, lang)}</span>
                  <span className="tip-desc">{t(key)}</span>
                </div>
              ))}
            </div>
            <div className="tip-section">
              <div className="tip-section-title">{t('admin.tipRoles')}</div>
              {(
                [
                  ['Guild Leader', 'admin.tipRoleLeader'],
                  ['Co-Leader', 'admin.tipRoleCoLeader'],
                  ['Officer', 'admin.tipRoleOfficer'],
                  ['Guild Support', 'admin.tipRoleSupport'],
                  ['Senior', 'admin.tipRoleSenior'],
                  ['Member', 'admin.tipRoleMember'],
                ] as const
              ).map(([label, key]) => (
                <div className="tip-row" key={label}>
                  <span className="tip-key">{valueLabel(label, t, lang)}</span>
                  <span className="tip-desc">{t(key)}</span>
                </div>
              ))}
            </div>
            <div className="row">
              <button className="btn btn-primary" onClick={() => setTipOpen(false)}>
                {t('admin.tipClose')}
              </button>
            </div>
          </div>
        </div>
      )}

      {avatarPreview && (
        <div
          className="avatar-lightbox"
          onMouseDown={(e) => e.target === e.currentTarget && setAvatarPreview(null)}
        >
          <div
            className="avatar-lightbox-card"
            style={
              {
                '--avatar-origin-x': `${avatarPreview.originX}%`,
                '--avatar-origin-y': `${avatarPreview.originY}%`,
              } as CSSProperties
            }
          >
            <button
              type="button"
              className="avatar-lightbox-close"
              aria-label={t('common.close')}
              title={t('common.close')}
              onClick={() => setAvatarPreview(null)}
            >
              <IconClose />
            </button>
            <Avatar
              ign={avatarPreview.ign}
              src={avatarPreview.url}
              className="avatar-lightbox-image"
              alt={avatarPreview.ign}
            />
            <div className="avatar-lightbox-name">{avatarPreview.ign}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddRowModal({
  columns,
  options,
  busy,
  onClose,
  onSubmit,
}: {
  columns: Column[];
  options?: Record<number, string[]>;
  busy: boolean;
  onClose: () => void;
  onSubmit: (cells: string[]) => Promise<void>;
}) {
  const { t, lang } = useLang();
  const [values, setValues] = useState<string[]>(() => columns.map(() => ''));

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal wide">
        <h3>{t('admin.addRow')}</h3>
        <p className="desc">{t('admin.addRowDesc')}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onSubmit(
              values.map((v, i) => (isCpLabel(columns[i]?.label ?? '') ? formatCp(v) : v)),
            );
          }}
        >
          <div className="form-grid">
            {columns.map((col, i) => {
              const opts = options?.[col.index];
              return (
                <div className="field" key={i}>
                  <label>
                    {colLabel(col.label, t, lang)}
                    {i === 0 ? ' *' : ''}
                  </label>
                  {opts ? (
                    <Select
                      value={values[i] ?? ''}
                      onChange={(v) =>
                        setValues((prev) => {
                          const next = [...prev];
                          next[i] = v;
                          return next;
                        })
                      }
                      options={opts.map((o) => ({ value: o, label: valueLabel(o, t, lang), color: optionColor(o) }))}
                    />
                  ) : isDateLabel(col.label) ? (
                    <DatePicker
                      value={toIsoDate(values[i] ?? '')}
                      onChange={(iso) =>
                        setValues((prev) => {
                          const next = [...prev];
                          next[i] = iso;
                          return next;
                        })
                      }
                    />
                  ) : (
                    <input
                      className="input"
                      value={values[i] ?? ''}
                      autoFocus={i === 0}
                      onChange={(e) =>
                        setValues((prev) => {
                          const next = [...prev];
                          next[i] = e.target.value;
                          return next;
                        })
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="row">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? <span className="spinner" /> : t('admin.addRow')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
