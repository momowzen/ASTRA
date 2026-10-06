import { useEffect, useMemo, useRef, useState } from 'react';
import { MEMBER_HIDDEN_TABS } from '../types';
import type { Column, DataResponse, Session, TabData } from '../types';
import { buildColumns, formatCp, initials, isCpLabel, isMark, optionColor } from '../utils';
import { ApiError, saveCells } from '../api';
import { IconClose, IconGear, IconGrid, IconLogout, IconMenu } from './icons';
import PasswordModal from './PasswordModal';
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
}

function prettyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\+12/g, '+12')
    .replace(/\bof\b/gi, 'of');
}

const MEMBER_READONLY = new Set(['CP', 'ROLE', 'STATUS']);

function Field({
  label,
  value,
  options,
  readOnly,
  format,
  onCommit,
}: {
  label: string;
  value: string;
  options?: string[];
  readOnly?: boolean;
  format?: boolean;
  onCommit: (value: string) => Promise<void>;
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
      <div className="field">
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
    <div className="field">
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
}: Props) {
  const [activeTitle, setActiveTitle] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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
    setMenuOpen(false);
  }

  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>('.main-tab.active');
    el?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [activeTitle]);

  const activeTab = memberTabs.find((t) => t.meta.title === activeTitle);
  const isDashboard = !activeTab;

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
          onClick={() => setActiveTitle('')}
        >
          <span className="ico">
            <IconGrid />
          </span>
          {t('member.profile')}
        </button>
        {memberTabs.map((t) => (
          <button
            key={t.meta.title}
            className={`nav-item ${t.meta.title === activeTitle ? 'active' : ''}`}
            onClick={() => setActiveTitle(t.meta.title)}
          >
            <span className="ico">
              <IconGrid />
            </span>
            {tabText(t.meta.title)}
          </button>
        ))}

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
              {isDashboard ? t('member.profile') : activeTab ? tabText(activeTab.meta.title) : t('member.loading')}
            </span>
            <span className="topbar-brand">ASTRA</span>
          </h2>
          <div className="grow" />
          <span className={`live ${live === 'live' ? '' : live}`}>
            <span className="dot" />
            <span className="live-text">{liveNote}</span>
          </span>
          <LangToggle />
          <nav className="main-tabs" ref={stripRef}>
            <button className={`main-tab ${isDashboard ? 'active' : ''}`} onClick={() => selectTab('')}>
              {t('member.profile')}
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
          </nav>
        </header>

        <div className="content">
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
          </div>

          {isDashboard && rosterTab && (
            <div className="panel-card">
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
                      onCommit={(v) => commit(rosterTab, rosterRow.row, c.index, v)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {isDashboard && equipTab && (
            <div className="panel-card">
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
                      onCommit={(v) => commit(equipTab, equipRow.row, c.index, v)}
                    />
                  ))}
                </div>
              )}
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
                            <div className="coll-item" key={c.index}>
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
        <PasswordModal
          title={t('member.settingsTitle')}
          description={t('member.settingsDesc')}
          currentLabel={t('member.currentPassword')}
          onClose={() => setSettingsOpen(false)}
          onDone={() => toast(t('member.passwordUpdated'), 'ok')}
        />
      )}
    </div>
  );
}
