import { useEffect, useRef } from 'react';

type Hue = 'warm' | 'cold' | 'gold';

interface Star {
  /** Normalized position (0..1) so resizing keeps the field. */
  x: number;
  y: number;
  /** Depth: drives parallax, size feel and drift speed. */
  z: number;
  r: number;
  a: number;
  /** Twinkle frequency (rad/s). */
  tw: number;
  /** Twinkle depth 0..1 — how much the star dips between pulses. */
  amp: number;
  phase: number;
  hue: Hue;
  /** Upward drift in px/s. */
  drift: number;
  /** Horizontal sway in px/s (0 for most stars). */
  swayAmp: number;
  swayW: number;
  /** Beacon-style flare stars. */
  flare: boolean;
  nextFlare: number;
  flareStart: number;
}

interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  len: number;
  speed: number;
  dur: number;
  t: number;
}

const TAU = Math.PI * 2;
const PARALLAX = 18;
const SPRITE = 96;

const HUE_RGB: Record<Hue, string> = {
  warm: '255,252,244',
  cold: '196,228,212',
  gold: '248,208,170',
};

function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}
function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

/** Soft radial glow sprite, built once per hue instead of per star per frame. */
function makeSprite(rgb: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = SPRITE;
  c.height = SPRITE;
  const g2 = c.getContext('2d');
  if (!g2) return c;
  const g = g2.createRadialGradient(SPRITE / 2, SPRITE / 2, 0, SPRITE / 2, SPRITE / 2, SPRITE / 2);
  g.addColorStop(0, `rgba(${rgb},1)`);
  g.addColorStop(0.18, `rgba(${rgb},0.55)`);
  g.addColorStop(0.42, `rgba(${rgb},0.16)`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  g2.fillStyle = g;
  g2.fillRect(0, 0, SPRITE, SPRITE);
  return c;
}

/** Deep, near-black space: breathing nebula, twinkling layered stars,
    drifting dust, beacon flares and rare meteors. */
export default function Background() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let W = 0;
    let H = 0;
    let DPR = 1;
    let time = 0;
    let last = 0;
    const mouse = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    let stars: Star[] = [];
    let shot: Shot | null = null;
    let nextShot = 0;
    let raf = 0;
    let running = false;

    const sprites: Record<Hue, HTMLCanvasElement> = {
      warm: makeSprite(HUE_RGB.warm),
      cold: makeSprite(HUE_RGB.cold),
      gold: makeSprite(HUE_RGB.gold),
    };

    function setSize(): void {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas!.width = Math.round(W * DPR);
      canvas!.height = Math.round(H * DPR);
      ctx!.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function seed(): void {
      const area = W * H;
      const small = W < 900;
      const count = small ? clamp(Math.round(area / 4200), 110, 210) : clamp(Math.round(area / 3200), 260, 560);
      stars = [];
      for (let i = 0; i < count; i++) {
        const roll = Math.random();
        const z = rand(0.2, 1.5);
        const flare = Math.random() < 0.07;
        stars.push({
          x: Math.random(),
          y: Math.random(),
          z,
          r: rand(0.25, 1.45),
          a: rand(0.18, 0.95),
          tw: rand(0.3, 1.7),
          amp: rand(0.35, 0.85),
          phase: rand(0, TAU),
          hue: roll < 0.15 ? 'gold' : roll < 0.48 ? 'cold' : 'warm',
          drift: 0.5 + z * 3.4,
          swayAmp: Math.random() < 0.38 ? rand(1.6, 5.2) : 0,
          swayW: rand(0.04, 0.15),
          flare,
          nextFlare: flare ? rand(2.5, 13) : Infinity,
          flareStart: -10,
        });
      }
      nextShot = rand(3, 7);
    }

    function drawBase(ox: number, oy: number): void {
      ctx!.fillStyle = '#040705';
      ctx!.fillRect(0, 0, W, H);

      // Nebula core slowly wanders and breathes so the void is never still.
      const cx = W * 0.5 + ox + Math.sin(time * 0.07) * W * 0.05;
      const cy = H * 0.12 + oy + Math.cos(time * 0.053) * H * 0.05;
      const radius = Math.max(W, H) * (1.05 + 0.07 * Math.sin(time * 0.09));
      const pulse = 0.46 + 0.09 * Math.sin(time * 0.16);

      const g = ctx!.createRadialGradient(cx, cy, 0, cx, cy, radius);
      g.addColorStop(0, `rgba(15,26,21,${pulse.toFixed(3)})`);
      g.addColorStop(0.45, 'rgba(5,10,8,0.24)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx!.fillStyle = g;
      ctx!.fillRect(0, 0, W, H);
    }

    function drawStars(ox: number, oy: number): void {
      ctx!.globalCompositeOperation = 'lighter';
      for (const s of stars) {
        // Two mixed sine bands keep the twinkle from feeling metronomic.
        const w1 = 0.5 + 0.5 * Math.sin(time * s.tw + s.phase);
        const w2 = 0.5 + 0.5 * Math.sin(time * s.tw * 1.73 + s.phase * 2.1);
        const twk = w1 * 0.65 + w2 * 0.35;

        // Beacon flare: sharp attack, slow exponential decay, re-arms itself.
        let boost = 0;
        if (s.flare) {
          if (time >= s.nextFlare) {
            s.flareStart = time;
            s.nextFlare = time + rand(6, 16);
          }
          const ft = time - s.flareStart;
          if (ft >= 0 && ft < 1.6) {
            boost = ft < 0.16 ? ft / 0.16 : Math.exp(-(ft - 0.16) * 3.4);
          }
        }

        const base = s.a * (1 - s.amp * (1 - twk));
        const alpha = Math.min(1, base + boost * 0.5);

        const sway = s.swayAmp ? Math.sin(time * s.swayW * TAU + s.phase) * s.swayAmp : 0;
        const px = s.x * W + ox * s.z + sway;
        const py = s.y * H + oy * s.z;
        const rr = s.r * (1 + 0.22 * twk + boost * 1.15);
        if (px < -40 || px > W + 40 || py < -40 || py > H + 40) continue;

        const color =
          s.hue === 'gold'
            ? `rgba(232,184,143,${alpha.toFixed(3)})`
            : s.hue === 'cold'
              ? `rgba(167,205,184,${alpha.toFixed(3)})`
              : `rgba(240,238,228,${alpha.toFixed(3)})`;

        // Halo: sprite blit (cheap) instead of a gradient built every frame.
        if (rr > 0.95 || boost > 0.02) {
          const glowR = rr * (5.5 + boost * 9);
          ctx!.globalAlpha = clamp(alpha * (0.34 + boost * 0.5), 0, 1);
          ctx!.drawImage(sprites[s.hue], px - glowR, py - glowR, glowR * 2, glowR * 2);
          ctx!.globalAlpha = 1;
        }

        ctx!.fillStyle = color;
        ctx!.beginPath();
        ctx!.arc(px, py, rr, 0, TAU);
        ctx!.fill();

        // Sparkle: flaring stars burst into a cross; the biggest keep a faint one.
        const cross = boost > 0.3 ? boost : s.r > 1.28 && alpha > 0.72 ? alpha * 0.5 : 0;
        if (cross > 0.08) {
          const len = rr * (3.6 + boost * 4.5);
          ctx!.strokeStyle = color;
          ctx!.globalAlpha = clamp(cross, 0, 1);
          ctx!.lineWidth = 0.45 + boost * 0.5;
          ctx!.beginPath();
          ctx!.moveTo(px - len, py);
          ctx!.lineTo(px + len, py);
          ctx!.moveTo(px, py - len);
          ctx!.lineTo(px, py + len);
          ctx!.stroke();
          ctx!.globalAlpha = 1;
        }
      }
      ctx!.globalCompositeOperation = 'source-over';
    }

    function maybeShot(dt: number): void {
      if (!shot) {
        if (time >= nextShot) {
          const ang = rand(0.36, 0.58);
          const speed = rand(820, 1120);
          const D = rand(850, 1150);
          shot = {
            x: rand(0.02, 0.74) * W,
            y: rand(0.02, 0.22) * H,
            vx: Math.cos(ang),
            vy: Math.sin(ang),
            len: rand(130, 220),
            speed,
            dur: D / speed,
            t: 0,
          };
        }
        return;
      }
      shot.t += dt;
      if (shot.t > shot.dur + 0.65) {
        shot = null;
        nextShot = time + rand(6, 13);
      }
    }

    function drawShot(ox: number, oy: number): void {
      if (!shot) return;
      const s = shot;
      const dist = s.speed * Math.min(s.t, s.dur);
      const alpha = s.t < s.dur ? 1 : clamp(1 - (s.t - s.dur) / 0.65, 0, 1);
      const hx = s.x + s.vx * dist + ox * 0.7;
      const hy = s.y + s.vy * dist + oy * 0.7;
      const tail = Math.min(dist, s.len);
      const g = ctx!.createLinearGradient(hx, hy, hx - s.vx * tail, hy - s.vy * tail);
      g.addColorStop(0, `rgba(255,246,236,${(0.92 * alpha).toFixed(3)})`);
      g.addColorStop(0.32, `rgba(183,214,198,${(0.42 * alpha).toFixed(3)})`);
      g.addColorStop(1, 'rgba(109,156,140,0)');
      ctx!.strokeStyle = g;
      ctx!.lineWidth = 1.2;
      ctx!.lineCap = 'round';
      ctx!.beginPath();
      ctx!.moveTo(hx, hy);
      ctx!.lineTo(hx - s.vx * tail, hy - s.vy * tail);
      ctx!.stroke();

      ctx!.globalAlpha = alpha * 0.85;
      const gr = 9;
      ctx!.drawImage(sprites.warm, hx - gr, hy - gr, gr * 2, gr * 2);
      ctx!.globalAlpha = 1;

      ctx!.fillStyle = `rgba(255,246,236,${(0.9 * alpha).toFixed(3)})`;
      ctx!.beginPath();
      ctx!.arc(hx, hy, 1.25, 0, TAU);
      ctx!.fill();
    }

    function update(dt: number): void {
      for (const s of stars) {
        s.y -= (s.drift * dt) / H;
        if (s.y < -0.02) {
          s.y += 1.04;
          s.x = Math.random();
        }
      }
      maybeShot(dt);
    }

    function render(): void {
      const px = cur.x * PARALLAX;
      const py = cur.y * PARALLAX;
      drawBase(px, py);
      drawStars(px, py);
      drawShot(px, py);
    }

    function frame(now: number): void {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      time += dt;
      const k = 1 - Math.pow(0.93, dt * 60);
      cur.x += (mouse.x - cur.x) * k;
      cur.y += (mouse.y - cur.y) * k;
      update(dt);
      render();
      raf = requestAnimationFrame(frame);
    }

    function start(): void {
      if (running || reduce) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    function stop(): void {
      running = false;
      cancelAnimationFrame(raf);
    }

    function onMove(e: PointerEvent): void {
      mouse.x = e.clientX / Math.max(W, 1) - 0.5;
      mouse.y = e.clientY / Math.max(H, 1) - 0.5;
    }
    function onResize(): void {
      setSize();
      if (reduce) {
        time = 12;
        render();
      }
    }
    function onVisibility(): void {
      if (document.hidden) stop();
      else start();
    }

    setSize();
    seed();
    if (reduce) {
      time = 12;
      render();
    } else {
      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('resize', onResize);
      document.addEventListener('visibilitychange', onVisibility);
      start();
    }

    return () => {
      stop();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <>
      <canvas id="bg-canvas" ref={ref} aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
    </>
  );
}
