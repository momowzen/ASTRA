import { useEffect, useRef } from 'react';

interface TrailPoint {
  x: number;
  y: number;
  at: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  gold: boolean;
}

interface Pulse {
  x: number;
  y: number;
  life: number;
  max: number;
}

/**
 * Astral pointer: a glowing ring with a stardust trail.
 * Desktop + fine pointer only; disabled for reduced motion and touch.
 */
export default function CursorFX() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const media = window.matchMedia('(pointer: fine)');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!media.matches || reduce) return;

    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;


    let W = 0;
    let H = 0;
    let DPR = 1;
    let raf = 0;
    let running = true;
    let hasPointer = false;
    let lastX = 0;
    let lastY = 0;
    const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const trail: TrailPoint[] = [];
    const sparks: Spark[] = [];
    const pulses: Pulse[] = [];

    function resize(): void {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas!.width = Math.round(W * DPR);
      canvas!.height = Math.round(H * DPR);
      ctx!.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function addSpark(x: number, y: number, dx: number, dy: number, gold: boolean, force = 1): void {
      sparks.push({
        x,
        y,
        vx: -dx * 0.06 + (Math.random() - 0.5) * 0.8,
        vy: -dy * 0.06 + (Math.random() - 0.5) * 0.8,
        life: 1,
        max: 0.55 + Math.random() * 0.55,
        size: (0.8 + Math.random() * 1.8) * force,
        gold,
      });
      if (sparks.length > 70) sparks.shift();
    }

    function onMove(e: PointerEvent | MouseEvent): void {
      if (!hasPointer) {
        lastX = e.clientX;
        lastY = e.clientY;
        hasPointer = true;
      }
      if (e.clientX === lastX && e.clientY === lastY) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      lastX = e.clientX;
      lastY = e.clientY;

      const now = performance.now();
      trail.push({ x: e.clientX, y: e.clientY, at: now });
      if (trail.length > 32) trail.shift();

      if (Math.hypot(dx, dy) > 1.6) {
        addSpark(e.clientX, e.clientY, dx, dy, Math.random() < 0.7);
      }
    }

    function onDown(e: PointerEvent): void {
      if (!hasPointer) return;
      pulses.push({ x: e.clientX, y: e.clientY, life: 1, max: 0.55 });
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 0.6 + Math.random() * 1.8;
        addSpark(e.clientX, e.clientY, Math.cos(a) * s * 40, Math.sin(a) * s * 40, Math.random() < 0.6, 1.15);
      }
    }

    function onLeave(): void {
      hasPointer = false;
      trail.length = 0;
      sparks.length = 0;
      pulses.length = 0;
    }

    function draw(now: number, dt: number): void {
      ctx!.clearRect(0, 0, W, H);
      if (!hasPointer) return;

      ctx!.globalCompositeOperation = 'lighter';

      // Fading pointer trace.
      const cutoff = now - 280;
      while (trail.length > 0 && trail[0].at < cutoff) trail.shift();
      for (let i = 1; i < trail.length; i++) {
        const a = trail[i];
        const b = trail[i - 1];
        const age = 1 - (now - a.at) / 280;
        if (age <= 0) continue;
        ctx!.strokeStyle = `rgba(201,138,95,${(age * 0.2).toFixed(3)})`;
        ctx!.lineWidth = 1.1 * age;
        ctx!.lineCap = 'round';
        ctx!.beginPath();
        ctx!.moveTo(b.x, b.y);
        ctx!.lineTo(a.x, a.y);
        ctx!.stroke();
      }

      // Stardust.
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life -= dt / s.max;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.97;
        s.vy = s.vy * 0.97 + 0.015;
        const a = Math.min(1, s.life * 1.6);
        ctx!.fillStyle = s.gold
          ? `rgba(232,184,143,${(a * 0.8).toFixed(3)})`
          : `rgba(143,183,165,${(a * 0.72).toFixed(3)})`;
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.size * (0.4 + s.life * 0.6), 0, Math.PI * 2);
        ctx!.fill();
      }

      // Click pulses.
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.life -= dt / p.max;
        if (p.life <= 0) {
          pulses.splice(i, 1);
          continue;
        }
        const r = 12 + (1 - p.life) * 30;
        ctx!.strokeStyle = `rgba(232,184,143,${(p.life * 0.35).toFixed(3)})`;
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx!.stroke();
      }

      // Soft halo around the native pointer.
      const halo = ctx!.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 24);
      halo.addColorStop(0, 'rgba(232,184,143,0.18)');
      halo.addColorStop(0.45, 'rgba(127,168,143,0.08)');
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx!.fillStyle = halo;
      ctx!.beginPath();
      ctx!.arc(pointer.x, pointer.y, 24, 0, Math.PI * 2);
      ctx!.fill();

      ctx!.globalCompositeOperation = 'source-over';
    }

    let last = performance.now();
    function frame(now: number): void {
      if (!running) return;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      draw(now, dt);
      raf = requestAnimationFrame(frame);
    }

    function onVisibility(): void {
      running = !document.hidden;
      if (running) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      } else {
        cancelAnimationFrame(raf);
      }
    }

    function onMouseOut(e: MouseEvent): void {
      if (!e.relatedTarget) onLeave();
    }

    function onBlur(): void {
      onLeave();
    }

    resize();
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('resize', resize);
    window.addEventListener('mouseout', onMouseOut);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    raf = requestAnimationFrame(frame);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mouseout', onMouseOut);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={ref} className="cursor-fx-canvas" aria-hidden="true" />;
}
