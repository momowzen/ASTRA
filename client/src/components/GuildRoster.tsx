import { useMemo } from 'react';
import type { DataResponse } from '../types';
import { buildColumns, formatCp } from '../utils';
import { useLang } from '../i18n';

interface Props {
  data: DataResponse;
}

function cpNumber(value: string | undefined): number {
  const digits = (value ?? '').replace(/[^\d]/g, '');
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}

const BRACKETS: { key: string; min: number; max: number }[] = [
  { key: 'roster.bracket0', min: 0, max: 100_000 },
  { key: 'roster.bracket1', min: 100_000, max: 125_000 },
  { key: 'roster.bracket2', min: 125_000, max: 150_000 },
  { key: 'roster.bracket3', min: 150_000, max: 175_000 },
  { key: 'roster.bracket4', min: 175_000, max: 200_000 },
  { key: 'roster.bracket5', min: 200_000, max: Infinity },
];

function DistList({
  rows,
  max: maxOverride,
}: {
  rows: { label: string; value: number; count: string }[];
  max?: number;
}) {
  const max = maxOverride && maxOverride > 0 ? maxOverride : Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="dist-list">
      {rows.map((r) => (
        <div className="dist-row" key={r.label}>
          <span className="dist-label">{r.label}</span>
          <span className="dist-track">
            <span className="dist-fill" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="dist-count">{r.count}</span>
        </div>
      ))}
    </div>
  );
}

export default function GuildRoster({ data }: Props) {
  const { t } = useLang();

  const basic = data.tabs.find((tb) => tb.meta.title.toUpperCase() === 'BASIC INFORMATION');
  const equipment = data.tabs.find((tb) => tb.meta.title.toUpperCase() === 'EQUIPMENT');

  const members = useMemo(() => {
    return (basic?.rows ?? [])
      .map((r) => ({ ign: (r.cells[0] || '').trim(), cp: cpNumber(r.cells[1]) }))
      .filter((m) => m.ign);
  }, [basic]);

  const withCp = useMemo(() => members.filter((m) => m.cp > 0), [members]);

  const stats = useMemo(() => {
    const total = withCp.reduce((s, m) => s + m.cp, 0);
    const top = withCp.reduce((best, m) => Math.max(best, m.cp), 0);
    return {
      total,
      avg: withCp.length ? Math.round(total / withCp.length) : 0,
      top,
    };
  }, [withCp]);

  const brackets = useMemo(() => {
    const counts = BRACKETS.map((b) => withCp.filter((m) => m.cp >= b.min && m.cp < b.max).length);
    return BRACKETS.map((b, i) => ({
      label: t(b.key),
      value: counts[i],
      count: String(counts[i]),
    }));
  }, [withCp, t]);

  const top10 = useMemo(
    () => [...withCp].sort((a, b) => b.cp - a.cp || a.ign.localeCompare(b.ign)).slice(0, 10),
    [withCp],
  );

  const slotCols = useMemo(
    () => (equipment ? buildColumns(equipment.meta).filter((c) => c.index > 0) : []),
    [equipment],
  );

  const equipped = useMemo(() => {
    return (equipment?.rows ?? [])
      .map((r) => ({
        ign: (r.cells[0] || '').trim(),
        cells: slotCols.map((c) => (r.cells[c.index] || '').trim()),
      }))
      .filter((row) => row.ign && row.cells.some(Boolean))
      .sort((a, b) => (cpByIgn(b.ign) - cpByIgn(a.ign)) || a.ign.localeCompare(b.ign));
    function cpByIgn(ign: string): number {
      return members.find((m) => m.ign === ign)?.cp ?? 0;
    }
  }, [equipment, slotCols, members]);

  const slotFilled = useMemo(
    () => slotCols.map((c) => (equipment?.rows ?? []).filter((r) => (r.cells[c.index] || '').trim()).length),
    [equipment, slotCols],
  );

  const filledSlots = slotFilled.reduce((s, n) => s + n, 0);
  const totalSlots = slotCols.length * members.length;

  return (
    <div className="roster-view">
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-label">{t('roster.members')}</div>
          <div className="stat-value">{members.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('roster.totalCp')}</div>
          <div className="stat-value">{withCp.length ? formatCp(String(stats.total)) : '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('roster.avgCp')}</div>
          <div className="stat-value">{withCp.length ? formatCp(String(stats.avg)) : '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('roster.topCp')}</div>
          <div className="stat-value">{withCp.length ? formatCp(String(stats.top)) : '—'}</div>
        </div>
      </div>

      <div className="panel-card">
        <h3>{t('roster.distTitle')}</h3>
        {withCp.length ? (
          <DistList rows={brackets} />
        ) : (
          <div className="empty">{t('roster.noCp')}</div>
        )}
      </div>

      <div className="table-card">
        <div className="table-meta">
          <span>
            <strong>{top10.length}</strong> {t('roster.topMeta')}
          </span>
        </div>
        <div className="table-scroll">
          <table className="grid">
            <thead>
              <tr className="labels single">
                <th className="rownum">#</th>
                <th className="ign-col">IGN</th>
                <th>{t('roster.cp')}</th>
              </tr>
            </thead>
            <tbody>
              {top10.map((m, i) => (
                <tr key={m.ign}>
                  <td className="rownum">{i + 1}</td>
                  <td className="ign-col">
                    <div className="cell">{m.ign}</div>
                  </td>
                  <td>
                    <div className="cell">{formatCp(String(m.cp))}</div>
                  </td>
                </tr>
              ))}
              {top10.length === 0 && (
                <tr>
                  <td colSpan={3}>
                    <div className="empty">{t('roster.noCp')}</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel-card">
        <h3>{t('roster.coverageTitle')}</h3>
        <div className="muted roster-coverage-meta">
          {t('roster.equippedMeta', {
            n: equipped.length,
            m: members.length,
            f: filledSlots,
            s: totalSlots,
          })}
        </div>
        {slotCols.length > 0 ? (
          <DistList
            max={members.length}
            rows={slotCols.map((c, i) => ({
              label: c.label,
              value: slotFilled[i],
              count: `${slotFilled[i]}/${members.length}`,
            }))}
          />
        ) : (
          <div className="empty">{t('roster.noEquipment')}</div>
        )}
      </div>

      <div className="table-card">
        <div className="table-meta">
          <span>{t('roster.equippedMeta2', { n: equipped.length })}</span>
        </div>
        <div className="table-scroll">
          <table className="grid">
            <thead>
              <tr className="labels single">
                <th className="rownum">#</th>
                <th className="ign-col">IGN</th>
                {slotCols.map((c) => (
                  <th key={c.index}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {equipped.map((row, i) => (
                <tr key={row.ign}>
                  <td className="rownum">{i + 1}</td>
                  <td className="ign-col">
                    <div className="cell">{row.ign}</div>
                  </td>
                  {row.cells.map((v, j) => (
                    <td key={slotCols[j].index}>
                      <div className="cell">{v || '—'}</div>
                    </td>
                  ))}
                </tr>
              ))}
              {equipped.length === 0 && (
                <tr>
                  <td colSpan={slotCols.length + 2}>
                    <div className="empty">{t('roster.noEquipment')}</div>
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
