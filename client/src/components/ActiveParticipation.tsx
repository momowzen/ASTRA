import { useMemo } from 'react';
import type { ParticipationEntry } from '../types';
import { useLang } from '../i18n';
import Avatar from './Avatar';

interface Props {
  entries: ParticipationEntry[];
  avatars?: Record<string, string>;
}

/* Read-only roll-up of how often each member showed up. Field / war shares
   are derived server-side from the recorded boss kills (see GET /data). */
export default function ActiveParticipation({ entries, avatars }: Props) {
  const { t } = useLang();

  const rows = useMemo(
    () => [...entries].sort((a, b) => b.active - a.active || a.ign.localeCompare(b.ign)),
    [entries],
  );

  const pct = (n: number) => `${n.toFixed(1)}%`;

  return (
    <div className="participation-view">
      <div className="table-card roster-top">
        <div className="table-meta">
          <div className="table-meta-info">
            <span>
              <strong>{rows.length}</strong> {t('roster.members').toLowerCase()}
            </span>
          </div>
        </div>
        <div className="table-scroll">
          <table className="grid">
            <thead>
              <tr className="labels single">
                <th className="rownum">#</th>
                <th className="ign-col">IGN</th>
                <th>{t('participation.field')}</th>
                <th>{t('participation.war')}</th>
                <th>{t('participation.active')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.ign}>
                  <td className={`rownum ${i < 3 ? `rank-${i + 1}` : ''}`}>{i + 1}</td>
                  <td className="ign-col">
                    <div className="cell roster-name">
                      <Avatar
                        ign={r.ign}
                        src={avatars?.[r.ign.trim().toLowerCase()]}
                        className="mini-avatar"
                      />
                      {r.ign}
                    </div>
                  </td>
                  <td>
                    <div className="cell participation-value">{pct(r.field)}</div>
                  </td>
                  <td>
                    <div className="cell participation-value">{pct(r.war)}</div>
                  </td>
                  <td>
                    <div className="cell participation-value participation-active">
                      <span className="participation-bar" aria-hidden="true">
                        <span className="participation-fill" style={{ width: `${Math.max(0, Math.min(100, r.active))}%` }} />
                      </span>
                      <span className="participation-pct">{pct(r.active)}</span>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="empty">{t('participation.empty')}</div>
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
