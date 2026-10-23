import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  z: number;
  r: number;
  a: number;
  tw: number;
  phase: number;
  hue: 'warm' | 'cold' | 'gold';
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

function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}
function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

/** Deep, near-black space: layered stars and rare meteors. */
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
        stars.push({
          x: Math.random(),
          y: Math.random(),
          z: rand(0.2, 1.5),
          r: rand(0.25, 1.45),
          a: rand(0.18, 0.95),
          tw: rand(0.25, 1.35),
          phase: rand(0, TAU),
          hue: roll < 0.15 ? 'gold' : roll < 0.48 ? 'cold' : 'warm',
        });
      }
      nextShot = rand(4, 10);
    }

    function drawBase(ox: number, oy: number): void {
      ctx!.fillStyle = '#040705';
      ctx!.fillRect(0, 0, W, H);

      const g = ctx!.createRadialGradient(
        W * 0.5 + ox,
        H * 0.12 + oy,
        0,
        W * 0.5 + ox,
        H * 0.12 + oy,
        Math.max(W, H) * 1.1,
      );
      g.addColorStop(0, 'rgba(15,26,21,0.5)');
      g.addColorStop(0.45, 'rgba(5,10,8,0.24)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx!.fillStyle = g;
      ctx!.fillRect(0, 0, W, H);
    }

    function drawStars(ox: number, oy: number): void {
      ctx!.globalCompositeOperation = 'lighter';
      for (const s of stars) {
        const twk = 0.5 + 0.5 * Math.sin(time * s.tw + s.phase);
        const alpha = s.a * (0.22 + 0.78 * twk);
        const px = s.x * W + ox * s.z;
        const py = s.y * H + oy * s.z;
        const color =
          s.hue === 'gold'
            ? `rgba(232,184,143,${alpha.toFixed(3)})`
            : s.hue === 'cold'
              ? `rgba(167,205,184,${alpha.toFixed(3)})`
              : `rgba(240,238,228,${alpha.toFixed(3)})`;

        if (s.r > 1.08) {
          const g = ctx!.createRadialGradient(px, py, 0, px, py, s.r * 6);
          g.addColorStop(0, color);
          g.addColorStop(0.3, s.hue === 'cold' ? `rgba(143,183,165,${alpha * 0.2})` : `rgba(201,138,95,${alpha * 0.16})`);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx!.fillStyle = g;
          ctx!.beginPath();
          ctx!.arc(px, py, s.r * 6, 0, TAU);
          ctx!.fill();
        }

        ctx!.fillStyle = color;
        ctx!.beginPath();
        ctx!.arc(px, py, s.r, 0, TAU);
        ctx!.fill();

        if (s.r > 1.25 && alpha > 0.72) {
          ctx!.strokeStyle = color;
          ctx!.lineWidth = 0.45;
          ctx!.beginPath();
          ctx!.moveTo(px - s.r * 3.6, py);
          ctx!.lineTo(px + s.r * 3.6, py);
          ctx!.moveTo(px, py - s.r * 3.6);
          ctx!.lineTo(px, py + s.r * 3.6);
          ctx!.stroke();
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
        nextShot = time + rand(7, 16);
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
      ctx!.fillStyle = `rgba(255,246,236,${(0.9 * alpha).toFixed(3)})`;
      ctx!.beginPath();
      ctx!.arc(hx, hy, 1.25, 0, TAU);
      ctx!.fill();
    }

    function update(dt: number): void {
      for (const s of stars) {
        s.y -= (0.5 * s.z * dt) / H;
        if (s.y < 0) s.y += 1;
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
