import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { DataResponse } from '../types';
import { ApiError, distribute } from '../api';
import type { DistributionBand, DistributionResult } from '../api';
import { useLang } from '../i18n';
import { tabLabel } from '../display';

interface Props {
  data: DataResponse;
  toast: (msg: string, kind?: 'ok' | 'err') => void;
}

function intPoints(value: string | undefined): number {
  const n = parseInt(value ?? '', 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function membersFromData(data: DataResponse): { ign: string; points: number }[] {
  const att = data.tabs.find((t) => t.meta.title.toUpperCase() === 'BOSS ATTENDANCE');
  return (att?.rows ?? [])
    .map((r) => ({ ign: (r.cells[0] || '').trim(), points: intPoints(r.cells[1]) }))
    .filter((m) => m.ign)
    .sort((a, b) => b.points - a.points || a.ign.localeCompare(b.ign));
}

function useWideScreen(): boolean {
  const [wide, setWide] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 901px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 901px)');
    const onChange = () => setWide(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return wide;
}

export default function AdminTools({ data, toast }: Props) {
  const { t, lang } = useLang();
  const distTitle = tabLabel('DISTRIBUTION HISTORY', t, lang);
  const members = useMemo(() => membersFromData(data), [data]);
  const topPoints = members[0]?.points ?? 0;
  const threshold = topPoints > 0 ? Math.max(1, Math.round(topPoints * 0.3)) : 0;
  const band = useMemo(
    () => members.filter((m) => threshold > 0 && m.points >= threshold),
    [members, threshold],
  );
  const [poolStr, setPoolStr] = useState('');
  const [saved, setSaved] = useState<DistributionResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const pool = parseInt(poolStr, 10);
  const poolValid = Number.isFinite(pool) && pool > 0;
  const totalBandPoints = band.reduce((s, m) => s + m.points, 0);

  const preview = useMemo(() => {
    const alloc = new Map<string, number>();
    if (band.length > 0 && poolValid) {
      const total = band.reduce((s, m) => s + m.points, 0);
      for (const m of band) alloc.set(m.ign, Math.round((pool * m.points) / total));
      const rem = pool - [...alloc.values()].reduce((s, n) => s + n, 0);
      alloc.set(band[0].ign, (alloc.get(band[0].ign) ?? 0) + rem);
    }
    return members.map((m) => ({ ...m, diamonds: alloc.get(m.ign) ?? 0 }));
  }, [members, band, pool, poolValid]);

  const base: DistributionBand[] = saved ? saved.rows : preview;
  const showDiamonds = !!saved || poolValid;
  const top = base.reduce((m, r) => Math.max(m, r.points), 0);
  const displayThr = top > 0 ? Math.max(1, Math.round(top * 0.3)) : 0;
  const displayRows = displayThr > 0 ? base.filter((r) => r.points >= displayThr) : [];

  const tableBoxRef = useRef<HTMLDivElement>(null);
  const headRowRef = useRef<HTMLTableCellElement>(null);
  const bodyRowRef = useRef<HTMLTableRowElement>(null);
  const [boxH, setBoxH] = useState(0);
  const [headH, setHeadH] = useState(34);
  const [rowH, setRowH] = useState(36);
  const wide = useWideScreen();

  useLayoutEffect(() => {
    const el = tableBoxRef.current;
    if (!el) return;
    const sync = () => {
      setBoxH(el.clientHeight);
      const h = headRowRef.current?.offsetHeight;
      const r = bodyRowRef.current?.offsetHeight;
      if (h) setHeadH(h);
      if (r) setRowH(r);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [displayRows.length, wide]);

  // Fill the visible height of the panel before flowing into the next set of columns.
  const rowCap =
    !wide || boxH <= 0
      ? Math.max(displayRows.length, 1)
      : Math.max(1, Math.floor((boxH - headH - 2) / Math.max(rowH, 1)));
  const colCount = Math.max(1, Math.ceil(displayRows.length / rowCap));
  const perCol = Math.max(1, Math.ceil(displayRows.length / colCount));
  const chunks = useMemo(() => {
    if (displayRows.length === 0) return [[]] as DistributionBand[][];
    const out: DistributionBand[][] = [];
    for (let i = 0; i < displayRows.length; i += perCol) out.push(displayRows.slice(i, i + perCol));
    return out;
  }, [displayRows, perCol]);

  async function save() {
    if (!poolValid) return;
    setSaving(true);
    try {
      const res = await distribute(pool);
      setSaved(res);
      toast(`${t('tools.savedNote', { title: distTitle })} · ${res.date}`, 'ok');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : t('tools.couldNot'), 'err');
    } finally {
      setSaving(false);
    }
  }

  if (members.length === 0 && !saved) {
    return (
      <div className="boss-view">
        <div className="panel-card">
          <h3>{t('tools.distTitle')}</h3>
          <div className="empty">{t('tools.empty')}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="boss-view dist-view">
        <div className="announce">
          {saved && (
            <div className="announce-head">
              <div className="announce-date">
                {t('tools.distributedOn')} {saved.date}
              </div>
            </div>
          )}

          <div className="announce-stats">
            <div className="stat-card">
              <div className="stat-label">{t('tools.totalBand')}</div>
              <div className="stat-value">
                {saved ? saved.totalBandPoints : totalBandPoints}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">{t('tools.members')}</div>
              <div className="stat-value">{band.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">{t('tools.pool')}</div>
              <div className="stat-value">{saved ? saved.pool : poolValid ? pool : '—'}</div>
            </div>
          </div>

          <div className="announce-table dist-split" ref={tableBoxRef}>
            <div
              className="dist-grid"
              style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
            >
              {chunks.map((chunk, ci) => (
                <table className="grid dist-table" key={ci}>
                  <thead>
                    <tr className="labels single">
                      <th className="rownum">#</th>
                      <th className="ign-col" ref={ci === 0 ? headRowRef : undefined}>IGN</th>
                      <th>{t('tools.points')}</th>
                      <th>{t('tools.diamonds')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chunk.map((m, i) => (
                      <tr
                        key={m.ign}
                        ref={ci === 0 && i === 0 ? bodyRowRef : undefined}
                      >
                        <td className="rownum">{ci * perCol + i + 1}</td>
                        <td className="ign-col">
                          <div className="cell top-cell" title={t('boss.top30')}>
                            {m.ign}
                          </div>
                        </td>
                        <td>
                          <div className="cell top-cell" title={t('boss.top30')}>
                            {m.points}
                          </div>
                        </td>
                        <td>
                          <div className={`cell ${showDiamonds ? 'dist-diamond' : ''}`}>
                            {showDiamonds ? m.diamonds : '—'}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {displayRows.length === 0 && (
                      <tr>
                        <td className="empty" colSpan={4}>
                          {t('tools.empty')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ))}
            </div>
          </div>

          {!saved ? (
            <>
              <div className="announce-actions">
                <input
                  className="input"
                  type="number"
                  min="1"
                  placeholder={t('tools.pool')}
                  value={poolStr}
                  onChange={(e) => setPoolStr(e.target.value)}
                />
                <button className="btn btn-primary" disabled={saving || !poolValid || band.length === 0} onClick={() => setConfirmOpen(true)}>
                  {saving ? <span className="spinner" /> : t('tools.save')}
                </button>
              </div>
            </>
          ) : (
            <div className="announce-saved">
              {t('tools.savedNote', { title: distTitle })} · {saved.date}
            </div>
          )}
        </div>
      </div>

      {confirmOpen && (
        <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && setConfirmOpen(false)}>
          <div className="modal">
            <h3>{t('tools.confirmTitle')}</h3>
            <p className="desc">{t('tools.confirmHint')}</p>
            <div className="row">
              <button className="btn btn-ghost" onClick={() => setConfirmOpen(false)}>
                {t('common.cancel')}
              </button>
              <button
                className="btn btn-primary"
                disabled={saving}
                onClick={() => {
                  setConfirmOpen(false);
                  void save();
                }}
              >
                {t('tools.ok')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
