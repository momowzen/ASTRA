import { useLayoutEffect, useMemo, useState } from 'react';
import type { DataResponse, TabData } from '../types';
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

interface ColumnSummary {
  filled: number;
  total: number;
  rows: { label: string; value: number; count: string }[];
}

function columnSummary(tab: TabData | undefined, label: string): ColumnSummary | null {
  if (!tab) return null;
  const col = buildColumns(tab.meta).find((c) => c.label.trim().toUpperCase() === label);
  if (!col) return null;
  const counts = new Map<string, number>();
  let filled = 0;
  for (const r of tab.rows) {
    const v = (r.cells[col.index] ?? '').trim();
    if (!v) continue;
    filled += 1;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const rows = [...counts.entries()]
    .map(([value, n]) => ({ label: value, value: n, count: String(n) }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  return { filled, total: tab.rows.length, rows };
}

function SummaryPanel({ titleKey, data }: { titleKey: string; data: ColumnSummary | null }) {
  const { t } = useLang();
  const rows = data?.rows ?? [];
  return (
    <div className="panel-card">
      <h3>{t(titleKey)}</h3>
      {rows.length > 0 ? (
        <>
          <div className="muted roster-summary-meta">
            {t('roster.summaryMeta', { n: data?.filled ?? 0, m: data?.total ?? 0 })}
          </div>
          <DistList rows={rows} />
        </>
      ) : (
        <div className="empty">{t('roster.noData')}</div>
      )}
    </div>
  );
}

export default function GuildRoster({ data }: Props) {
  const { t } = useLang();

  const basic = data.tabs.find((tb) => tb.meta.title.toUpperCase() === 'BASIC INFORMATION');
  const equipment = data.tabs.find((tb) => tb.meta.title.toUpperCase() === 'EQUIPMENT');

  const [topOffset, setTopOffset] = useState(58);
  useLayoutEffect(() => {
    const measure = () => {
      const el = document.querySelector<HTMLElement>('.topbar');
      if (el) setTopOffset(el.getBoundingClientRect().height);
    };
    measure();
    const el = document.querySelector<HTMLElement>('.topbar');
    const ro = el ? new ResizeObserver(measure) : null;
    if (el && ro) ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const members = useMemo(() => {
    return (basic?.rows ?? [])
      .map((r) => ({ ign: (r.cells[0] || '').trim(), cp: cpNumber(r.cells[1]) }))
      .filter((m) => m.ign);
  }, [basic]);

  const withCp = useMemo(() => members.filter((m) => m.cp > 0), [members]);

  const stats = useMemo(() => {
    const total = withCp.reduce((s, m) => s + m.cp, 0);
    const top = withCp.reduce((best, m) => Math.max(best, m.cp), 0);
    return { total, avg: withCp.length ? Math.round(total / withCp.length) : 0, top };
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

  const weaponSummary = useMemo(() => columnSummary(equipment, 'MAIN WEAPON'), [equipment]);
  const roleSummary = useMemo(() => columnSummary(basic, 'ROLE'), [basic]);
  const statusSummary = useMemo(() => columnSummary(basic, 'STATUS'), [basic]);

  const guildSummary = useMemo(() => {
    const empty = { rows: [] as { label: string; value: number; count: string }[] };
    if (!basic) return empty;
    const col = buildColumns(basic.meta).find((c) => c.label.trim().toUpperCase() === 'GUILD');
    if (!col) return empty;
    const counts = new Map<string, number>();
    for (const r of basic.rows) {
      const v = (r.cells[col.index] ?? '').trim();
      if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    const opts = (basic.meta.options?.[col.index] ?? []).map((o) => o.trim()).filter(Boolean);
    const names = opts.length ? opts : [...counts.keys()];
    const rows = [...new Set(names)]
      .map((name) => ({ label: name, value: counts.get(name) ?? 0, count: String(counts.get(name) ?? 0) }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
    return { rows };
  }, [basic]);

  return (
    <div className="roster-view">
      <div className="stat-row" style={{ top: topOffset }}>
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

      <div className="roster-summaries">
        <SummaryPanel titleKey="roster.mainWeapon" data={weaponSummary} />
        <SummaryPanel titleKey="roster.role" data={roleSummary} />
        <SummaryPanel titleKey="roster.status" data={statusSummary} />
      </div>

      <div className="roster-split">
        <div className="panel-card">
          <h3>{t('roster.distTitle')}</h3>
          {withCp.length ? (
            <DistList rows={brackets} />
          ) : (
            <div className="empty">{t('roster.noCp')}</div>
          )}
        </div>

        <div className="panel-card">
          <h3>{t('roster.guilds')}</h3>
          {guildSummary.rows.length > 0 ? (
            <DistList rows={guildSummary.rows} />
          ) : (
            <div className="empty">{t('roster.noData')}</div>
          )}
        </div>
      </div>

      <div className="table-card">
        <div className="table-meta">
          <span>{t('roster.topMeta')}</span>
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
    </div>
  );
}
