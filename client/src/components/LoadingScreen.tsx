import { useCallback, useEffect, useRef, useState } from 'react';
import { useLang } from '../i18n';
import { APP_COMMIT, APP_VERSION } from 'virtual:astra-release';

const INTRO_DONE = 5700;
const REDUCED_DONE = 1400;
const EXIT_LEAD_MS = 620; // gate starts rising this long before the overlay unmounts

/* Jittered loading curve, mirrors the old staggered keyframes exactly so
   the percentage readout and the bar stay perfectly in sync. */
const PROGRESS_DELAY_MS = 350;
const PROGRESS_DUR_MS = 4400;
const PROGRESS_STOPS: [number, number][] = [
  [0, 0],
  [0.14, 16],
  [0.26, 22],
  [0.41, 38],
  [0.55, 51],
  [0.66, 66],
  [0.8, 80],
  [0.88, 84],
  [1, 100],
];

const smooth = (t: number) => t * t * (3 - 2 * t);

function progressAt(elapsedMs: number): number {
  if (elapsedMs <= PROGRESS_DELAY_MS) return 0;
  const t = Math.min(1, (elapsedMs - PROGRESS_DELAY_MS) / PROGRESS_DUR_MS);
  for (let i = 1; i < PROGRESS_STOPS.length; i++) {
    const [t0, v0] = PROGRESS_STOPS[i - 1];
    const [t1, v1] = PROGRESS_STOPS[i];
    if (t <= t1) {
      const local = (t - t0) / (t1 - t0);
      return v0 + (v1 - v0) * smooth(local);
    }
  }
  return 100;
}

export default function LoadingScreen({ onDone, onExitStart }: { onDone: () => void; onExitStart?: () => void }) {
  const { t } = useLang();
  const [pct, setPct] = useState(0);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }, [onDone]);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setPct(100);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const value = progressAt(now - start);
      setPct(Math.round(value));
      if (value < 100) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lead = window.setTimeout(() => onExitStart?.(), reduce ? REDUCED_DONE : INTRO_DONE - EXIT_LEAD_MS);
    const id = window.setTimeout(finish, reduce ? REDUCED_DONE : INTRO_DONE);
    return () => {
      window.clearTimeout(lead);
      window.clearTimeout(id);
    };
  }, [finish, onExitStart]);

  return (
    <div className="intro" role="status" aria-label="ASTRA">
      <div className="intro-stars intro-stars--far" aria-hidden="true" />
      <div className="intro-stars intro-stars--mid" aria-hidden="true" />
      <div className="intro-frame" aria-hidden="true" />

      <span className="intro-corner intro-corner--tl" aria-hidden="true">ASTRA&nbsp;//&nbsp;BOOT</span>
      <span className="intro-corner intro-corner--bl" aria-hidden="true">{t('login.secureChannel')}</span>
      <span className="intro-corner intro-corner--br" aria-hidden="true" title={`commit ${APP_COMMIT}`}>
        v{APP_VERSION}
      </span>

      <main className="intro-stage">
        <div className="intro-crest-wrap" aria-hidden="true">
          <div className="intro-halo" />
          <div className="intro-ring intro-ring--dashed" />
          <div className="intro-ring intro-ring--arc" />
          <img className="intro-crest" src="./assets/astra-crest.png" alt="" />
        </div>

        <h1 className="intro-wordmark">
          <img
            className="intro-wordmark-img"
            src="./assets/astra-wordmark.webp"
            alt="ASTRA"
            width={1600}
            height={533}
            draggable={false}
          />
        </h1>
        <p className="intro-tagline">
          <span className="intro-tagline-slash">//</span> {t('login.tag')}
        </p>

        <div className="intro-boot" aria-hidden="true">
          <div className="intro-boot-line">INITIALIZING UPLINK</div>
          <div className="intro-boot-line">AUTHENTICATING CHANNEL</div>
          <div className="intro-boot-line">SYNCING GUILD DATA</div>
          <div className="intro-boot-line intro-boot-line--grant">ACCESS GRANTED</div>
          <div className="intro-progress-row">
            <span className="intro-progress-label">Loading</span>
            <span className="intro-progress-value">{pct}%</span>
          </div>
          <div className="intro-progress">
            <span className="intro-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </main>
    </div>
  );
}
