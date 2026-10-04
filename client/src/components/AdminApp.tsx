import { useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { INTERNAL_TABS } from '../types';
import type { Column, DataResponse, Session } from '../types';
import { buildColumns, formatCp, isCpLabel, optionColor } from '../utils';
import { addRow as apiAddRow, deleteRow as apiDeleteRow, saveCells, ApiError } from '../api';
import { IconGear, IconGrid, IconLogout, IconPlus, IconSearch, IconTrash } from './icons';
import PasswordModal from './PasswordModal';
import BossTracker from './BossTracker';
import AdminTools from './AdminTools';
import CpUpdate from './CpUpdate';
import { LangToggle, useLang } from '../i18n';

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
  format,
  onCommit,
  onCancel,
}: {
  initial: string;
  options?: string[];
  format?: boolean;
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
    const ok = await onCommit(format ? formatCp(val) : val);
    if (!ok) closing.current = false;
  }

  if (options) {
    const list = options.includes(val) ? options : [val, ...options];
    return (
      <select
        ref={ref as RefObject<HTMLSelectElement>}
        className="cell-input"
        value={val}
        style={{ color: optionColor(val) }}
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
        <option value="" style={{ color: 'var(--muted)' }}>
          —
        </option>
        {list
          .filter((o) => o !== '')
          .map((o) => (
            <option key={o} value={o} style={{ color: optionColor(o) || 'var(--text)' }}>
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
  const [filterVal, setFilterVal] = useState('');
  const [bossView, setBossView] = useState<'dashboard' | 'attendance' | 'config' | null>(null);
  const [toolView, setToolView] = useState<'distribution' | 'cp-update' | null>(null);
  const [editing, setEditing] = useState<{ row: number; col: number } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const { t } = useLang();

  const tab = data.tabs.find((t) => t.meta.title === activeTitle) || data.tabs[0];
  const allCols = useMemo(() => (tab ? buildColumns(tab.meta) : []), [tab]);
  const projecting = showCol >= 0;
  const cols = useMemo(
    () => (projecting ? allCols.filter((c) => c.index === 0 || c.index === showCol) : allCols),
    [allCols, showCol, projecting],
  );

  // Distinct values of the column chosen in the first filter — choices for the
  // second (value) filter, in sheet order.
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
    return tab.rows.filter((r) => {
      if (q && !(r.cells[0] || '').toLowerCase().includes(q)) return false;
      if (showCol >= 0 && filterVal && (r.cells[showCol] ?? '').trim() !== filterVal) return false;
      return true;
    });
  }, [tab, search, showCol, filterVal]);

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
      toast(t('admin.addedRow', { ign: cells[0], title: tab.meta.title }), 'ok');
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
          <img className="mark" src="./assets/logo.png" alt="" />
          <div>
            <div className="name">ASTRA</div>
            <div className="tag">Admin</div>
          </div>
        </div>

        <div className="section-label">{t('admin.trackerSection')}</div>
        <button
          className={`nav-item nav-caps ${bossView === 'dashboard' ? 'active' : ''}`}
          onClick={() => {
            setBossView('dashboard');
            setToolView(null);
          }}
        >
          <span className="ico">
            <IconGrid />
          </span>
          {t('admin.dashboard')}
        </button>
        <button
          className={`nav-item nav-caps ${bossView === 'attendance' ? 'active' : ''}`}
          onClick={() => {
            setBossView('attendance');
            setToolView(null);
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
            setEditing(null);
            setShowCol(-1);
            setFilterVal('');
          }}
        >
          <span className="ico">
            <IconGear />
          </span>
          {t('tools.distribution')}
        </button>
        <button
          className={`nav-item nav-caps ${toolView === 'cp-update' ? 'active' : ''}`}
          onClick={() => {
            setToolView('cp-update');
            setBossView(null);
            setEditing(null);
            setShowCol(-1);
            setFilterVal('');
          }}
        >
          <span className="ico">
            <IconGrid />
          </span>
          {t('tools.cpUpdate')}
        </button>

        <div className="section-label">{t('admin.sheetTabs')}</div>
        <div className="tab-scroll">
          {data.tabs
            .filter((t) => !INTERNAL_TABS.includes(t.meta.title.toUpperCase()))
            .map((t) => (
              <button
                key={t.meta.title}
                className={`nav-item ${bossView === null && toolView === null && t.meta.title === tab?.meta.title ? 'active' : ''}`}
                onClick={() => {
                  setActiveTitle(t.meta.title);
                  setBossView(null);
                  setToolView(null);
                  setEditing(null);
                  setShowCol(-1);
                  setFilterVal('');
                }}
              >
                <span className="ico">
                  <IconGrid />
                </span>
                {t.meta.title}
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

      <main className="main">
        <header className="topbar">
          <h2>
            {bossView
              ? `${t('admin.bossTitle')} · ${
                  bossView === 'dashboard'
                    ? t('admin.dashboard')
                    : bossView === 'attendance'
                      ? t('admin.attendance')
                      : t('admin.bossConfig')
                }`
              : toolView
                ? `${t('tools.section')} · ${toolView === 'cp-update' ? t('tools.cpUpdate') : t('tools.distribution')}`
                : tab?.meta.title ?? t('member.loading')}
          </h2>
          <div className="grow" />
          {!bossView && !toolView && (
            <div className="toolbar">
              <div className="search">
                <IconSearch />
                <input
                  className="input"
                  placeholder={t('admin.searchPh')}
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
                    setFilterVal('');
                    setEditing(null);
                  }}
                >
                  <option value={-1}>{t('admin.allColumns')}</option>
                  {allCols.map((c) => (
                    <option key={c.index} value={c.index}>
                      {c.label}
                    </option>
                  ))}
                </select>
                {showCol >= 0 && (
                  <select
                    className="select val-filter"
                    title={t('admin.filterBy', { col: cols.find((c) => c.index === showCol)?.label ?? '' })}
                    value={filterVal}
                    onChange={(e) => {
                      setFilterVal(e.target.value);
                      setEditing(null);
                    }}
                  >
                    <option value="">{t('admin.allValues')}</option>
                    {filterChoices.map((v) => (
                      <option key={v} value={v} style={{ color: optionColor(v) || 'var(--text)' }}>
                        {v}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {(search || showCol >= 0 || filterVal) && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setSearch('');
                    setShowCol(-1);
                    setFilterVal('');
                  }}
                >
                  {t('admin.clear')}
                </button>
              )}
              <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
                <IconPlus /> {t('admin.addRow')}
              </button>
            </div>
          )}
          <span className={`live ${live === 'live' ? '' : live}`}>
            <span className="dot" />
            {liveNote}
          </span>
          <LangToggle />
        </header>

        <div className="content">
          {bossView ? (
            <BossTracker view={bossView} data={data} onPatch={onPatch} toast={toast} />
          ) : toolView ? (
            toolView === 'cp-update' ? (
              <CpUpdate data={data} toast={toast} />
            ) : (
              <AdminTools data={data} toast={toast} />
            )
          ) : (
            <div className="table-card">
            <div className="table-meta">
              <span>
                <strong>{rows.length}</strong>{' '}
                {rows.length !== tab?.rows.length
                  ? t('admin.memberRowsOf', { a: rows.length, b: tab?.rows.length })
                  : t('admin.memberRows', { a: rows.length })}{' '}
                ·{' '}
                {projecting
                  ? t('admin.showingCols', { a: cols.length, b: allCols.length })
                  : t('admin.columnsCount', { a: cols.length })}
              </span>
              <span className="muted">{t('admin.editHint')}</span>
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
                        const shown = isCpLabel(c.label) ? formatCp(value) : value;
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
                                format={isCpLabel(c.label)}
                                onCommit={(v) => commitCell(r.row, c.index, v)}
                                onCancel={() => setEditing(null)}
                              />
                            ) : (
                              <div className="cell" title={shown} style={{ color: optionColor(shown) }}>
                                {shown || <span className="muted">—</span>}
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
            <p className="desc">{t('admin.deleteRowDesc', { title: tab.meta.title })}</p>
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
        <PasswordModal
          title={t('admin.settingsTitle')}
          description={t('admin.settingsDesc')}
          currentLabel={t('admin.currentAdminPassword')}
          onClose={() => setSettingsOpen(false)}
          onDone={() => toast(t('admin.passwordUpdated'), 'ok')}
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
  const { t } = useLang();
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
                    {col.label}
                    {i === 0 ? ' *' : ''}
                  </label>
                  {opts ? (
                    <select
                      className="select"
                      value={values[i] ?? ''}
                      style={{ color: optionColor(values[i] ?? '') }}
                      autoFocus={i === 0}
                      onChange={(e) =>
                        setValues((prev) => {
                          const next = [...prev];
                          next[i] = e.target.value;
                          return next;
                        })
                      }
                    >
                      <option value="" style={{ color: 'var(--muted)' }}>
                        —
                      </option>
                      {opts.map((o) => (
                        <option key={o} value={o} style={{ color: optionColor(o) || 'var(--text)' }}>
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
