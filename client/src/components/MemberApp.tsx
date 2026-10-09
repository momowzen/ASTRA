import { useEffect, useMemo, useRef, useState } from 'react';
import { MEMBER_HIDDEN_TABS } from '../types';
import type { Column, DataResponse, Session, TabData } from '../types';
import { buildColumns, formatCp, initials, isCpLabel, isMark, MEMBER_READONLY, optionColor } from '../utils';
import { ApiError, apiBase, saveCells } from '../api';
import { IconClose, IconGear, IconGem, IconGrid, IconLogout, IconMenu, IconSheet, IconSparkles, IconTimer, IconUser, IconUsers } from './icons';
import MemberSettingsModal from './MemberSettingsModal';
import ProfileProgress from './ProfileProgress';
import { LangToggle, useLang } from '../i18n';
import { colLabel, tabLabel } from '../display';

interface Props {
  data: DataResponse;
  session: Session;
  live: 'live' | 'stale' | 'error';
  liveNote: string;
  onPatch: (tabTitle: string, updates: { row: number; col: number; value: string }[]) => void;
  toast: (msg: string, kind?: 'ok' | 'err') => void;
  onLogout: () => void;
  onSessionChange: (s: Session) => void;
}

function prettyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\+12/g, '+12')
    .replace(/\bof\b/gi, 'of');
}

const ROSTER_COLS = [
  { key: 'ign', label: 'IGN' },
  { key: 'role', label: 'ROLE' },
  { key: 'guild', label: 'GUILD' },
  { key: 'cp', label: 'CP' },
] as const;

const ROSTER_FILTER_COLS = ROSTER_COLS.filter((c) => c.key !== 'ign');

type ToolView = 'tracker' | 'hidden' | 'relic';

interface AstraToolsApi {
  onStatusChange: ((on: boolean) => void) | null;
  onAlarmChange: ((on: boolean) => void) | null;
  apiBase: string;
  setPage: (page: string) => void;
  setLang: (lang: string) => void;
  toggleAlarm: () => void;
  alarmOn: () => boolean;
}

function Field({
  label,
  value,
  options,
  readOnly,
  format,
  onCommit,
  dataTab,
  dataCol,
}: {
  label: string;
  value: string;
  options?: string[];
  readOnly?: boolean;
  format?: boolean;
  onCommit: (value: string) => Promise<void>;
  dataTab?: string;
  dataCol?: number;
}) {
  const { t } = useLang();
  const [val, setVal] = useState(() => (format ? formatCp(value) : value));
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setVal(format ? formatCp(value) : value);
  }, [value, format]);

  async function commitValue(next: string) {
    const final = format ? formatCp(next) : next;
    if (final === value) {
      setVal(final);
      return;
    }
    setStatus('saving');
    try {
      await onCommit(final);
      setVal(final);
      setStatus('saved');
      setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 1800);
    } catch {
      setStatus('error');
    }
  }

  if (readOnly) {
    const shown = format ? formatCp(value) : value;
    return (
      <div className="field" data-tab={dataTab} data-col={dataCol}>
        <label>{label}</label>
        <div className="field-ro" title={t('member.adminManaged')}>
          {shown.trim() || '—'}
        </div>
      </div>
    );
  }

  const optionList = options
    ? (options.includes(val) ? options : [val, ...options]).filter((o) => o !== '')
    : [];

  return (
    <div className="field" data-tab={dataTab} data-col={dataCol}>
      <label style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <span>{label}</span>
        <span
          className={`save-note ${status === 'saved' ? 'ok' : status === 'error' ? 'err' : ''}`}
          style={{ textTransform: 'none', letterSpacing: 0 }}
        >
          {status === 'saving' && t('common.saving')}
          {status === 'saved' && t('common.saved')}
          {status === 'error' && t('common.failed')}
        </span>
      </label>
      {options ? (
        <select
          className="select"
          value={val}
          style={{ color: optionColor(val) }}
          onFocus={() => (focused.current = true)}
          onChange={(e) => {
            const next = e.target.value;
            setVal(next);
            void commitValue(next);
          }}
        >
          <option value="" style={{ color: 'var(--muted)' }}>
            —
          </option>
          {optionList.map((o) => (
            <option key={o} value={o} style={{ color: optionColor(o) || 'var(--text)' }}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          ref={inputRef}
          className="input"
          value={val}
          onFocus={() => (focused.current = true)}
          onBlur={() => {
            focused.current = false;
            void commitValue(val);
          }}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') inputRef.current?.blur();
          }}
        />
      )}
    </div>
  );
}

function CollectionCell({
  value,
  options,
  onCommit,
}: {
  value: string;
  options?: string[];
  onCommit: (value: string) => Promise<void>;
}) {
  const { t } = useLang();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const empty = value.trim() === '';
  const mark = isMark(value);

  if (options) {
    const list = (options.includes(value) ? options : [value, ...options]).filter((o) => o !== '');
    return (
      <select
        className="coll-select"
        value={value}
        style={{ color: optionColor(value) }}
        onChange={(e) => onCommit(e.target.value).catch(() => {})}
      >
        <option value="" style={{ color: 'var(--muted)' }}>
          —
        </option>
        {list.map((o) => (
          <option key={o} value={o} style={{ color: optionColor(o) || 'var(--text)' }}>
            {o}
          </option>
        ))}
      </select>
    );
  }

  if (editing) {
    return (
      <input
        className="cell-input"
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (draft !== value) void onCommit(draft);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
      />
    );
  }

  if (empty) {
    return (
      <button className="cell-btn" title={t('cell.mark')} onClick={() => void onCommit('✔')}>
        ·
      </button>
    );
  }
  if (mark) {
    return (
      <button className="cell-btn on" title={t('cell.clear')} onClick={() => void onCommit('')}>
        ✓
      </button>
    );
  }
  return (
    <span
      className="cell-text"
      title={t('cell.edit')}
      style={{ color: optionColor(value) }}
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
    >
      {value}
    </span>
  );
}

export default function MemberApp({
  data,
  session,
  live,
  liveNote,
  onPatch,
  toast,
  onLogout,
  onSessionChange,
}: Props) {
  const [activeTitle, setActiveTitle] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [jump, setJump] = useState<{ tab: string; col: number } | null>(null);
  const [rosterView, setRosterView] = useState(false);
  const [rosterCol, setRosterCol] = useState(-1);
  const [rosterVal, setRosterVal] = useState('');
  const [toolsView, setToolsView] = useState<ToolView | null>(null);
  const [toolsOnline, setToolsOnline] = useState(true);
  const [toolsAlarm, setToolsAlarm] = useState(false);
  const toolsFrameRef = useRef<HTMLIFrameElement>(null);
  const stripRef = useRef<HTMLElement>(null);

  const { t, lang } = useLang();
  const tabText = (raw: string) => tabLabel(raw, t, lang, prettyTitle);

  const rosterTab =
    data.tabs.find((t) => t.meta.title.toUpperCase() === 'BASIC INFORMATION') ||
    data.tabs.find((t) => (t.meta.headers[0]?.[0] || '').trim().toUpperCase() === 'IGN');

  const equipTab = data.tabs.find((t) => t.meta.title.toUpperCase() === 'EQUIPMENT');

  const DASHBOARD_TITLES = ['BASIC INFORMATION', 'EQUIPMENT'];
  const memberTabs = data.tabs.filter(
    (t) =>
      !DASHBOARD_TITLES.includes(t.meta.title.toUpperCase()) &&
      !MEMBER_HIDDEN_TABS.includes(t.meta.title.toUpperCase()) &&
      (t.meta.headers[0] || []).some((h) => h.trim() !== ''),
  );

  function selectTab(title: string) {
    setActiveTitle(title);
    setRosterView(false);
    setToolsView(null);
    setMenuOpen(false);
  }

  function showRoster() {
    setRosterView(true);
    setActiveTitle('');
    setToolsView(null);
    setRosterCol(-1);
    setRosterVal('');
    setMenuOpen(false);
  }

  function showTool(tool: ToolView) {
    setToolsView(tool);
    setActiveTitle('');
    setRosterView(false);
    setMenuOpen(false);
  }

  function jumpToField(tabTitle: string, col: number) {
    const upper = tabTitle.toUpperCase();
    const isDash = upper === 'BASIC INFORMATION' || upper === 'EQUIPMENT';
    setActiveTitle(isDash ? '' : tabTitle);
    setJump({ tab: tabTitle, col });
  }

  useEffect(() => {
    if (!jump) return;
    const id = window.setTimeout(() => {
      const el = [...document.querySelectorAll<HTMLElement>('.content [data-tab][data-col]')].find(
        (n) => n.dataset.tab === jump.tab && n.dataset.col === String(jump.col),
      );
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el.classList.add('field-flash');
        window.setTimeout(() => el.classList.remove('field-flash'), 1600);
      }
      setJump(null);
    }, 80);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jump, activeTitle]);

  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>('.main-tab.active');
    el?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [activeTitle]);

  const mapLang = (l: string) => (l === 'ko' || l === 'ja' || l === 'zh' ? l : 'en');
  const toolsApi = () =>
    (toolsFrameRef.current?.contentWindow as (Window & { ASTRA_TOOLS?: AstraToolsApi }) | null)
      ?.ASTRA_TOOLS;

  function onToolsLoad() {
    const api = toolsApi();
    if (!api) return;
    api.onStatusChange = (on) => setToolsOnline(on);
    api.onAlarmChange = (on) => setToolsAlarm(on);
    api.apiBase = apiBase();
    setToolsAlarm(!!api.alarmOn());
    api.setLang(mapLang(lang));
    if (toolsView) api.setPage(toolsView);
  }

  useEffect(() => {
    if (toolsView) toolsApi()?.setPage(toolsView);
  }, [toolsView]);

  useEffect(() => {
    toolsApi()?.setLang(mapLang(lang));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const activeTab = memberTabs.find((t) => t.meta.title === activeTitle);
  const isDashboard = !activeTab && !rosterView && !toolsView;

  const myRow = useMemo(() => {
    const ign = session.ign.trim().toLowerCase();
    return (tab?: TabData) => tab?.rows.find((r) => (r.cells[0] || '').trim().toLowerCase() === ign);
  }, [session.ign]);

  const rosterRow = myRow(rosterTab);
  const equipRow = myRow(equipTab);
  const rosterCols = rosterTab ? buildColumns(rosterTab.meta) : [];
  const equipCols = equipTab ? buildColumns(equipTab.meta) : [];

  const profileBadges = useMemo(() => {
    if (!rosterTab || !rosterRow) return [] as { label: string; cls: string }[];
    const cols = buildColumns(rosterTab.meta);
    const out: { label: string; cls: string }[] = [];
    for (const label of ['ROLE', 'CP', 'GUILD']) {
      const c = cols.find((col) => col.label.trim().toUpperCase() === label);
      if (!c) continue;
      const v = (rosterRow.cells[c.index] || '').trim();
      if (!v) continue;
      out.push({ label: label === 'CP' ? formatCp(v) : v, cls: label === 'CP' ? 'gold' : 'violet' });
    }
    return out;
  }, [rosterTab, rosterRow]);

  async function commit(tab: TabData, row: number, col: number, value: string): Promise<void> {
    try {
      await saveCells(tab.meta.title, [{ row, col, value }]);
      onPatch(tab.meta.title, [{ row, col, value }]);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : t('member.couldNotSave'), 'err');
      throw err;
    }
  }

  const cols = activeTab ? buildColumns(activeTab.meta) : [];
  const row = activeTab ? myRow(activeTab) : undefined;
  const collectionGroups: { label: string; cols: Column[] }[] = [];
  if (activeTab && activeTab.meta.headerRows === 2) {
    for (const c of cols.slice(1)) {
      const last = collectionGroups[collectionGroups.length - 1];
      if (last && last.label === c.group) last.cols.push(c);
      else collectionGroups.push({ label: c.group, cols: [c] });
    }
  }

  const rosterMembers = data.roster ?? [];
  const rosterChoices = useMemo(() => {
    if (rosterCol < 0) return [] as string[];
    const key = ROSTER_FILTER_COLS[rosterCol].key;
    const seen = new Set<string>();
    const out: string[] = [];
    for (const m of rosterMembers) {
      const v = (m[key] || '').trim();
      if (v && !seen.has(v)) {
        seen.add(v);
        out.push(v);
      }
    }
    return out;
  }, [rosterMembers, rosterCol]);
  const rosterRows = useMemo(() => {
    if (rosterCol < 0 || !rosterVal) return rosterMembers;
    const key = ROSTER_FILTER_COLS[rosterCol].key;
    return rosterMembers.filter((m) => (m[key] || '').trim() === rosterVal);
  }, [rosterMembers, rosterCol, rosterVal]);

  const liveState = toolsView ? (toolsOnline ? 'live' : 'error') : live;
  const liveText = toolsView ? (toolsOnline ? t('app.live') : t('app.offline')) : liveNote;

  return (
    <div className="shell shell-member">
      <aside
        className={menuOpen ? 'sidebar open' : 'sidebar'}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('.nav-item')) setMenuOpen(false);
        }}
      >
        <div className="brand">
          <img className="mark" src="./assets/logo.png" alt="" />
          <div>
            <div className="name">ASTRA</div>
            <div className="tag">{t('member.tag')}</div>
          </div>
          <button
            className="drawer-close"
            aria-label={t('common.close')}
            onClick={() => setMenuOpen(false)}
          >
            <IconClose />
          </button>
        </div>

        <div className="section-label">{t('member.myProfile')}</div>
        <button
          className={`nav-item ${isDashboard ? 'active' : ''}`}
          onClick={() => selectTab('')}
        >
          <span className="ico">
            <IconUser />
          </span>
          {t('member.profile')}
        </button>
        <button className={`nav-item ${rosterView ? 'active' : ''}`} onClick={showRoster}>
          <span className="ico">
            <IconUsers />
          </span>
          {t('member.roster')}
        </button>
        {memberTabs.map((t) => (
          <button
            key={t.meta.title}
            className={`nav-item ${t.meta.title === activeTitle ? 'active' : ''}`}
            onClick={() => selectTab(t.meta.title)}
          >
            <span className="ico">
              <IconSheet />
            </span>
            {tabText(t.meta.title)}
          </button>
        ))}

        <div className="section-label">{t('member.tools')}</div>
        <button
          className={`nav-item ${toolsView === 'tracker' ? 'active' : ''}`}
          onClick={() => showTool('tracker')}
        >
          <span className="ico">
            <IconTimer />
          </span>
          {t('member.toolBossTracker')}
        </button>
        <button
          className={`nav-item ${toolsView === 'hidden' ? 'active' : ''}`}
          onClick={() => showTool('hidden')}
        >
          <span className="ico">
            <IconSparkles />
          </span>
          {t('member.toolHiddenClass')}
        </button>
        <button
          className={`nav-item ${toolsView === 'relic' ? 'active' : ''}`}
          onClick={() => showTool('relic')}
        >
          <span className="ico">
            <IconGem />
          </span>
          {t('member.toolRelic')}
        </button>

        <div className="spacer" />
        <div className="userbox">
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
          <h2>
            <span className="topbar-tab-title">
              {toolsView
                ? toolsView === 'tracker'
                  ? t('member.toolBossTracker')
                  : toolsView === 'hidden'
                    ? t('member.toolHiddenClass')
                    : t('member.toolRelic')
                : rosterView
                  ? t('member.roster')
                  : isDashboard
                    ? t('member.profile')
                    : activeTab
                      ? tabText(activeTab.meta.title)
                      : t('member.loading')}
            </span>
            <span className="topbar-brand">ASTRA</span>
          </h2>
          <div className="grow" />
          {toolsView === 'tracker' && (
            <button
              className={`topbar-alarm ${toolsAlarm ? 'on' : ''}`}
              aria-label={t('member.alarm')}
              title={t('member.alarm')}
              aria-pressed={toolsAlarm}
              onClick={() => toolsApi()?.toggleAlarm()}
            >
              {toolsAlarm ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              )}
            </button>
          )}
          <span className={`live ${liveState === 'live' ? '' : liveState}`}>
            <span className="dot" />
            <span className="live-text">{liveText}</span>
          </span>
          <LangToggle />
          <nav className="main-tabs" ref={stripRef}>
            <button className={`main-tab ${isDashboard ? 'active' : ''}`} onClick={() => selectTab('')}>
              {t('member.profile')}
            </button>
            <button className={`main-tab ${rosterView ? 'active' : ''}`} onClick={showRoster}>
              {t('member.roster')}
            </button>
            {memberTabs.map((mt) => (
              <button
                key={mt.meta.title}
                className={`main-tab ${mt.meta.title === activeTitle ? 'active' : ''}`}
                onClick={() => selectTab(mt.meta.title)}
              >
                {tabText(mt.meta.title)}
              </button>
            ))}
            <button
              className={`main-tab ${toolsView === 'tracker' ? 'active' : ''}`}
              onClick={() => showTool('tracker')}
            >
              {t('member.toolBossTracker')}
            </button>
            <button
              className={`main-tab ${toolsView === 'hidden' ? 'active' : ''}`}
              onClick={() => showTool('hidden')}
            >
              {t('member.toolHiddenClass')}
            </button>
            <button
              className={`main-tab ${toolsView === 'relic' ? 'active' : ''}`}
              onClick={() => showTool('relic')}
            >
              {t('member.toolRelic')}
            </button>
          </nav>
        </header>

        <div className="content">
          {!toolsView && (
          <div className="profile-hero">
            <div className="avatar">{initials(session.ign)}</div>
            <div className="id">
              <h1>{session.ign}</h1>
              <div className="badges">
                {profileBadges.map((b, i) => (
                  <span key={i} className={`badge ${b.cls}`}>
                    {b.label}
                  </span>
                ))}
                {!rosterRow && (
                  <span className="badge" style={{ color: 'var(--accent-2)' }}>
                    {t('member.notOnRoster')}
                  </span>
                )}
              </div>
            </div>
            <ProfileProgress tabs={data.tabs} ign={session.ign} tabText={tabText} onJump={jumpToField} />
          </div>
          )}

          {toolsView && (
            <iframe
              ref={toolsFrameRef}
              className="tools-frame"
              src="./tools/index.html"
              title={t('member.tools')}
              allow="autoplay"
              onLoad={onToolsLoad}
            />
          )}

          {rosterView && (
            <div className="panel-card roster-panel">
              <h3>{t('member.roster')}</h3>
              <div className="table-meta roster-filter">
                <span>{t('member.membersCount', { a: rosterRows.length })}</span>
                <div className="table-meta-right">
                  <select
                    className="select"
                    value={rosterCol}
                    onChange={(e) => {
                      setRosterCol(Number(e.target.value));
                      setRosterVal('');
                    }}
                  >
                    <option value={-1}>{t('admin.allColumns')}</option>
                    {ROSTER_FILTER_COLS.map((c, i) => (
                      <option key={c.key} value={i}>
                        {colLabel(c.label, t, lang)}
                      </option>
                    ))}
                  </select>
                  {rosterCol >= 0 && (
                    <select
                      className="select"
                      value={rosterVal}
                      onChange={(e) => setRosterVal(e.target.value)}
                    >
                      <option value="">{t('admin.allValues')}</option>
                      {rosterChoices.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div className="table-scroll">
                <table className="grid roster-grid">
                  <thead>
                    <tr className="labels single">
                      {ROSTER_COLS.map((c, i) => (
                        <th key={c.key} className={i === 0 ? 'ign-col' : ''}>
                          {colLabel(c.label, t, lang)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rosterRows.map((m) => (
                      <tr key={m.ign}>
                        <td className="ign-col">
                          <div className="cell">{m.ign}</div>
                        </td>
                        <td>
                          <div className="cell" style={{ color: optionColor(m.role) }}>
                            {m.role || '—'}
                          </div>
                        </td>
                        <td>
                          <div className="cell" style={{ color: optionColor(m.guild) }}>
                            {m.guild || '—'}
                          </div>
                        </td>
                        <td>
                          <div className="cell">{m.cp ? formatCp(m.cp) : '—'}</div>
                        </td>
                      </tr>
                    ))}
                    {rosterRows.length === 0 && (
                      <tr>
                        <td colSpan={ROSTER_COLS.length}>
                          <div className="empty">{t('admin.noRows')}</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {isDashboard && (rosterTab || equipTab) && (
            <div className="panel-card profile-panel">
              <div className="panel-scroll">
                {rosterTab && (
                  <section className="profile-section">
                    <h3>{tabText('BASIC INFORMATION')}</h3>
                    {!rosterRow ? (
                      <div className="empty">
                        <div className="big">
                          <IconGrid />
                        </div>
                        {t('member.noRowProfile')}
                      </div>
                    ) : (
                      <div className="field-grid">
                        {rosterCols.slice(1).map((c) => (
                          <Field
                            key={c.index}
                            label={colLabel(c.label, t, lang)}
                            value={rosterRow.cells[c.index] ?? ''}
                            options={rosterTab.meta.options?.[c.index]}
                            readOnly={MEMBER_READONLY.has(c.label.trim().toUpperCase())}
                      format={isCpLabel(c.label)}
                      dataTab={rosterTab.meta.title}
                      dataCol={c.index}
                      onCommit={(v) => commit(rosterTab, rosterRow.row, c.index, v)}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {equipTab && (
                  <section className="profile-section">
                    <h3>{tabText('EQUIPMENT')}</h3>
                    {!equipRow ? (
                      <div className="empty">
                        <div className="big">
                          <IconGrid />
                        </div>
                        {t('member.noRowProfile')}
                      </div>
                    ) : (
                      <div className="field-grid">
                        {equipCols.slice(1).map((c) => (
                          <Field
                            key={c.index}
                            label={colLabel(c.label, t, lang)}
                            value={equipRow.cells[c.index] ?? ''}
                            options={equipTab.meta.options?.[c.index]}
                            readOnly={MEMBER_READONLY.has(c.label.trim().toUpperCase())}
                      format={isCpLabel(c.label)}
                      dataTab={equipTab.meta.title}
                      dataCol={c.index}
                      onCommit={(v) => commit(equipTab, equipRow.row, c.index, v)}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                )}
              </div>
            </div>
          )}

          {!isDashboard && activeTab && (
            <div className="panel-card">
              <h3>{tabText(activeTab.meta.title)}</h3>

              {!row && (
                <div className="empty">
                  <div className="big">
                    <IconGrid />
                  </div>
                  {t('member.noRowTab')}
                </div>
              )}

              {row && activeTab.meta.headerRows === 1 && (
                <div className="field-grid">
                  {cols.slice(1).map((c) => (
                    <Field
                      key={c.index}
                      label={colLabel(c.label, t, lang)}
                      value={row.cells[c.index] ?? ''}
                      options={activeTab.meta.options?.[c.index]}
                      readOnly={MEMBER_READONLY.has(c.label.trim().toUpperCase())}
                      format={isCpLabel(c.label)}
                      dataTab={activeTab.meta.title}
                      dataCol={c.index}
                      onCommit={(v) => commit(activeTab, row.row, c.index, v)}
                    />
                  ))}
                </div>
              )}

              {row && activeTab.meta.headerRows === 2 && (
                <div className="coll-grid">
                  {collectionGroups.map((g) => (
                    <section className="coll-card" key={g.label}>
                      <div className="coll-card-title">{colLabel(g.label, t, lang)}</div>
                      <div className="coll-items">
                        {g.cols.map((c) => {
                          const sub = colLabel(
                            (activeTab.meta.headers[1]?.[c.index] || '').trim() || c.label,
                            t,
                            lang,
                          );
                          return (
                            <div
                              className="coll-item"
                              key={c.index}
                              data-tab={activeTab.meta.title}
                              data-col={c.index}
                            >
                              <span className="coll-sub">{sub}</span>
                              <CollectionCell
                                value={row.cells[c.index] ?? ''}
                                options={activeTab.meta.options?.[c.index]}
                                onCommit={(v) => commit(activeTab, row.row, c.index, v)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {settingsOpen && (
        <MemberSettingsModal
          session={session}
          onClose={() => setSettingsOpen(false)}
          onSessionChange={onSessionChange}
          toast={toast}
        />
      )}
    </div>
  );
}
