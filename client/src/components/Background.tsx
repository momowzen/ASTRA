import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  r: number;
  a: number;
  sp: number;
  f: number;
  p: number;
  blue: boolean;
}

interface Ember {
  x: number;
  y: number;
  vy: number;
  amp: number;
  fr: number;
  ph: number;
  size: number;
  a: number;
}

interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  L: number;
  sp: number;
  dur: number;
  t: number;
}

const TAU = Math.PI * 2;
const DOT = 80;
const PARALLAX = 22;

function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}
function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

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
    let embers: Ember[] = [];
    let shot: Shot | null = null;
    let nextShot = 0;
    let sprite: HTMLCanvasElement | null = null;
    let raf = 0;
    let running = false;

    function makeSprite(): HTMLCanvasElement {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const g = c.getContext('2d')!;
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(244, 247, 255, 1)');
      grad.addColorStop(0.2, 'rgba(190, 180, 255, 0.8)');
      grad.addColorStop(0.55, 'rgba(139, 111, 247, 0.22)');
      grad.addColorStop(1, 'rgba(139, 111, 247, 0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
      return c;
    }

    function newEmber(initial: boolean): Ember {
      return {
        x: Math.random(),
        y: initial ? rand(0, H) : H + rand(4, 40),
        vy: rand(14, 36),
        amp: rand(8, 30),
        fr: rand(0.25, 0.7),
        ph: rand(0, TAU),
        size: rand(2.5, 4),
        a: rand(0.4, 0.9),
      };
    }

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
      const n = small
        ? clamp(Math.round(area / 9000), 70, 150)
        : clamp(Math.round(area / 4800), 130, 320);
      stars = [];
      for (let i = 0; i < n; i++) {
        stars.push({
          x: Math.random(),
          y: Math.random(),
          r: rand(0.5, 1.7),
          a: rand(0.5, 1),
          sp: rand(1.5, 5),
          f: rand(0.4, 1.3),
          p: rand(0, TAU),
          blue: Math.random() < 0.3,
        });
      }
      const m = small ? clamp(Math.round(area / 60000), 10, 18) : clamp(Math.round(area / 42000), 16, 36);
      embers = [];
      for (let i = 0; i < m; i++) embers.push(newEmber(true));
      nextShot = rand(4, 9);
    }

    function drawNebula(ox: number, oy: number): void {
      const M = Math.max(W, H);
      const blobs = [
        { x: 0.2 + Math.sin(time * 0.045) * 0.06, y: 0.28 + Math.cos(time * 0.037) * 0.05, r: 0.62, c: '139,111,247', a: 0.24 },
        { x: 0.84 + Math.cos(time * 0.05) * 0.05, y: 0.74 + Math.sin(time * 0.041) * 0.06, r: 0.55, c: '47,94,171', a: 0.24 },
        { x: 0.52 + Math.sin(time * 0.03 + 1) * 0.08, y: 0.48 + Math.cos(time * 0.028) * 0.07, r: 0.5, c: '102,119,255', a: 0.12 },
        { x: 0.72 + Math.sin(time * 0.02 + 2) * 0.05, y: 0.2 + Math.cos(time * 0.024) * 0.05, r: 0.38, c: '214,168,92', a: 0.07 },
        { x: 0.5 + Math.cos(time * 0.026) * 0.04, y: 0.42 + Math.sin(time * 0.03) * 0.04, r: 0.75, c: '70,60,150', a: 0.1 },
      ];
      ctx!.fillStyle = '#070a12';
      ctx!.fillRect(0, 0, W, H);
      for (const b of blobs) {
        const cx = b.x * W + ox;
        const cy = b.y * H + oy;
        const R = b.r * M;
        const g = ctx!.createRadialGradient(cx, cy, 0, cx, cy, R);
        g.addColorStop(0, `rgba(${b.c},${b.a})`);
        g.addColorStop(0.45, `rgba(${b.c},${(b.a * 0.4).toFixed(3)})`);
        g.addColorStop(1, `rgba(${b.c},0)`);
        ctx!.fillStyle = g;
        ctx!.fillRect(0, 0, W, H);
      }
    }

    function drawDots(ox: number, oy: number): void {
      const offX = (((time * 3.2 + ox) % DOT) + DOT) % DOT;
      const offY = (((time * 2.0 + oy) % DOT) + DOT) % DOT;
      const cx = W / 2;
      const cy = H / 2;
      const maxD = Math.max(W, H) * 0.55;
      for (let x = offX - DOT; x < W + DOT; x += DOT) {
        for (let y = offY - DOT; y < H + DOT; y += DOT) {
          const dx = x - cx;
          const dy = y - cy;
          const d = Math.sqrt(dx * dx + dy * dy) / maxD;
          if (d >= 1) continue;
          const a = Math.pow(1 - d, 1.6) * 0.3;
          ctx!.fillStyle = `rgba(190,180,255,${a.toFixed(3)})`;
          ctx!.beginPath();
          ctx!.arc(x, y, 1.1, 0, TAU);
          ctx!.fill();
        }
      }
    }

    function drawStars(ox: number, oy: number): void {
      for (const s of stars) {
        const tw = 0.5 + 0.5 * Math.sin(time * s.f * 2 + s.p);
        const a = s.a * (0.3 + 0.7 * tw);
        ctx!.fillStyle = s.blue
          ? `rgba(200,190,255,${a.toFixed(3)})`
          : `rgba(236,243,255,${a.toFixed(3)})`;
        ctx!.beginPath();
        ctx!.arc(s.x * W + ox, s.y * H + oy, s.r, 0, TAU);
        ctx!.fill();
      }
    }

    function drawEmbers(ox: number, oy: number): void {
      ctx!.globalCompositeOperation = 'lighter';
      for (const e of embers) {
        const px = e.x * W + Math.sin(time * e.fr + e.ph) * e.amp + ox;
        const py = e.y + oy;
        const fade = clamp((H - e.y) / (H * 0.2), 0, 1) * clamp(e.y / (H * 0.35), 0, 1);
        const flick = 0.75 + 0.25 * Math.sin(time * 2.3 + e.ph);
        const s = e.size * 2.4;
        ctx!.globalAlpha = clamp(e.a * fade * flick, 0, 1);
        if (sprite) ctx!.drawImage(sprite, px - s / 2, py - s / 2, s, s);
      }
      ctx!.globalAlpha = 1;
      ctx!.globalCompositeOperation = 'source-over';
    }

    function maybeShot(dt: number): void {
      if (!shot) {
        if (time >= nextShot) {
          const ang = rand(0.34, 0.6);
          const speed = rand(700, 980);
          const D = rand(900, 1100);
          shot = {
            x: rand(0.08, 0.8) * W,
            y: rand(0.02, 0.3) * H,
            vx: Math.cos(ang),
            vy: Math.sin(ang),
            L: rand(150, 230),
            sp: speed,
            dur: D / speed,
            t: 0,
          };
        }
        return;
      }
      shot.t += dt;
      if (shot.t > shot.dur + 0.5) {
        shot = null;
        nextShot = time + rand(7, 16);
      }
    }

    function drawShot(ox: number, oy: number): void {
      if (!shot) return;
      const s = shot;
      const dist = s.sp * Math.min(s.t, s.dur);
      const alpha = s.t < s.dur ? 1 : clamp(1 - (s.t - s.dur) / 0.5, 0, 1);
      const hx = s.x + s.vx * dist + ox;
      const hy = s.y + s.vy * dist + oy;
      const tailLen = Math.min(dist, s.L);
      const g = ctx!.createLinearGradient(hx, hy, hx - s.vx * tailLen, hy - s.vy * tailLen);
      g.addColorStop(0, `rgba(240,247,255,${(0.95 * alpha).toFixed(3)})`);
      g.addColorStop(0.35, `rgba(200,190,255,${(0.45 * alpha).toFixed(3)})`);
      g.addColorStop(1, 'rgba(139,111,247,0)');
      ctx!.strokeStyle = g;
      ctx!.lineWidth = 1.4;
      ctx!.lineCap = 'round';
      ctx!.beginPath();
      ctx!.moveTo(hx, hy);
      ctx!.lineTo(hx - s.vx * tailLen, hy - s.vy * tailLen);
      ctx!.stroke();
      ctx!.fillStyle = `rgba(245,250,255,${(0.9 * alpha).toFixed(3)})`;
      ctx!.beginPath();
      ctx!.arc(hx, hy, 1.4, 0, TAU);
      ctx!.fill();
    }

    function update(dt: number): void {
      for (const s of stars) {
        s.y -= (s.sp * dt) / H;
        if (s.y < 0) s.y += 1;
      }
      for (let i = 0; i < embers.length; i++) {
        embers[i].y -= embers[i].vy * dt;
        if (embers[i].y < -12) embers[i] = newEmber(false);
      }
      maybeShot(dt);
    }

    function render(): void {
      const px = cur.x * PARALLAX;
      const py = cur.y * PARALLAX;
      drawNebula(px * 0.5, py * 0.5);
      drawDots(px * 0.25, py * 0.25);
      drawStars(px * 0.5, py * 0.5);
      drawEmbers(px * 0.9, py * 0.9);
      drawShot(px * 0.6, py * 0.6);
    }

    function frame(now: number): void {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      time += dt;
      const k = 1 - Math.pow(0.92, dt * 60);
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

    sprite = makeSprite();
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
    </>
  );
}
