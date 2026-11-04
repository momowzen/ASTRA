import type { CSSProperties } from 'react';
import type { RowData, TabData } from '../types';
import { useLang } from '../i18n';

interface Props {
  tab: TabData;
  rows: RowData[];
}

function parsePct(value: string | undefined): number | null {
  const s = String(value ?? '').trim().replace(/%$/, '');
  if (!s) return null;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/* Visual-only view of ACTIVE PARTICIPATION HISTORY: shows every dated column
   plus an "Average" column (mean of the dated values) and sorts rows by that
   average, highest first. Nothing is written back to the sheet.

   The first columns stay frozen like the sheet's freeze panes: # and IGN use
   the app's built-in sticky .rownum / .ign-col styles; Average is frozen right
   after IGN using --avg-left (46px rownum + the IGN column width). */
export default function ActiveParticipationHistoryView({ tab, rows }: Props) {
  const { t } = useLang();

  const header0 = tab.meta.headers[0] || [];
  const dated = header0
    .map((h, i) => ({ i, label: String(h ?? '').trim() }))
    .filter((c) => c.i > 0 && c.label);

  const avgOf = (r: RowData): number => {
    const vals = dated.map((c) => parsePct(r.cells[c.i])).filter((n): n is number => n !== null);
    if (vals.length === 0) return 0;
    return vals.reduce((s, n) => s + n, 0) / vals.length;
  };

  const maxIgnLen = rows.reduce((m, r) => Math.max(m, String(r.cells[0] ?? '').length), 0);
  const ignWidth = `${Math.max(8, maxIgnLen + 4)}ch`;
  const avgWidth = '9ch';

  const sorted = [...rows].sort((a, b) => {
    const av = avgOf(a);
    const bv = avgOf(b);
    if (bv !== av) return bv - av;
    return (a.cells[0] || '').localeCompare(b.cells[0] || '');
  });

  const ignStyle: CSSProperties = {
    width: ignWidth,
    minWidth: ignWidth,
    boxShadow: 'inset -1px 0 0 rgba(201,138,95,0.18)',
  };
  const avgThStyle: CSSProperties = {
    width: avgWidth,
    position: 'sticky',
    top: 0,
    left: 'var(--avg-left)',
    background: '#0a100d',
    zIndex: 7,
  };
  const avgTdStyle: CSSProperties = {
    width: avgWidth,
    position: 'sticky',
    top: 0,
    left: 'var(--avg-left)',
    background: '#0a100d',
    zIndex: 2,
  };

  return (
    <div className="table-card">
      <div className="table-meta">
        <div className="table-meta-info">
          <span>
            <strong>{sorted.length}</strong> {t('roster.members')}
          </span>
        </div>
      </div>
      <div className="table-scroll">
        <table
          className="grid admin-grid participation-history"
          style={{ width: 'max-content', ['--avg-left' as string]: `calc(46px + ${ignWidth})` } as CSSProperties}
        >
          <thead>
            <tr className="labels single">
              <th className="rownum">#</th>
              <th className="ign-col" style={ignStyle}>{(header0[0] || 'IGN').trim()}</th>
              <th style={avgThStyle}>{t('participation.average')}</th>
              {dated.map((c) => (
                <th key={c.i}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const avg = avgOf(r);
              return (
                <tr key={r.row}>
                  <td className="rownum">{i + 1}</td>
                  <td className="ign-col" style={ignStyle}>
                    <div className="cell">{r.cells[0]}</div>
                  </td>
                  <td style={avgTdStyle}>
                    <div className="cell participation-value">{avg.toFixed(1)}%</div>
                  </td>
                  {dated.map((c) => (
                    <td key={c.i}>
                      <div className="cell">{r.cells[c.i] ?? '—'}</div>
                    </td>
                  ))}
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={3 + dated.length}>
                  <div className="empty">{t('participation.empty')}</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
