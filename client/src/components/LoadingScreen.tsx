import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

const STROKES = [
  'M6 160 L48 40',
  'M48 40 L90 160',
  'M24 110 L73 110',
  'M216 58 C216 43 202 38 184 38 C164 38 151 46 151 61 C151 77 164 86 184 92 C204 98 215 107 215 125 C215 144 202 162 180 162 C159 162 144 154 141 141',
  'M250 40 L346 40',
  'M298 40 L298 160',
  'M374 40 L374 160',
  'M374 40 C415 40 429 52 429 70 C429 88 415 100 374 100',
  'M392 100 L444 160',
  'M486 160 L528 40',
  'M528 40 L570 160',
  'M504 110 L553 110',
];

const TRACE_START = 0.3;
const TRACE_DUR = 2.7;

export default function LoadingScreen({ onDone }: { onDone: () => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [timing, setTiming] = useState<{ delay: number; dur: number }[] | null>(null);

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
        const entry = { delay: TRACE_START + acc, dur };
        acc += dur;
        return entry;
      }),
    );
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const id = window.setTimeout(onDone, reduce ? 1300 : 4200);
    return () => window.clearTimeout(id);
  }, [onDone]);

  return (
    <div className={`intro${timing ? ' armed' : ''}`} aria-hidden="true">
      <svg ref={svgRef} className="intro-word" viewBox="0 0 576 200" preserveAspectRatio="xMidYMid meet">
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
