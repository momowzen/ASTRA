import Avatar from './Avatar';
import { IconTrophy } from './icons';
import { useLang } from '../i18n';

export interface PodiumEntry {
  ign: string;
  points: number;
  perfect?: number;
}

interface Props {
  entries: PodiumEntry[];
  avatars?: Record<string, string>;
}

const ORDER = [4, 3, 1, 2, 5];

export default function AttendancePodium({ entries, avatars }: Props) {
  const { t } = useLang();
  const top = entries.slice(0, 5);
  if (top.length === 0) return null;

  return (
    <div className="attendance-podium" role="list" aria-label={t('boss.topFive')}>
      {ORDER.filter((rank) => rank <= top.length).map((rank) => {
        const entry = top[rank - 1];
        const perfect = entry.perfect ?? 0;
        return (
          <div className={`attendance-podium-slot rank-${rank}`} key={entry.ign} role="listitem" aria-label={`${rank}. ${entry.ign}`}>
            <div className="attendance-podium-card">
              <div className="attendance-podium-avatar-wrap">
                <Avatar
                  ign={entry.ign}
                  src={avatars?.[entry.ign.trim().toLowerCase()]}
                  className="podium-avatar attendance-podium-avatar"
                />
                <span className="attendance-podium-rank" aria-hidden="true">
                  <IconTrophy />
                </span>
              </div>
              <div className="attendance-podium-ign" title={entry.ign}>
                {entry.ign}
              </div>
              <div className="attendance-podium-score">
                <strong>{entry.points.toLocaleString('en-US')}</strong>
                {perfect > 0 && <span>/ {perfect.toLocaleString('en-US')}</span>}
              </div>
              <div className="attendance-podium-score-label">
                {perfect > 0 ? t('boss.totalPerfect') : t('boss.points')}
              </div>
            </div>
            <div className="attendance-podium-base" aria-hidden="true">
              <span>{rank}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
