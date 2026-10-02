import { useEffect, useMemo, useRef, useState } from 'react';
import type { DataResponse, Session, TabData } from '../types';
import { buildColumns, initials, isMark } from '../utils';
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

function Field({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string;
  onCommit: (value: string) => Promise<void>;
}) {
  const [val, setVal] = useState(value);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setVal(value);
  }, [value]);

  async function commit() {
    if (val === value) return;
    setStatus('saving');
    try {
      await onCommit(val);
      setStatus('saved');
      setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 1800);
    } catch {
      setStatus('error');
    }
  }

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
      <input
        ref={inputRef}
        className="input"
        value={val}
        onFocus={() => (focused.current = true)}
        onBlur={() => {
          focused.current = false;
          void commit();
        }}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') inputRef.current?.blur();
        }}
      />
    </div>
  );
}

function CollectionCell({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (value: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const empty = value.trim() === '';
  const mark = isMark(value);

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

  const currentTab =
    data.tabs.find((t) => t.meta.title === activeTitle) || rosterTab || data.tabs[0];

  const myRow = useMemo(() => {
    const ign = session.ign.trim().toLowerCase();
    return (tab?: TabData) => tab?.rows.find((r) => (r.cells[0] || '').trim().toLowerCase() === ign);
  }, [session.ign]);

  const rosterRow = myRow(rosterTab);

  const profileBadges = useMemo(() => {
    if (!rosterTab || !rosterRow) return [] as { label: string; cls: string }[];
    const cols = buildColumns(rosterTab.meta);
    const out: { label: string; cls: string }[] = [];
    for (const c of cols.slice(1)) {
      const v = (rosterRow.cells[c.index] || '').trim();
      if (!v) continue;
      const upper = c.label.toUpperCase();
      const cls = upper === 'CP' ? 'gold' : upper === 'STATUS' ? 'green' : 'violet';
      out.push({ label: `${c.label}: ${v}`, cls });
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

  const cols = currentTab ? buildColumns(currentTab.meta) : [];
  const row = myRow(currentTab);
  const groupRuns: { label: string; span: number }[] = [];
  if (currentTab && currentTab.meta.headerRows === 2) {
    for (let i = 1; i < cols.length; i++) {
      const g = cols[i].group;
      const last = groupRuns[groupRuns.length - 1];
      if (last && last.label === g) last.span += 1;
      else groupRuns.push({ label: g, span: 1 });
    }
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <svg className="mark" viewBox="0 0 64 64" aria-hidden>
            <defs>
              <linearGradient id="lg3" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#8b7cff" />
                <stop offset="1" stopColor="#f5b942" />
              </linearGradient>
            </defs>
            <rect width="64" height="64" rx="16" fill="#0a0e1a" stroke="#232c4a" />
            <path fill="url(#lg3)" d="M32 10l5.4 14.7L52 29.2 37.2 34.6 32 49l-5.2-14.4L12 29.2l14.6-4.5L32 10z" />
            <circle cx="47" cy="16" r="3" fill="#f5b942" />
          </svg>
          <div>
            <div className="name">ASTRA</div>
            <div className="tag">Member</div>
          </div>
        </div>

        <div className="section-label">My profile</div>
        {data.tabs.map((t) => (
          <button
            key={t.meta.title}
            className={`nav-item ${t.meta.title === currentTab?.meta.title ? 'active' : ''}`}
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
          <h2>{currentTab ? prettyTitle(currentTab.meta.title) : 'Loading…'}</h2>
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
                {profileBadges.map((b) => (
                  <span key={b.label} className={`badge ${b.cls}`}>
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

          <div className="section-chips">
            {data.tabs.map((t) => (
              <button
                key={t.meta.title}
                className={`chip ${t.meta.title === currentTab?.meta.title ? 'active' : ''}`}
                onClick={() => setActiveTitle(t.meta.title)}
              >
                {prettyTitle(t.meta.title)}
              </button>
            ))}
          </div>

          {currentTab && (
            <div className="panel-card">
              <h3>{prettyTitle(currentTab.meta.title)}</h3>
              <p className="desc">
                Your personal entry — edits are written straight to the guild spreadsheet. Your IGN
                cannot be changed here.
              </p>

              {!row && (
                <div className="empty">
                  <div className="big">
                    <IconGrid />
                  </div>
                  You don’t have a row in this tab yet. An admin can add you.
                </div>
              )}

              {row && currentTab.meta.headerRows === 1 && (
                <div className="field-grid">
                  {cols.slice(1).map((c) => (
                    <Field
                      key={c.index}
                      label={c.label}
                      value={row.cells[c.index] ?? ''}
                      onCommit={(v) => commit(currentTab, row.row, c.index, v)}
                    />
                  ))}
                </div>
              )}

              {row && currentTab.meta.headerRows === 2 && (
                <div className="coll-wrap">
                  <table className="coll">
                    <thead>
                      <tr className="groups">
                        <th className="ign-col" rowSpan={2}>
                          {cols[0]?.label}
                        </th>
                        {groupRuns.map((g, i) => (
                          <th key={i} colSpan={g.span}>
                            {g.label}
                          </th>
                        ))}
                      </tr>
                      <tr className="labels">
                        {cols.slice(1).map((c) => (
                          <th key={c.index}>{c.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="ign-col">{row.cells[0]}</td>
                        {cols.slice(1).map((c) => (
                          <td key={c.index}>
                            <CollectionCell
                              value={row.cells[c.index] ?? ''}
                              onCommit={(v) => commit(currentTab, row.row, c.index, v)}
                            />
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
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
