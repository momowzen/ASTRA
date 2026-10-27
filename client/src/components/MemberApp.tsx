import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MEMBER_HIDDEN_TABS } from '../types';
import type { Column, DataResponse, RosterMember, Session, TabData } from '../types';
import { buildColumns, formatCp, isCpLabel, isDateLabel, isMark, MEMBER_ALWAYS_EDITABLE, MEMBER_READONLY, optionColor, timeInGuildParts, toIsoDate } from '../utils';
import { ApiError, apiBase, saveCells } from '../api';
import { IconBulb, IconClose, IconGear, IconGem, IconGrid, IconLogout, IconMenu, IconMusic, IconSheet, IconSparkles, IconTimer, IconTrophy, IconUser, IconUsers } from './icons';
import Avatar from './Avatar';
import MemberSettingsModal from './MemberSettingsModal';
import ProfileProgress from './ProfileProgress';
import AttendancePodium from './AttendancePodium';
import RosterProfileCard from './RosterProfileCard';
import MediaMusic from './MediaMusic';
import { DatePicker, Select } from './Dropdown';
import { LangToggle, useLang } from '../i18n';
import { colLabel, memberColIsLong, memberColLabel, memberColValueLabel, tabLabel, valueLabel } from '../display';

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
  { key: 'status', label: 'STATUS' },
  { key: 'guild', label: 'GUILD' },
  { key: 'cp', label: 'CP' },
] as const;

const ROSTER_FILTER_COLS = ROSTER_COLS.filter((c) => c.key !== 'ign');

const COLLECTION_TABS = new Set([
  'BOSS COLLECTION',
  'SUCCESSOR COLLECTION',
  'EPIC +12 ACCESSORY COLLECTION',
  'CLOAK COLLECTION',
]);

type ToolView = 'attendance' | 'tracker' | 'hidden' | 'relic';

interface AstraToolsApi {
  onStatusChange: ((on: boolean) => void) | null;
  onAlarmChange: ((on: boolean) => void) | null;
  apiBase: string;
  setPage: (page: string) => void;
  setLang: (lang: string) => void;
  toggleAlarm: () => void;
  alarmOn: () => boolean;
}

/**
 * Shrinks its font size until the text fits the available width on one line.
 * Used for long member-facing column labels such as the equipment questions.
 */
function FitLabel({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = document.createElement('canvas').getContext('2d');

    const fit = () => {
      el.style.fontSize = '';
      if (!ctx) return;
      const style = getComputedStyle(el);
      const base = parseFloat(style.fontSize) || 12;
      const available = el.clientWidth;
      if (available <= 0) return;
      ctx.font = `${style.fontStyle} ${style.fontWeight} ${base}px ${style.fontFamily}`;
      const sample = style.textTransform === 'uppercase' ? text.toUpperCase() : text;
      const spacing = (parseFloat(style.letterSpacing) || 0) * sample.length;
      const width = ctx.measureText(sample).width + spacing;
      if (width > available) {
        const next = Math.max(7, Math.floor((base * available) / width * 10) / 10);
        el.style.fontSize = `${next}px`;
      }
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  return (
    <span ref={ref} className={`fit-label${className ? ` ${className}` : ''}`} title={text}>
      {text}
    </span>
  );
}

function Field({
  label,
  rawLabel,
  value,
  options,
  readOnly,
  format,
  isDate,
  onCommit,
  dataTab,
  dataCol,
}: {
  label: string;
  rawLabel?: string;
  value: string;
  options?: string[];
  readOnly?: boolean;
  format?: boolean;
  isDate?: boolean;
  onCommit: (value: string) => Promise<void>;
  dataTab?: string;
  dataCol?: number;
}) {
  const { t, lang } = useLang();
  const [val, setVal] = useState(() => (format ? formatCp(value) : value));
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);
  const focused = useRef(false);
  const longLabel = memberColIsLong(rawLabel ?? '');
  const fieldCls = longLabel ? 'field field-question' : 'field';

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

  async function commitDate(next: string) {
    if (next === toIsoDate(value)) return;
    setStatus('saving');
    try {
      await onCommit(next);
      setStatus('saved');
      setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 1800);
    } catch {
      setStatus('error');
    }
  }

  if (readOnly) {
    const shown = format
      ? formatCp(value)
      : options
        ? memberColValueLabel(value, rawLabel ?? '', t, lang)
        : value;
    return (
      <div className={fieldCls} data-tab={dataTab} data-col={dataCol}>
        <label>
          {longLabel ? <FitLabel text={label} className="question-text" /> : <FitLabel text={label} />}
        </label>
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
    <div className={fieldCls} data-tab={dataTab} data-col={dataCol}>
      <label className="label-row">
        {longLabel ? <FitLabel text={label} className="question-text" /> : <FitLabel text={label} />}
        <span
          className={`save-note ${status === 'saved' ? 'ok' : status === 'error' ? 'err' : ''}`}
        >
          {status === 'saving' && t('common.saving')}
          {status === 'saved' && t('common.saved')}
          {status === 'error' && t('common.failed')}
        </span>
      </label>
      {isDate ? (
        <DatePicker
          value={toIsoDate(value)}
          onChange={(iso) => void commitDate(iso)}
        />
      ) : options ? (
        <Select
          value={val}
          onChange={(next) => {
            setVal(next);
            void commitValue(next);
          }}
          options={optionList.map((o) => ({
            value: o,
            label: memberColValueLabel(o, rawLabel ?? '', t, lang),
            color: optionColor(o),
          }))}
        />
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
  readOnly,
  onCommit,
}: {
  value: string;
  options?: string[];
  readOnly?: boolean;
  onCommit: (value: string) => Promise<void>;
}) {
  const { t, lang } = useLang();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const empty = value.trim() === '';
  const mark = isMark(value);

  if (readOnly) {
    return (
      <span className="cell-text" style={{ color: optionColor(value) }}>
        {empty ? '—' : mark ? '✓' : valueLabel(value, t, lang)}
      </span>
    );
  }

  if (options) {
    const list = (options.includes(value) ? options : [value, ...options]).filter((o) => o !== '');
    return (
      <Select
        variant="coll"
        value={value}
        onChange={(v) => void onCommit(v).catch(() => {})}
        options={list.map((o) => ({ value: o, label: valueLabel(o, t, lang), color: optionColor(o) }))}
      />
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
      {valueLabel(value, t, lang)}
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
  const [mediaView, setMediaView] = useState<'music' | null>(null);
  const [musicVisited, setMusicVisited] = useState(false);
  const [musicBackground, setMusicBackground] = useState(() => {
    try {
      return localStorage.getItem('astra.music.background') === '1';
    } catch {
      return false;
    }
  });
  const [nowPlaying, setNowPlaying] = useState<{ title: string; artist: string; playing: boolean } | null>(null);
  const [toolsOnline, setToolsOnline] = useState(true);
  const [toolsAlarm, setToolsAlarm] = useState(false);
  const [profileMember, setProfileMember] = useState<RosterMember | null>(null);
  const toolsFrameRef = useRef<HTMLIFrameElement>(null);
  const toolsCursorCleanupRef = useRef<(() => void) | null>(null);
  const [avatarOverride, setAvatarOverride] = useState<string | null | undefined>(undefined);

  const { t, lang } = useLang();
  const canEdit = data.memberEdit !== false;
  const tabText = (raw: string) => tabLabel(raw, t, lang, prettyTitle);
  const avatarKey = session.ign.trim().toLowerCase();
  const ownAvatar = avatarOverride === undefined ? (data.avatars?.[avatarKey] ?? '') : (avatarOverride ?? '');

  const guildDuration = (value: string): string => {
    const p = timeInGuildParts(value);
    if (!p) return '';
    if (p.n === 0) return t('time.today');
    return t(`time.${p.unit}${p.n === 1 ? '' : 's'}`, { n: p.n });
  };

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
    setMediaView(null);
    setMenuOpen(false);
  }

  function showRoster() {
    setRosterView(true);
    setActiveTitle('');
    setToolsView(null);
    setMediaView(null);
    setRosterCol(-1);
    setRosterVal('');
    setMenuOpen(false);
  }

  function showTool(tool: ToolView) {
    setToolsView(tool);
    setActiveTitle('');
    setRosterView(false);
    setMediaView(null);
    setMenuOpen(false);
  }

  function showMedia(view: 'music') {
    setMediaView(view);
    setMusicVisited(true);
    setActiveTitle('');
    setRosterView(false);
    setToolsView(null);
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

  const mapLang = (l: string) => (l === 'ko' || l === 'ja' || l === 'zh' ? l : 'en');
  const viewerTool = toolsView === 'tracker' || toolsView === 'hidden' || toolsView === 'relic';
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
    if (viewerTool && toolsView) api.setPage(toolsView);

    // The astral pointer lives in the parent document. Forward pointer events
    // from the tools iframe so the halo/trail keeps working over its panel.
    const frame = toolsFrameRef.current;
    const win = frame?.contentWindow;
    if (frame && win) {
      toolsCursorCleanupRef.current?.();
      const forward = (type: 'pointermove' | 'pointerdown') => (e: PointerEvent) => {
        const rect = frame.getBoundingClientRect();
        window.dispatchEvent(
          new PointerEvent(type, {
            clientX: rect.left + e.clientX,
            clientY: rect.top + e.clientY,
            pointerId: e.pointerId,
            pointerType: e.pointerType,
            isPrimary: e.isPrimary,
          }),
        );
      };
      const onMove = forward('pointermove');
      const onDown = forward('pointerdown');
      win.addEventListener('pointermove', onMove, { passive: true });
      win.addEventListener('pointerdown', onDown, { passive: true });
      toolsCursorCleanupRef.current = () => {
        win.removeEventListener('pointermove', onMove);
        win.removeEventListener('pointerdown', onDown);
      };
    }
  }

  useEffect(() => () => toolsCursorCleanupRef.current?.(), []);

  useEffect(() => {
    if (viewerTool && toolsView) toolsApi()?.setPage(toolsView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolsView]);

  useEffect(() => {
    toolsApi()?.setLang(mapLang(lang));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    try {
      localStorage.setItem('astra.music.background', musicBackground ? '1' : '0');
    } catch {
      // Storage is optional.
    }
  }, [musicBackground]);

  const activeTab = memberTabs.find((t) => t.meta.title === activeTitle);
  const isDashboard = !activeTab && !rosterView && !toolsView && !mediaView;

  const myRow = useMemo(() => {
    const ign = session.ign.trim().toLowerCase();
    return (tab?: TabData) => tab?.rows.find((r) => (r.cells[0] || '').trim().toLowerCase() === ign);
  }, [session.ign]);

  const rosterRow = myRow(rosterTab);
  const equipRow = myRow(equipTab);
  const rosterCols = rosterTab ? buildColumns(rosterTab.meta) : [];
  const equipCols = equipTab ? buildColumns(equipTab.meta) : [];
  const rosterJoinedIdx = rosterCols.find((c) => /date\s*joined/i.test(c.label))?.index ?? -1;

  const profileBadges = useMemo(() => {
    if (!rosterTab || !rosterRow) return [] as { label: string; cls: string }[];
    const cols = buildColumns(rosterTab.meta);
    const out: { label: string; cls: string }[] = [];
    for (const label of ['ROLE', 'CP', 'GUILD']) {
      const c = cols.find((col) => col.label.trim().toUpperCase() === label);
      if (!c) continue;
      const v = (rosterRow.cells[c.index] || '').trim();
      if (!v) continue;
      out.push({ label: label === 'CP' ? formatCp(v) : valueLabel(v, t, lang), cls: label === 'CP' ? 'gold' : 'violet' });
    }
    return out;
  }, [rosterTab, rosterRow, t, lang]);

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
  const showCollectionTip = !!activeTab && COLLECTION_TABS.has(activeTab.meta.title.trim().toUpperCase());
  const collectionGroups: { label: string; cols: Column[] }[] = [];
  if (activeTab && activeTab.meta.headerRows === 2) {
    for (const c of cols.slice(1)) {
      const last = collectionGroups[collectionGroups.length - 1];
      if (last && last.label === c.group) last.cols.push(c);
      else collectionGroups.push({ label: c.group, cols: [c] });
    }
  }

  const rosterMembers = data.roster ?? [];
  const profileTabs = useMemo(
    () => data.tabs.filter((tab) => !MEMBER_HIDDEN_TABS.includes(tab.meta.title.toUpperCase())),
    [data.tabs],
  );
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

  const leaderboard = data.leaderboard ?? [];
  const lbTop = leaderboard[0]?.points ?? 0;
  const lbThreshold = lbTop > 0 ? Math.max(1, Math.round(lbTop * 0.3)) : 0;
  const inBand = (p: number) => lbThreshold > 0 && p >= lbThreshold;
  const myPoints = leaderboard.find((x) => x.ign.trim().toLowerCase() === session.ign.trim().toLowerCase())?.points ?? 0;
  const myRankIndex = leaderboard.findIndex((x) => x.ign.trim().toLowerCase() === session.ign.trim().toLowerCase());

  const liveState = viewerTool ? (toolsOnline ? 'live' : 'error') : live;
  const liveText = viewerTool ? (toolsOnline ? t('app.live') : t('app.offline')) : liveNote;

  return (
    <div className="shell shell-member">
      <aside
        className={menuOpen ? 'sidebar open' : 'sidebar'}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('.nav-item')) setMenuOpen(false);
        }}
      >
        <div className="brand">
          <span className="brand-crest">
            <img className="mark" src="./assets/logo.webp" alt="" />
          </span>
          <div className="brand-text">
            <div className="name">ASTRA</div>
            <div className="tag">{t('member.tag')}</div>
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

        <div className="section-label">{t('member.myProfile')}</div>
        <button
          className={`nav-item ${isDashboard ? 'active' : ''}`}
          onClick={() => selectTab('')}
          title={t('member.profile')}
        >
          <span className="ico">
            <IconUser />
          </span>
          {t('member.profile')}
        </button>
        {memberTabs.map((t) => (
          <button
            key={t.meta.title}
            className={`nav-item ${t.meta.title === activeTitle ? 'active' : ''}`}
            onClick={() => selectTab(t.meta.title)}
            title={tabText(t.meta.title)}
          >
            <span className="ico">
              <IconSheet />
            </span>
            {tabText(t.meta.title)}
          </button>
        ))}

        <div className="section-label">{t('member.tools')}</div>
        <button className={`nav-item ${rosterView ? 'active' : ''}`} onClick={showRoster} title={t('member.roster')}>
          <span className="ico">
            <IconUsers />
          </span>
          {t('member.roster')}
        </button>
        <button
          className={`nav-item ${toolsView === 'attendance' ? 'active' : ''}`}
          onClick={() => showTool('attendance')}
          title={t('member.toolAttendance')}
        >
          <span className="ico">
            <IconTrophy />
          </span>
          {t('member.toolAttendance')}
        </button>
        <button
          className={`nav-item ${toolsView === 'tracker' ? 'active' : ''}`}
          onClick={() => showTool('tracker')}
          title={t('member.toolBossTracker')}
        >
          <span className="ico">
            <IconTimer />
          </span>
          {t('member.toolBossTracker')}
        </button>
        <button
          className={`nav-item ${toolsView === 'hidden' ? 'active' : ''}`}
          onClick={() => showTool('hidden')}
          title={t('member.toolHiddenClass')}
        >
          <span className="ico">
            <IconSparkles />
          </span>
          {t('member.toolHiddenClass')}
        </button>
        <button
          className={`nav-item ${toolsView === 'relic' ? 'active' : ''}`}
          onClick={() => showTool('relic')}
          title={t('member.toolRelic')}
        >
          <span className="ico">
            <IconGem />
          </span>
          {t('member.toolRelic')}
        </button>

        <div className="section-label">{t('member.media')}</div>
        <button
          className={`nav-item ${mediaView === 'music' ? 'active' : ''}`}
          onClick={() => showMedia('music')}
          title={t('member.music')}
        >
          <span className="ico">
            <IconMusic />
          </span>
          {t('member.music')}
        </button>

        <div className="spacer" />
        <div className="userbox">
          <button className="nav-item" onClick={() => setSettingsOpen(true)} title={t('common.settings')}>
            <span className="ico">
              <IconGear />
            </span>
            {t('common.settings')}
          </button>
          <button className="nav-item" onClick={onLogout} title={t('common.signOut')}>
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
            <span className="topbar-brand">
              <img className="topbar-logo" src="./assets/logo.webp" alt="" />
              ASTRA
            </span>
          </div>
          <div className="grow" />
          {mediaView !== 'music' && musicBackground && nowPlaying?.playing && (
            <button
              type="button"
              className="topbar-now-playing"
              aria-label={`${t('media.nowPlaying')}: ${nowPlaying.title}`}
              title={`${t('media.nowPlaying')}: ${nowPlaying.title}${nowPlaying.artist ? ` — ${nowPlaying.artist}` : ''}`}
              onClick={() => showMedia('music')}
            >
              <span className="topbar-now-playing-eq" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <span className="topbar-now-playing-copy">
                <span className="topbar-now-playing-label">{t('media.nowPlaying')}:</span>
                <strong>{nowPlaying.title}</strong>
              </span>
            </button>
          )}
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
        </header>

        <div className="content">
          {isDashboard && (
            <div className="profile-hero">
              <div className="hero-sigil">
                <Avatar ign={session.ign} src={ownAvatar} className="avatar" alt={session.ign} />
                <span className="hero-sigil-ring" aria-hidden="true" />
              </div>
              <div className="id">
                <span className="hero-kicker">{t('member.profile')}</span>
                <h1>{session.ign}</h1>
                <div className="badges">
                  {profileBadges.map((b, i) => (
                    <span key={i} className={`badge ${b.cls}`}>
                      {b.label}
                    </span>
                  ))}
                  {!rosterRow && (
                    <span className="badge badge-accent">
                      {t('member.notOnRoster')}
                    </span>
                  )}
                </div>
              </div>
              <div className="hero-stats">
                <div className="hero-stat">
                  <span>{t('member.rank')}</span>
                  <strong>{myRankIndex >= 0 ? (myRankIndex + 1).toLocaleString('en-US') : '—'}</strong>
                </div>
                <div className="hero-stat">
                  <span>{t('boss.points')}</span>
                  <strong>{myPoints.toLocaleString('en-US')}</strong>
                </div>
              </div>
              <ProfileProgress tabs={profileTabs} ign={session.ign} tabText={tabText} onJump={jumpToField} />
            </div>
          )}

          {viewerTool && (
            <iframe
              ref={toolsFrameRef}
              className="tools-frame"
              src="./tools/index.html"
              title={t('member.tools')}
              allow="autoplay"
              onLoad={onToolsLoad}
            />
          )}

          {toolsView === 'attendance' && (
            <div className="panel-card attendance-board">
              <div className="panel-head">
                <div>
                  <h3>{t('member.topContributors')}</h3>
                </div>
              </div>
              <AttendancePodium entries={leaderboard} avatars={data.avatars} />
              <div className="table-scroll attendance-ranking-list">
                <table className="grid">
                  <thead>
                    <tr className="labels single">
                      <th className="rownum">#</th>
                      <th className="ign-col">IGN</th>
                      <th>{t('boss.points')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((x, i) => {
                      const mark = inBand(x.points);
                      const cellCls = mark ? 'cell top-cell' : 'cell';
                      return (
                        <tr key={x.ign}>
                          <td className={`rownum ${i < 3 ? `rank-${i + 1}` : ''}`}>{i + 1}</td>
                          <td className="ign-col">
                            <div className={cellCls} title={mark ? t('boss.top30') : undefined}>
                              <Avatar
                                ign={x.ign}
                                src={data.avatars?.[x.ign.trim().toLowerCase()]}
                                className="mini-avatar"
                              />
                              {x.ign}
                            </div>
                          </td>
                          <td>
                            <div className={cellCls}>{x.points}</div>
                          </td>
                        </tr>
                      );
                    })}
                    {leaderboard.length === 0 && (
                      <tr>
                        <td colSpan={3}>
                          <div className="empty">{t('boss.noAttendance')}</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(mediaView === 'music' || (musicBackground && musicVisited)) && (
            <MediaMusic
              active={mediaView === 'music'}
              backgroundPlay={musicBackground}
              onBackgroundChange={setMusicBackground}
              onNowPlayingChange={setNowPlaying}
            />
          )}

          {rosterView && (
            <div className="panel-card roster-panel">
              <div className="table-meta roster-filter">
                <div>
                  <h3>{t('member.roster')}</h3>
                </div>
                <div className="table-meta-right">
                  <Select
                    value={String(rosterCol)}
                    onChange={(v) => {
                      setRosterCol(Number(v));
                      setRosterVal('');
                    }}
                    clearable={false}
                    align="right"
                    options={[
                      { value: '-1', label: t('admin.allColumns') },
                      ...ROSTER_FILTER_COLS.map((c, i) => ({ value: String(i), label: colLabel(c.label, t, lang) })),
                    ]}
                  />
                  {rosterCol >= 0 && (
                    <Select
                      value={rosterVal}
                      onChange={(v) => setRosterVal(v)}
                      clearable={false}
                      align="right"
                      options={[
                        { value: '', label: t('admin.allValues') },
                        ...rosterChoices.map((v) => ({ value: v, label: valueLabel(v, t, lang) })),
                      ]}
                    />
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
                    {rosterRows.map((m, i) => (
                      <tr key={m.ign}>
                        <td className="ign-col">
                          <div
                            className="cell roster-name roster-ign-click"
                            role="button"
                            tabIndex={0}
                            title={t('member.viewProfile')}
                            onClick={() => setProfileMember(m)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setProfileMember(m);
                              }
                            }}
                          >
                            <Avatar
                              ign={m.ign}
                              src={data.avatars?.[m.ign.trim().toLowerCase()]}
                              className="mini-avatar"
                            />
                            {m.ign}
                          </div>
                        </td>
                        <td>
                          <div className="cell" style={{ color: optionColor(m.role) }}>
                            {m.role ? valueLabel(m.role, t, lang) : '—'}
                          </div>
                        </td>
                        <td>
                          <div className="cell" style={{ color: optionColor(m.status) }}>
                            {m.status ? valueLabel(m.status, t, lang) : '—'}
                          </div>
                        </td>
                        <td>
                          <div className="cell" style={{ color: optionColor(m.guild) }}>
                            {m.guild ? valueLabel(m.guild, t, lang) : '—'}
                          </div>
                        </td>
                        <td>
                          <div className="cell cp-value">{m.cp ? formatCp(m.cp) : '—'}</div>
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
            <div className="profile-sections">
              {rosterTab && (
                <section className="panel-card profile-section">
                  <div className="panel-head">
                    <div>
                      <h3>{tabText('BASIC INFORMATION')}</h3>
                    </div>
                  </div>
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
                          label={memberColLabel(c.label, t, lang)}
                          rawLabel={c.label}
                          value={rosterRow.cells[c.index] ?? ''}
                          options={rosterTab.meta.options?.[c.index]}
                          readOnly={
                            (!canEdit && !MEMBER_ALWAYS_EDITABLE.has(c.label.trim().toUpperCase())) ||
                            MEMBER_READONLY.has(c.label.trim().toUpperCase())
                          }
                          format={isCpLabel(c.label)}
                          isDate={isDateLabel(c.label)}
                          dataTab={rosterTab.meta.title}
                          dataCol={c.index}
                          onCommit={(v) => commit(rosterTab, rosterRow.row, c.index, v)}
                        />
                      ))}
                      {rosterJoinedIdx >= 0 && (
                        <div className="field">
                          <label>{t('col.timeInGuild')}</label>
                          <div className="field-ro" title={t('member.adminManaged')}>
                            {guildDuration(rosterRow.cells[rosterJoinedIdx] ?? '') || '—'}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}

              {equipTab && (
                <section className="panel-card profile-section">
                  <div className="panel-head">
                    <div>
                      <h3>{tabText('EQUIPMENT')}</h3>
                    </div>
                  </div>
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
                          label={memberColLabel(c.label, t, lang)}
                          rawLabel={c.label}
                          value={equipRow.cells[c.index] ?? ''}
                          options={equipTab.meta.options?.[c.index]}
                          readOnly={!canEdit || MEMBER_READONLY.has(c.label.trim().toUpperCase())}
                          format={isCpLabel(c.label)}
                          isDate={isDateLabel(c.label)}
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
          )}

          {!isDashboard && activeTab && (
            <div className="panel-card sheet-panel">
              <div className="panel-head">
                <div>
                  <h3>{tabText(activeTab.meta.title)}</h3>
                </div>
                {showCollectionTip && (
                  <div className="panel-tip">
                    <IconBulb />
                    <span>{t('member.collectionTip')}</span>
                  </div>
                )}
              </div>

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
                      label={memberColLabel(c.label, t, lang)}
                      rawLabel={c.label}
                      value={row.cells[c.index] ?? ''}
                      options={activeTab.meta.options?.[c.index]}
                      readOnly={!canEdit || MEMBER_READONLY.has(c.label.trim().toUpperCase())}
                      format={isCpLabel(c.label)}
                      isDate={isDateLabel(c.label)}
                      dataTab={activeTab.meta.title}
                      dataCol={c.index}
                      onCommit={(v) => commit(activeTab, row.row, c.index, v)}
                    />
                  ))}
                </div>
              )}

              {row && activeTab.meta.headerRows === 2 && (
                <div className={`coll-grid${activeTab.meta.title.trim().toUpperCase() === 'BOSS COLLECTION' ? ' coll-grid--boss' : ''}`}>
                  {collectionGroups.map((g) => (
                    <section className="coll-card" key={g.label}>
                      <div className="coll-card-title"><FitLabel text={colLabel(g.label, t, lang)} /></div>
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
                              <span className="coll-sub"><FitLabel text={sub} /></span>
                              <CollectionCell
                                value={row.cells[c.index] ?? ''}
                                options={activeTab.meta.options?.[c.index]}
                                readOnly={!canEdit}
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
          avatarUrl={ownAvatar}
          onAvatarUpdated={(url) => setAvatarOverride(url)}
        />
      )}

      {profileMember && (
        <RosterProfileCard
          member={profileMember}
          avatar={data.avatars?.[profileMember.ign.trim().toLowerCase()]}
          onClose={() => setProfileMember(null)}
        />
      )}
    </div>
  );
}
