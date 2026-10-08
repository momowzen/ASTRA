import type { RowData, TabData } from '../types';
import { formatCp, parseCpNumber } from '../utils';
import { useLang } from '../i18n';

interface Props {
  tab: TabData;
  rows: RowData[];
}

export default function CpHistoryView({ tab, rows }: Props) {
  const { t } = useLang();

  const header0 = tab.meta.headers[0] || [];
  const dated = header0
    .map((h, i) => ({ i, label: String(h ?? '').trim() }))
    .filter((c) => c.i > 0 && c.label);

  const latest = dated.length > 0 ? dated[dated.length - 1] : null;
  const prev = dated.length > 1 ? dated[dated.length - 2] : null;
  const showChange = !!prev && !!latest;

  const sorted = [...rows].sort((a, b) => {
    const av = latest ? parseCpNumber(a.cells[latest.i]) : NaN;
    const bv = latest ? parseCpNumber(b.cells[latest.i]) : NaN;
    const aOk = !Number.isNaN(av);
    const bOk = !Number.isNaN(bv);
    if (aOk && bOk) return bv - av || (a.cells[0] || '').localeCompare(b.cells[0] || '');
    if (aOk) return -1;
    if (bOk) return 1;
    return (a.cells[0] || '').localeCompare(b.cells[0] || '');
  });

  function change(row: RowData): { text: string; cls: string } {
    if (!showChange || !prev || !latest) return { text: '', cls: '' };
    const lv = parseCpNumber(row.cells[latest.i]);
    const pv = parseCpNumber(row.cells[prev.i]);
    if (Number.isNaN(lv) || Number.isNaN(pv) || pv === 0) return { text: '—', cls: 'flat' };
    const pct = ((lv - pv) / pv) * 100;
    return {
      text: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`,
      cls: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat',
    };
  }

  const colCount = 2 + (prev ? 1 : 0) + (latest ? 1 : 0) + (showChange ? 1 : 0);

  return (
    <div className="table-card">
      <div className="table-meta">
        <span>
          <strong>{sorted.length}</strong> {t('admin.memberRows', { a: sorted.length })}
        </span>
        <div className="table-meta-right">
          <span className="muted">{t('cp.historyHint')}</span>
        </div>
      </div>
      <div className="table-scroll">
        <table className="grid">
          <thead>
            <tr className="labels single">
              <th className="rownum">#</th>
              <th className="ign-col">{(header0[0] || 'IGN').trim()}</th>
              {prev && <th>{prev.label}</th>}
              {latest && <th>{latest.label}</th>}
              {showChange && <th>{t('cp.change')}</th>}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const d = change(r);
              return (
                <tr key={r.row}>
                  <td className="rownum">{i + 1}</td>
                  <td className="ign-col">
                    <div className="cell">{r.cells[0]}</div>
                  </td>
                  {prev && (
                    <td>
                      <div className="cell">{formatCp(r.cells[prev.i] ?? '') || '—'}</div>
                    </td>
                  )}
                  {latest && (
                    <td>
                      <div className="cell cp-latest">{formatCp(r.cells[latest.i] ?? '') || '—'}</div>
                    </td>
                  )}
                  {showChange && (
                    <td>
                      <div className={`cell cp-delta ${d.cls}`}>{d.text || '—'}</div>
                    </td>
                  )}
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={colCount}>
                  <div className="empty">{t('admin.noRows')}</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
