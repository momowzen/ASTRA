import { useMemo, useState } from 'react';
import type { DataResponse } from '../types';
import { ApiError, distribute } from '../api';
import type { DistributionBand, DistributionResult } from '../api';
import { useLang } from '../i18n';

interface Props {
  data: DataResponse;
  toast: (msg: string, kind?: 'ok' | 'err') => void;
}

function intPoints(value: string | undefined): number {
  const n = parseInt(value ?? '', 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function bandFromData(data: DataResponse): { ign: string; points: number }[] {
  const att = data.tabs.find((t) => t.meta.title.toUpperCase() === 'BOSS ATTENDANCE');
  const members = (att?.rows ?? [])
    .map((r) => ({ ign: (r.cells[0] || '').trim(), points: intPoints(r.cells[1]) }))
    .filter((m) => m.ign && m.points > 0)
    .sort((a, b) => b.points - a.points || a.ign.localeCompare(b.ign));
  const top = members[0]?.points ?? 0;
  const threshold = top > 0 ? Math.max(1, Math.round(top * 0.3)) : 0;
  return members.filter((m) => threshold > 0 && m.points >= threshold);
}

function allocate(band: { ign: string; points: number }[], pool: number): DistributionBand[] {
  const total = band.reduce((s, m) => s + m.points, 0);
  const out = band.map((m) => ({ ign: m.ign, points: m.points, diamonds: Math.round((pool * m.points) / total) }));
  const remainder = pool - out.reduce((s, m) => s + m.diamonds, 0);
  if (out[0]) out[0].diamonds += remainder;
  return out;
}

export default function AdminTools({ data, toast }: Props) {
  const { t } = useLang();
  const band = useMemo(() => bandFromData(data), [data]);
  const [poolStr, setPoolStr] = useState('');
  const [saved, setSaved] = useState<DistributionResult | null>(null);
  const [saving, setSaving] = useState(false);

  const pool = parseInt(poolStr, 10);
  const poolValid = Number.isFinite(pool) && pool > 0;

  const preview = useMemo(() => {
    if (band.length === 0 || !poolValid) return band.map((m) => ({ ...m, diamonds: 0 }));
    return allocate(band, pool);
  }, [band, pool, poolValid]);

  const rows: DistributionBand[] = saved ? saved.band : preview;
  const showDiamonds = !!saved || poolValid;

  async function save() {
    if (!poolValid) return;
    setSaving(true);
    try {
      const res = await distribute(pool);
      setSaved(res);
      toast(`${t('tools.savedNote')} · ${res.date}`, 'ok');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : t('tools.couldNot'), 'err');
    } finally {
      setSaving(false);
    }
  }

  if (band.length === 0 && !saved) {
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
    <div className="boss-view">
      <div className="announce">
        <div className="announce-head">
          <h2>{t('tools.distTitle')}</h2>
          <div className="announce-sub">{t('tools.band')}</div>
          {saved && (
            <div className="announce-date">
              {t('tools.distributedOn')} {saved.date}
            </div>
          )}
        </div>

        <div className="announce-stats">
          <div className="stat-card">
            <div className="stat-label">{t('tools.totalBand')}</div>
            <div className="stat-value">
              {saved ? saved.totalBandPoints : band.reduce((s, m) => s + m.points, 0)}
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

        <div className="announce-table">
          <table className="grid">
            <thead>
              <tr className="labels single">
                <th className="rownum">#</th>
                <th className="ign-col">IGN</th>
                <th>{t('tools.points')}</th>
                <th>{t('tools.diamonds')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m, i) => (
                <tr key={m.ign}>
                  <td className="rownum">{i + 1}</td>
                  <td className="ign-col">
                    <div className="cell">{m.ign}</div>
                  </td>
                  <td>
                    <div className="cell">{m.points}</div>
                  </td>
                  <td>
                    <div className={`cell ${showDiamonds ? 'dist-diamond' : ''}`}>
                      {showDiamonds ? m.diamonds : '—'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
              <button className="btn btn-primary" disabled={saving || !poolValid} onClick={() => void save()}>
                {saving ? <span className="spinner" /> : t('tools.save')}
              </button>
            </div>
            <div className="announce-note">{t('tools.preview')}</div>
          </>
        ) : (
          <div className="announce-saved">
            {t('tools.savedNote')} · {saved.date}
          </div>
        )}
      </div>
    </div>
  );
}
