import { useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { Column, DataResponse, Session } from '../types';
import { buildColumns } from '../utils';
import { addRow as apiAddRow, deleteRow as apiDeleteRow, saveCells, ApiError } from '../api';
import { IconGear, IconGrid, IconLogout, IconPlus, IconSearch, IconTrash } from './icons';
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

function EditableCell({
  initial,
  options,
  onCommit,
  onCancel,
}: {
  initial: string;
  options?: string[];
  onCommit: (value: string) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [val, setVal] = useState(initial);
  const ref = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const closing = useRef(false);

  useEffect(() => {
    ref.current?.focus();
    if (ref.current instanceof HTMLInputElement) ref.current.select();
  }, []);

  async function commit() {
    if (closing.current) return;
    closing.current = true;
    const ok = await onCommit(val);
    if (!ok) closing.current = false;
  }

  if (options) {
    const list = options.includes(val) ? options : [val, ...options];
    return (
      <select
        ref={ref as RefObject<HTMLSelectElement>}
        className="cell-input"
        value={val}
        onChange={(e) => {
          const next = e.target.value;
          setVal(next);
          closing.current = true;
          void onCommit(next).then((ok) => {
            if (!ok) {
              closing.current = false;
              setVal(initial);
            }
          });
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            closing.current = true;
            e.preventDefault();
            onCancel();
          }
          e.stopPropagation();
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <option value="">—</option>
        {list
          .filter((o) => o !== '')
          .map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
      </select>
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
  const [editing, setEditing] = useState<{ row: number; col: number } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const tab = data.tabs.find((t) => t.meta.title === activeTitle) || data.tabs[0];
  const allCols = useMemo(() => (tab ? buildColumns(tab.meta) : []), [tab]);
  const projecting = showCol >= 0;
  const cols = useMemo(
    () => (projecting ? allCols.filter((c) => c.index === 0 || c.index === showCol) : allCols),
    [allCols, showCol, projecting],
  );

  const rows = useMemo(() => {
    if (!tab) return [];
    const q = search.trim().toLowerCase();
    return tab.rows.filter((r) => !q || (r.cells[0] || '').toLowerCase().includes(q));
  }, [tab, search]);

  async function commitCell(row: number, col: number, value: string): Promise<boolean> {
    if (!tab) return false;
    setBusy(true);
    try {
      await saveCells(tab.meta.title, [{ row, col, value }]);
      onPatch(tab.meta.title, [{ row, col, value }]);
      setEditing(null);
      return true;
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not save the cell', 'err');
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
      toast(`Added ${cells[0]} to ${tab.meta.title}`, 'ok');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not add the row', 'err');
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
      toast('Row deleted', 'ok');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not delete the row', 'err');
    } finally {
      setBusy(false);
    }
  }

  const groupRuns: { label: string; span: number }[] = [];
  if (tab && tab.meta.headerRows === 2) {
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
              <linearGradient id="lg2" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#8b7cff" />
                <stop offset="1" stopColor="#f5b942" />
              </linearGradient>
            </defs>
            <rect width="64" height="64" rx="16" fill="#0a0e1a" stroke="#232c4a" />
            <path fill="url(#lg2)" d="M32 10l5.4 14.7L52 29.2 37.2 34.6 32 49l-5.2-14.4L12 29.2l14.6-4.5L32 10z" />
            <circle cx="47" cy="16" r="3" fill="#f5b942" />
          </svg>
          <div>
            <div className="name">ASTRA</div>
            <div className="tag">Admin</div>
          </div>
        </div>

        <div className="section-label">Sheet tabs</div>
        {data.tabs.map((t) => (
          <button
            key={t.meta.title}
            className={`nav-item ${t.meta.title === tab?.meta.title ? 'active' : ''}`}
            onClick={() => {
              setActiveTitle(t.meta.title);
              setEditing(null);
              setShowCol(-1);
            }}
          >
            <span className="ico">
              <IconGrid />
            </span>
            {t.meta.title}
          </button>
        ))}

        <div className="spacer" />
        <div className="userbox">
          <div className="section-label" style={{ paddingTop: 0 }}>
            Signed in as {session.username}
          </div>
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
          <h2>{tab?.meta.title ?? 'Loading…'}</h2>
          <div className="grow" />
          <div className="toolbar">
            <div className="search">
              <IconSearch />
              <input
                className="input"
                placeholder="Search IGN…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-filter">
              <select
                className="select"
                value={showCol}
                onChange={(e) => {
                  setShowCol(Number(e.target.value));
                  setEditing(null);
                }}
              >
                <option value={-1}>All columns</option>
                {allCols.map((c) => (
                  <option key={c.index} value={c.index}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            {(search || showCol >= 0) && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSearch('');
                  setShowCol(-1);
                }}
              >
                Clear
              </button>
            )}
            <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
              <IconPlus /> Add row
            </button>
            <span className={`live ${live === 'live' ? '' : live}`}>
              <span className="dot" />
              {liveNote}
            </span>
          </div>
        </header>

        <div className="content">
          <div className="table-card">
            <div className="table-meta">
              <span>
                <strong>{rows.length}</strong>
                {rows.length !== tab?.rows.length ? ` of ${tab?.rows.length}` : ''} member rows ·{' '}
                {projecting ? `showing ${cols.length} of ${allCols.length} columns` : `${cols.length} columns`}
              </span>
              <span className="muted">Click any cell to edit · changes save to the sheet instantly</span>
            </div>
            <div className="table-scroll">
              <table className="grid">
                <thead>
                  {tab && tab.meta.headerRows === 2 && !projecting ? (
                    <>
                      <tr className="groups">
                        <th className="rownum" rowSpan={2}>
                          #
                        </th>
                        <th className="ign-col" rowSpan={2}>
                          {cols[0]?.label}
                        </th>
                        {groupRuns.map((g, i) => (
                          <th key={i} colSpan={g.span}>
                            {g.label}
                          </th>
                        ))}
                        <th className="actions" rowSpan={2} />
                      </tr>
                      <tr className="labels">
                        {cols.slice(1).map((c) => (
                          <th key={c.index}>{c.label}</th>
                        ))}
                      </tr>
                    </>
                  ) : (
                    <tr className="labels single">
                      <th className="rownum">#</th>
                      <th className="ign-col">{cols[0]?.label ?? 'IGN'}</th>
                      {cols.slice(1).map((c) => (
                        <th key={c.index}>{c.label}</th>
                      ))}
                      <th className="actions" />
                    </tr>
                  )}
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.row}>
                      <td className="rownum">{r.row}</td>
                      {cols.map((c) => {
                        const isEditing = editing?.row === r.row && editing?.col === c.index;
                        const value = r.cells[c.index] ?? '';
                        return (
                          <td
                            key={c.index}
                            className={c.index === 0 ? 'ign-col' : ''}
                            onClick={() => !busy && setEditing({ row: r.row, col: c.index })}
                          >
                            {isEditing ? (
                              <EditableCell
                                initial={value}
                                options={tab.meta.options?.[c.index]}
                                onCommit={(v) => commitCell(r.row, c.index, v)}
                                onCancel={() => setEditing(null)}
                              />
                            ) : (
                              <div className="cell" title={value}>
                                {value || <span className="muted">—</span>}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="actions">
                        <button
                          className="icon-btn"
                          title="Delete row"
                          onClick={() => setConfirmDelete(r.row)}
                        >
                          <IconTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={cols.length + 2}>
                        <div className="empty">
                          <div className="big">
                            <IconGrid />
                          </div>
                          No rows match your filters.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
            <h3>Delete row {confirmDelete}?</h3>
            <p className="desc">
              This removes the row from “{tab.meta.title}” in the Google Sheet. This cannot be undone.
            </p>
            <div className="row">
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" disabled={busy} onClick={() => void handleDelete()}>
                {busy ? <span className="spinner" /> : 'Delete row'}
              </button>
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <PasswordModal
          title="Admin settings"
          description="Change the admin password. It is stored (hashed) in the hidden credentials tab of the spreadsheet."
          currentLabel="Current admin password"
          onClose={() => setSettingsOpen(false)}
          onDone={() => toast('Admin password updated', 'ok')}
        />
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
  const [values, setValues] = useState<string[]>(() => columns.map(() => ''));

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal wide">
        <h3>Add row</h3>
        <p className="desc">
          The first column (IGN) is required and must be unique. Leave the rest empty to fill in
          later.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onSubmit(values);
          }}
        >
          <div className="form-grid">
            {columns.map((col, i) => {
              const opts = options?.[col.index];
              return (
                <div className="field" key={i}>
                  <label>
                    {col.label}
                    {i === 0 ? ' *' : ''}
                  </label>
                  {opts ? (
                    <select
                      className="select"
                      value={values[i] ?? ''}
                      autoFocus={i === 0}
                      onChange={(e) =>
                        setValues((prev) => {
                          const next = [...prev];
                          next[i] = e.target.value;
                          return next;
                        })
                      }
                    >
                      <option value="">—</option>
                      {opts.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
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
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? <span className="spinner" /> : 'Add row'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
