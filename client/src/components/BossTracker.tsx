import { useEffect, useMemo, useRef, useState } from 'react';
import type { DataResponse, TabData } from '../types';
import { BOSSES, respawnLabel } from '../bosses';
import { addRow, ApiError, saveCells, seedBossConfig } from '../api';

interface Props {
  view: 'dashboard' | 'attendance' | 'config';
  data: DataResponse;
  onPatch: (tabTitle: string, updates: { row: number; col: number; value: string }[]) => void;
  toast: (msg: string, kind?: 'ok' | 'err') => void;
}

function intPoints(value: string | undefined): number {
  const n = parseInt(value ?? '', 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export default function BossTracker({ view, data, onPatch, toast }: Props) {
  const attendanceTab = data.tabs.find((t) => t.meta.title.toUpperCase() === 'BOSS ATTENDANCE');
  const configTab = data.tabs.find((t) => t.meta.title.toUpperCase() === 'BOSS CONFIG');

  const configRows = useMemo(() => {
    const m = new Map<string, { row: number; points: number }>();
    for (const r of configTab?.rows ?? []) {
      const name = (r.cells[0] || '').trim();
      if (!name) continue;
      const p = parseInt(r.cells[1] ?? '', 10);
      m.set(name, { row: r.row, points: Number.isFinite(p) && p >= 0 ? p : 1 });
    }
    return m;
  }, [configTab]);

  const pointsFor = (name: string): number => configRows.get(name)?.points ?? 1;

  if (view === 'config') {
    return (
      <ConfigView
        configTab={configTab}
        configRows={configRows}
        onSave={async (name, points) => {
          const existing = configRows.get(name);
          try {
            if (existing) {
              await saveCells('BOSS CONFIG', [{ row: existing.row, col: 1, value: String(points) }]);
              onPatch('BOSS CONFIG', [{ row: existing.row, col: 1, value: String(points) }]);
            } else {
              await addRow('BOSS CONFIG', [name, String(points)]);
              toast(`Added ${name}`, 'ok');
            }
          } catch (err) {
            toast(err instanceof ApiError ? err.message : 'Could not save', 'err');
          }
        }}
        toast={toast}
      />
    );
  }

  if (view === 'attendance') {
    return (
      <AttendanceView
        data={data}
        attendanceTab={attendanceTab}
        pointsFor={pointsFor}
        onPatch={onPatch}
        toast={toast}
      />
    );
  }

  return <DashboardView attendanceTab={attendanceTab} />;
}

function ConfigView({
  configTab,
  configRows,
  onSave,
  toast,
}: {
  configTab: TabData | undefined;
  configRows: Map<string, { row: number; points: number }>;
  onSave: (name: string, points: number) => Promise<void>;
  toast: (msg: string, kind?: 'ok' | 'err') => void;
}) {
  const seeded = useRef(false);
  const [seeding, setSeeding] = useState(false);
  const empty = !configTab || configTab.rows.length === 0;

  useEffect(() => {
    if (empty && !seeded.current) {
      seeded.current = true;
      setSeeding(true);
      seedBossConfig()
        .catch((err) => toast(err instanceof ApiError ? err.message : 'Could not seed', 'err'))
        .finally(() => setSeeding(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empty]);

  if (empty) {
    return (
      <div className="boss-view">
        <div className="panel-card">
          <h3>Boss Config</h3>
          <div className="empty">
            <div className="big">
              <span className="spinner" />
            </div>
            {seeding
              ? 'Seeding the boss list…'
              : 'No bosses configured yet.'}
          </div>
          {!seeding && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  seeded.current = false;
                  setSeeding(true);
                  seedBossConfig()
                    .catch((err) => toast(err instanceof ApiError ? err.message : 'Could not seed', 'err'))
                    .finally(() => setSeeding(false));
                }}
              >
                Seed bosses
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="boss-view">
      <div className="table-card">
        <div className="table-meta">
          <span>
            <strong>{BOSSES.length}</strong> bosses · set the point value awarded per attendance
          </span>
          <span className="muted">Changes save to the sheet instantly</span>
        </div>
        <div className="table-scroll">
          <table className="grid">
            <thead>
              <tr className="labels single">
                <th className="ign-col">Boss</th>
                <th>Level</th>
                <th>Respawn</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              {BOSSES.map((b) => (
                <tr key={b.id}>
                  <td className="ign-col">
                    <div className="cell">{b.name}</div>
                  </td>
                  <td>
                    <div className="cell">{b.level}</div>
                  </td>
                  <td>
                    <div className="cell">{respawnLabel(b)}</div>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <PointsCell
                      value={configRows.get(b.name)?.points ?? 1}
                      onSave={(n) => onSave(b.name, n)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PointsCell({ value, onSave }: { value: number; onSave: (n: number) => Promise<void> }) {
  const [val, setVal] = useState(String(value));
  const [busy, setBusy] = useState(false);
  useEffect(() => setVal(String(value)), [value]);

  async function commit() {
    const parsed = parseInt(val, 10);
    const final = Number.isFinite(parsed) && parsed >= 0 ? parsed : 1;
    setVal(String(final));
    setBusy(true);
    try {
      await onSave(final);
    } finally {
      setBusy(false);
    }
  }

  return (
    <input
      className="cell-input"
      value={val}
      disabled={busy}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => void commit()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        e.stopPropagation();
      }}
    />
  );
}

function AttendanceView({
  data,
  attendanceTab,
  pointsFor,
  onPatch,
  toast,
}: {
  data: DataResponse;
  attendanceTab: TabData | undefined;
  pointsFor: (name: string) => number;
  onPatch: (tabTitle: string, updates: { row: number; col: number; value: string }[]) => void;
  toast: (msg: string, kind?: 'ok' | 'err') => void;
}) {
  const [bossName, setBossName] = useState(BOSSES[0].name);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');
  const [recording, setRecording] = useState(false);

  const roster = data.tabs.find((t) => t.meta.title.toUpperCase() === 'BASIC INFORMATION');

  const memberNames = useMemo(() => {
    const set = new Set<string>();
    for (const r of roster?.rows ?? []) {
      const n = (r.cells[0] || '').trim();
      if (n) set.add(n);
    }
    for (const r of attendanceTab?.rows ?? []) {
      const n = (r.cells[0] || '').trim();
      if (n) set.add(n);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [roster, attendanceTab]);

  const rowByIgn = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of attendanceTab?.rows ?? []) {
      const n = (r.cells[0] || '').trim();
      if (n) m.set(n, r.row);
    }
    return m;
  }, [attendanceTab]);

  const pointsByIgn = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of attendanceTab?.rows ?? []) {
      const n = (r.cells[0] || '').trim();
      m.set(n, intPoints(r.cells[1]));
    }
    return m;
  }, [attendanceTab]);

  const bossPoints = pointsFor(bossName);
  const filtered = filter.trim()
    ? memberNames.filter((n) => n.toLowerCase().includes(filter.trim().toLowerCase()))
    : memberNames;

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function record() {
    if (selected.size === 0) return;
    setRecording(true);
    const updates: { row: number; col: number; value: string }[] = [];
    const adds: string[][] = [];
    for (const name of selected) {
      const row = rowByIgn.get(name);
      const next = (pointsByIgn.get(name) ?? 0) + bossPoints;
      if (row) updates.push({ row, col: 1, value: String(next) });
      else adds.push([name, String(next)]);
    }
    try {
      if (updates.length) await saveCells('BOSS ATTENDANCE', updates);
      for (const cells of adds) await addRow('BOSS ATTENDANCE', cells);
      if (updates.length) onPatch('BOSS ATTENDANCE', updates);
      toast(
        `Recorded ${selected.size} member${selected.size > 1 ? 's' : ''} (+${bossPoints} pts each)`,
        'ok',
      );
      setSelected(new Set());
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not record attendance', 'err');
    } finally {
      setRecording(false);
    }
  }

  return (
    <div className="boss-view">
      <div className="panel-card">
        <h3>Record attendance</h3>
        <div className="att-toolbar">
          <div className="field" style={{ minWidth: 220 }}>
            <label>Boss</label>
            <select
              className="select"
              value={bossName}
              onChange={(e) => setBossName(e.target.value)}
            >
              {BOSSES.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name} — {pointsFor(b.name)} pt{pointsFor(b.name) === 1 ? '' : 's'}
                </option>
              ))}
            </select>
          </div>
          <div className="att-summary">
            <strong>{selected.size}</strong> selected · <strong>+{bossPoints * selected.size}</strong>{' '}
            pts total
          </div>
        </div>

        <div className="att-actions">
          <input
            className="input"
            placeholder="Filter members…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ width: 220 }}
          />
          <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set(filtered))}>
            Select all
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>
            Clear
          </button>
          <div className="grow" />
          <button className="btn btn-primary" disabled={recording || selected.size === 0} onClick={() => void record()}>
            {recording ? <span className="spinner" /> : 'Record attendance'}
          </button>
        </div>

        <div className="att-picker">
          {filtered.map((name) => {
            const on = selected.has(name);
            return (
              <div
                key={name}
                className={`att-row ${on ? 'on' : ''}`}
                onClick={() => toggle(name)}
              >
                <input type="checkbox" checked={on} readOnly />
                <span className="att-ign">{name}</span>
                <span className="att-pts">{pointsByIgn.get(name) ?? 0}</span>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="empty" style={{ gridColumn: '1 / -1' }}>
              No members match.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardView({ attendanceTab }: { attendanceTab: TabData | undefined }) {
  const leaderboard = useMemo(() => {
    return (attendanceTab?.rows ?? [])
      .map((r) => ({ ign: (r.cells[0] || '').trim(), points: intPoints(r.cells[1]) }))
      .filter((x) => x.ign && x.points > 0)
      .sort((a, b) => b.points - a.points);
  }, [attendanceTab]);

  const totalPoints = leaderboard.reduce((s, x) => s + x.points, 0);

  return (
    <div className="boss-view">
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-label">Total points awarded</div>
          <div className="stat-value">{totalPoints}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Members with points</div>
          <div className="stat-value">{leaderboard.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Bosses tracked</div>
          <div className="stat-value">{BOSSES.length}</div>
        </div>
      </div>

      <div className="table-card">
        <div className="table-meta">
          <span>
            <strong>{leaderboard.length}</strong> members on the board
          </span>
        </div>
        <div className="table-scroll">
          <table className="grid">
            <thead>
              <tr className="labels single">
                <th className="rownum">#</th>
                <th className="ign-col">IGN</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((x, i) => (
                <tr key={x.ign}>
                  <td className="rownum">{i + 1}</td>
                  <td className="ign-col">
                    <div className="cell">{x.ign}</div>
                  </td>
                  <td>
                    <div className="cell">{x.points}</div>
                  </td>
                </tr>
              ))}
              {leaderboard.length === 0 && (
                <tr>
                  <td colSpan={3}>
                    <div className="empty">
                      <div className="big">—</div>
                      No attendance recorded yet.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
