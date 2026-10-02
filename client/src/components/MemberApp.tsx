import { useEffect, useMemo, useRef, useState } from 'react';
import type { Column, DataResponse, Session, TabData } from '../types';
import { buildColumns, formatCp, initials, isCpLabel, isMark, optionColor } from '../utils';
import { ApiError, saveCells } from '../api';
import { IconGear, IconGrid, IconLogout } from './icons';
import PasswordModal from './PasswordModal';

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

const MEMBER_READONLY = new Set(['ROLE', 'STATUS']);

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
    return (
      <div className="field">
        <label>{label}</label>
        <div className="field-ro" title="Managed by an admin — members cannot change this">
          {value.trim() || '—'}
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
          {status === 'saving' && 'Saving…'}
          {status === 'saved' && 'Saved'}
          {status === 'error' && 'Failed'}
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
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const empty = value.trim() === '';
  const mark = isMark(value);

  if (options) {
    const list = (options.includes(value) ? options : [value, ...options]).filter((o) => o !== '');
    return (
      <select
        className={`coll-select${value ? ' has' : ''}`}
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
      <button className="cell-btn" title="Click to mark" onClick={() => void onCommit('o')}>
        ·
      </button>
    );
  }
  if (mark) {
    return (
      <button className="cell-btn on" title="Click to clear" onClick={() => void onCommit('')}>
        ✓
      </button>
    );
  }
  return (
    <span
      className="cell-text"
      title="Click to edit"
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

  const rosterTab =
    data.tabs.find((t) => t.meta.title.toUpperCase() === 'BASIC INFORMATION') ||
    data.tabs.find((t) => (t.meta.headers[0]?.[0] || '').trim().toUpperCase() === 'IGN');

  const equipTab = data.tabs.find((t) => t.meta.title.toUpperCase() === 'EQUIPMENTS');

  const DASHBOARD_TITLES = ['BASIC INFORMATION', 'EQUIPMENTS'];
  const memberTabs = data.tabs.filter(
    (t) =>
      !DASHBOARD_TITLES.includes(t.meta.title.toUpperCase()) &&
      (t.meta.headers[0] || []).some((h) => h.trim() !== ''),
  );

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
    for (const c of cols.slice(1)) {
      const v = (rosterRow.cells[c.index] || '').trim();
      if (!v) continue;
      const upper = c.label.toUpperCase();
      const cls = upper === 'CP' ? 'gold' : upper === 'STATUS' ? 'green' : 'violet';
      const shown = upper === 'CP' ? formatCp(v) : v;
      out.push({ label: shown, cls });
    }
    return out;
  }, [rosterTab, rosterRow]);

  async function commit(tab: TabData, row: number, col: number, value: string): Promise<void> {
    try {
      await saveCells(tab.meta.title, [{ row, col, value }]);
      onPatch(tab.meta.title, [{ row, col, value }]);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not save', 'err');
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
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <img className="mark" src="./assets/logo.png" alt="" />
          <div>
            <div className="name">ASTRA</div>
            <div className="tag">Member</div>
          </div>
        </div>

        <div className="section-label">My profile</div>
        <button
          className={`nav-item ${isDashboard ? 'active' : ''}`}
          onClick={() => setActiveTitle('')}
        >
          <span className="ico">
            <IconGrid />
          </span>
          Profile
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
            {prettyTitle(t.meta.title)}
          </button>
        ))}

        <div className="spacer" />
        <div className="userbox">
          <button className="nav-item" onClick={() => setSettingsOpen(true)}>
            <span className="ico">
              <IconGear />
            </span>
            Settings
          </button>
          <button className="nav-item" onClick={onLogout}>
            <span className="ico">
              <IconLogout />
            </span>
            Sign out
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <h2>{isDashboard ? 'Profile' : activeTab ? prettyTitle(activeTab.meta.title) : 'Loading…'}</h2>
          <div className="grow" />
          <span className={`live ${live === 'live' ? '' : live}`}>
            <span className="dot" />
            {liveNote}
          </span>
        </header>

        <div className="content">
          <div className="profile-hero">
            <div className="avatar">{initials(session.ign)}</div>
            <div className="id">
              <h1>{session.ign}</h1>
              <div className="badges">
                <span className="badge gold">Member</span>
                {profileBadges.map((b, i) => (
                  <span key={i} className={`badge ${b.cls}`}>
                    {b.label}
                  </span>
                ))}
                {!rosterRow && (
                  <span className="badge" style={{ color: 'var(--accent-2)' }}>
                    Not on the roster yet — ask an admin to add you
                  </span>
                )}
              </div>
            </div>
          </div>

          {isDashboard && rosterTab && (
            <div className="panel-card">
              <h3>Basic Information</h3>
              {!rosterRow ? (
                <div className="empty">
                  <div className="big">
                    <IconGrid />
                  </div>
                  You don’t have a row in your profile yet. An admin can add you.
                </div>
              ) : (
                <div className="field-grid">
                  {rosterCols.slice(1).map((c) => (
                    <Field
                      key={c.index}
                      label={c.label}
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
              <h3>Equipment</h3>
              {!equipRow ? (
                <div className="empty">
                  <div className="big">
                    <IconGrid />
                  </div>
                  You don’t have a row in your profile yet. An admin can add you.
                </div>
              ) : (
                <div className="field-grid">
                  {equipCols.slice(1).map((c) => (
                    <Field
                      key={c.index}
                      label={c.label}
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
              <h3>{prettyTitle(activeTab.meta.title)}</h3>

              {!row && (
                <div className="empty">
                  <div className="big">
                    <IconGrid />
                  </div>
                  You don’t have a row in this tab yet. An admin can add you.
                </div>
              )}

              {row && activeTab.meta.headerRows === 1 && (
                <div className="field-grid">
                  {cols.slice(1).map((c) => (
                    <Field
                      key={c.index}
                      label={c.label}
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
                      <div className="coll-card-title">{g.label}</div>
                      <div className="coll-items">
                        {g.cols.map((c) => {
                          const sub =
                            (activeTab.meta.headers[1]?.[c.index] || '').trim() || c.label;
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
          title="Profile settings"
          description="Change your password. Your initial password is your IGN."
          currentLabel="Current password"
          onClose={() => setSettingsOpen(false)}
          onDone={() => toast('Password updated', 'ok')}
        />
      )}
    </div>
  );
}
