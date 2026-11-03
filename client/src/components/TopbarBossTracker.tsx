import { useEffect, useMemo, useRef, useState } from 'react';
import { bossLabel } from '../display';
import { useLang } from '../i18n';
import {
  computeNextSpawn,
  formatRemaining,
  todayBosses,
  useBossData,
} from '../bossSchedule';
import type { TodayBoss } from '../bossSchedule';

interface Props {
  /* Hidden while the Boss Tracker section is open. */
  enabled: boolean;
  /* Member behaviour: clicking opens the Boss Tracker section. */
  onNavigate?: () => void;
  /* Admin behaviour: clicking toggles an extended dropdown with today's
     boss list and remaining times. */
  dropdown?: boolean;
}

export default function TopbarBossTracker({ enabled, onNavigate, dropdown = false }: Props) {
  const { t, lang } = useLang();
  const { timers, now } = useBossData(enabled);

  const next = useMemo(() => (enabled ? computeNextSpawn(timers, now) : null), [enabled, timers, now]);
  const today = useMemo(() => (enabled && dropdown ? todayBosses(timers, now) : []), [enabled, dropdown, timers, now]);

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  /* Close the dropdown on outside click / Escape. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  /* Close when the tracker section becomes active (member). */
  useEffect(() => {
    if (!enabled) setOpen(false);
  }, [enabled]);

  if (!enabled || !next) return null;

  const nextRemaining = next.at - now;
  const time = formatRemaining(nextRemaining);
  const inPrefix = t('boss.inPrefix');
  const inSuffix = t('boss.inSuffix');
  const label = `${t('boss.nextSpawn')}: ${bossLabel(next.boss.name, t, lang)} ${inPrefix}${time}${inSuffix}`;
  const urgency = nextRemaining <= 5 * 60000 ? ' urgent' : nextRemaining <= 30 * 60000 ? ' soon' : '';

  const handleClick = () => {
    if (dropdown) setOpen((v) => !v);
    else onNavigate?.();
  };

  return (
    <div className="topbar-boss-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`topbar-next-spawn${urgency}`}
        aria-haspopup={dropdown ? 'menu' : undefined}
        aria-expanded={dropdown ? open : undefined}
        aria-label={label}
        title={label}
        onClick={handleClick}
      >
        <span className="topbar-next-spawn-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="13" r="8" />
            <path d="M12 9v4l2.5 2.5" />
            <path d="M9 2h6" />
          </svg>
        </span>
        <span className="topbar-next-spawn-copy">
          <span className="topbar-next-spawn-label">{t('boss.nextSpawn')}:</span>
          <strong>{bossLabel(next.boss.name, t, lang)}</strong>
          <span className="topbar-next-spawn-time">
            {inPrefix ? <span className="topbar-next-spawn-in">{inPrefix}</span> : null}
            <span className="topbar-next-spawn-value">{time}</span>
            {inSuffix ? <span className="topbar-next-spawn-in">{inSuffix}</span> : null}
          </span>
        </span>
      </button>
      {dropdown && open && (
        <div className="topbar-boss-dropdown" role="menu">
          <div className="topbar-boss-dropdown-head">
            <span className="topbar-boss-dropdown-title">{t('boss.todaySpawns')}</span>
            <span className="topbar-boss-dropdown-count">{today.length}</span>
          </div>
          <div className="topbar-boss-dropdown-body">
            {today.length === 0 ? (
              <div className="topbar-boss-empty">{t('boss.noSpawnsToday')}</div>
            ) : (
              <div className="topbar-boss-dropdown-list">
                {today.map((row) => {
                  const rem = row.remainingMs;
                  const rowUrgency = rem <= 0 ? ' spawned' : rem <= 5 * 60000 ? ' urgent' : rem <= 30 * 60000 ? ' soon' : '';
                  const timeText = rem <= 0 ? t('boss.spawned') : formatRemaining(rem);
                  return (
                    <div key={`${row.boss.id}-${row.at}`} className={`topbar-boss-row${rowUrgency}`}>
                      <span className="topbar-boss-row-name" title={bossLabel(row.boss.name, t, lang)}>
                        {bossLabel(row.boss.name, t, lang)}
                      </span>
                      <span className="topbar-boss-row-time">
                        {timeText}
                        <span className="topbar-boss-row-sub">
                          {new Date(row.at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
