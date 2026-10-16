import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

const STROKES = [
  'M55 40 L9 160',
  'M55 40 L101 160',
  'M27 114 L83 114',
  'M207 40 L145 40 L131 54 L131 86 L145 100 L193 100 L207 114 L207 146 L193 160 L131 160',
  'M237 40 L325 40',
  'M281 40 L281 160',
  'M355 40 L355 160',
  'M355 40 L412 40 L426 54 L426 86 L412 100 L355 100',
  'M390 100 L445 160',
  'M521 40 L475 160',
  'M521 40 L567 160',
  'M493 114 L549 114',
];

const CONVERGE_START = 0.9;
const CONVERGE_DUR = 0.9;
const TRACE_DUR = 2.4;
const HOLD = 0.7;
const WORD_OUT = CONVERGE_START + CONVERGE_DUR + TRACE_DUR + HOLD;
const BG_OUT = WORD_OUT + 0.2;
const INTRO_DONE = (BG_OUT + 0.5) * 1000;
const REDUCED_DONE = 1400;

interface Setup {
  nodes: { x: number; y: number }[];
  edges: { a: number; b: number }[];
  scatter: { dx: number; dy: number }[];
}

export default function LoadingScreen({ onDone }: { onDone: () => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [timing, setTiming] = useState<{ delay: number; dur: number }[] | null>(null);
  const [armed, setArmed] = useState(false);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const paths = Array.from(svg.querySelectorAll<SVGPathElement>('.trace-core'));
    const lens = paths.map((p) => p.getTotalLength());
    const total = lens.reduce((a, b) => a + b, 0) || 1;
    let acc = 0;
    setTiming(
      lens.map((l) => {
        const dur = (l / total) * TRACE_DUR;
        const entry = { delay: acc, dur };
        acc += dur;
        return entry;
      }),
    );

    const ids = new Map<string, number>();
    const nodes: { x: number; y: number }[] = [];
    const edges: { a: number; b: number }[] = [];
    const idOf = (p: DOMPoint) => {
      const k = `${Math.round(p.x)},${Math.round(p.y)}`;
      let i = ids.get(k);
      if (i === undefined) {
        i = nodes.length;
        ids.set(k, i);
        nodes.push({ x: p.x, y: p.y });
      }
      return i;
    };
    for (const p of paths) {
      const len = p.getTotalLength();
      edges.push({ a: idOf(p.getPointAtLength(0)), b: idOf(p.getPointAtLength(len)) });
    }
    const scatter = nodes.map(() => {
      const ang = Math.random() * Math.PI * 2;
      const r = 140 + Math.random() * 420;
      return { dx: Math.cos(ang) * r, dy: Math.sin(ang) * r * 0.6 };
    });
    setSetup({ nodes, edges, scatter });
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !setup) return;
    const stars = Array.from(svg.querySelectorAll<SVGCircleElement>('.con-star'));
    const links = Array.from(svg.querySelectorAll<SVGLineElement>('.con-link'));
    const { nodes, edges, scatter } = setup;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dur = reduce ? 0.0001 : CONVERGE_DUR * 1000;
    const startAt = performance.now() + (reduce ? 0 : CONVERGE_START * 1000);
    const staggerMax = 0.45;
    const pos = nodes.map((n) => ({ x: n.x, y: n.y }));
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    const apply = (t: number) => {
      for (let i = 0; i < nodes.length; i++) {
        const stagger = (i / Math.max(1, nodes.length - 1)) * staggerMax;
        const local = Math.min(1, Math.max(0, (t - stagger) / (1 - staggerMax)));
        const e = ease(local);
        pos[i].x = nodes[i].x + scatter[i].dx * (1 - e);
        pos[i].y = nodes[i].y + scatter[i].dy * (1 - e);
        const el = stars[i];
        if (el) {
          el.setAttribute('cx', pos[i].x.toFixed(2));
          el.setAttribute('cy', pos[i].y.toFixed(2));
        }
      }
      for (let k = 0; k < edges.length; k++) {
        const el = links[k];
        if (!el) continue;
        const { a, b } = edges[k];
        el.setAttribute('x1', pos[a].x.toFixed(2));
        el.setAttribute('y1', pos[a].y.toFixed(2));
        el.setAttribute('x2', pos[b].x.toFixed(2));
        el.setAttribute('y2', pos[b].y.toFixed(2));
      }
    };

    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - startAt) / dur));
      apply(t);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setArmed(true);
    };
    apply(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [setup]);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const id = window.setTimeout(onDone, reduce ? REDUCED_DONE : INTRO_DONE);
    return () => window.clearTimeout(id);
  }, [onDone]);

  return (
    <div className={`intro${armed ? ' armed' : ''}`} aria-hidden="true">
      <div className="intro-stars intro-stars--far" />
      <div className="intro-stars intro-stars--mid" />
      <div className="intro-stars intro-stars--near" />
      <svg ref={svgRef} className="intro-word" viewBox="0 0 576 200" preserveAspectRatio="xMidYMid meet">
        {setup && (
          <g className="constellation">
            {setup.edges.map((e, i) => {
              const a = setup.nodes[e.a];
              const b = setup.nodes[e.b];
              const sa = setup.scatter[e.a];
              const sb = setup.scatter[e.b];
              return (
                <line
                  key={`e${i}`}
                  className="con-link"
                  x1={(a.x + sa.dx).toFixed(2)}
                  y1={(a.y + sa.dy).toFixed(2)}
                  x2={(b.x + sb.dx).toFixed(2)}
                  y2={(b.y + sb.dy).toFixed(2)}
                />
              );
            })}
            {setup.nodes.map((n, i) => (
              <circle
                key={`n${i}`}
                className="con-star"
                r={1.7}
                cx={(n.x + setup.scatter[i].dx).toFixed(2)}
                cy={(n.y + setup.scatter[i].dy).toFixed(2)}
                style={{ '--d': `${(0.15 + i * 0.03).toFixed(2)}s` } as CSSProperties}
              />
            ))}
          </g>
        )}
        {STROKES.map((d, i) => {
          const s = timing?.[i];
          const gStyle: CSSProperties | undefined = s ? { animationDelay: `${s.delay}s` } : undefined;
          const pStyle: CSSProperties | undefined = s
            ? { animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s` }
            : undefined;
          return (
            <g key={i} className="stroke" style={gStyle}>
              <path className="trace trace-glow" d={d} pathLength={1} style={pStyle} />
              <path className="trace trace-core" d={d} pathLength={1} style={pStyle} />
              <path className="trace trace-beam" d={d} pathLength={1} style={pStyle} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
