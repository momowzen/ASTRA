import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

interface Props {
  analyserRef: RefObject<AnalyserNode | null>;
  playing: boolean;
}

interface Star {
  x: number;
  y: number;
  z: number;
  hueOffset: number;
  size: number;
  twinkle: number;
}

const MAX_Z = 1.25;
const MIN_Z = 0.12;

function makeStar(initial: boolean): Star {
  return {
    x: Math.random() * 2 - 1,
    y: Math.random() * 2 - 1,
    z: initial ? MIN_Z + Math.random() * (MAX_Z - MIN_Z) : MAX_Z,
    hueOffset: (Math.random() * 2 - 1) * 58,
    size: 0.45 + Math.random() * 1.55,
    twinkle: Math.random() * Math.PI * 2,
  };
}

export default function MusicStarfield({ analyserRef, playing }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playingRef = useRef(playing);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 1;
    let height = 1;
    let stars: Star[] = [];
    let frame = 0;
    let last = performance.now();
    let level = 0;
    let bassLevel = 0;
    let trebleLevel = 0;
    let beat = 0;
    let hue = 28;
    let hueDrift = 0;
    let frequencyData: Uint8Array<ArrayBuffer> | null = null;
    let percussionHistory: number[] = [];
    let lastBeatAt = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(220, Math.max(80, (width * height) / 5000)));
      stars = Array.from({ length: count }, () => makeStar(true));
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const project = (star: Star, z: number) => {
      const scale = Math.min(width, height) * 0.58;
      return {
        x: width / 2 + (star.x * scale) / z,
        y: height / 2 + (star.y * scale) / z,
      };
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const analyser = analyserRef.current;
      let target = 0;
      let kick = 0;
      let treble = 0;
      let centroid = 0;

      if (analyser && playingRef.current) {
        if (!frequencyData || frequencyData.length !== analyser.frequencyBinCount) {
          frequencyData = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
        }
        analyser.getByteFrequencyData(frequencyData);

        const bins = frequencyData.length;
        const binHz = analyser.context.sampleRate / analyser.fftSize;
        const clampBin = (value: number) => Math.max(0, Math.min(bins - 1, Math.round(value)));
        const kickStart = clampBin(30 / binHz);
        const kickEnd = Math.max(kickStart + 1, clampBin(160 / binHz));
        const lowMidEnd = Math.max(kickEnd + 1, clampBin(500 / binHz));
        const midEnd = Math.max(lowMidEnd + 1, clampBin(2000 / binHz));
        const highEnd = Math.max(midEnd + 1, clampBin(8000 / binHz));

        let kickSum = 0;
        let lowMidSum = 0;
        let midSum = 0;
        let highSum = 0;
        let total = 0;
        let weighted = 0;

        for (let i = 0; i < bins; i += 1) {
          const value = frequencyData[i];
          total += value;
          weighted += i * value;
          if (i >= kickStart && i < kickEnd) kickSum += value;
          else if (i < lowMidEnd) lowMidSum += value;
          else if (i < midEnd) midSum += value;
          else if (i < highEnd) highSum += value;
        }

        kick = kickSum / (Math.max(1, kickEnd - kickStart) * 255);
        const lowMid = lowMidSum / (Math.max(1, lowMidEnd - kickEnd) * 255);
        const mid = midSum / (Math.max(1, midEnd - lowMidEnd) * 255);
        treble = highSum / (Math.max(1, highEnd - midEnd) * 255);
        centroid = total > 0 ? weighted / total / bins : 0;

        const energy = kick * 0.5 + lowMid * 0.25 + mid * 0.15 + treble * 0.1;
        target = Math.min(1, Math.pow(Math.max(0, energy), 0.65) * 1.9);

        const percussion = kick * 0.78 + lowMid * 0.22;
        percussionHistory.push(percussion);
        if (percussionHistory.length > 55) percussionHistory.shift();

        let average = 0;
        for (const value of percussionHistory) average += value;
        average /= percussionHistory.length;

        let variance = 0;
        for (const value of percussionHistory) variance += (value - average) ** 2;
        variance /= percussionHistory.length;

        const threshold = average + Math.max(0.012, Math.sqrt(variance) * 0.85);
        if (
          percussionHistory.length > 14 &&
          percussion > threshold &&
          percussion > 0.055 &&
          now - lastBeatAt > 105
        ) {
          lastBeatAt = now;
          beat = Math.min(1, 0.55 + (percussion - average) * 7);
        }
      } else if (percussionHistory.length) {
        percussionHistory = [];
      }

      level += (target - level) * (target > level ? 0.35 : 0.08);
      bassLevel += (kick - bassLevel) * (kick > bassLevel ? 0.4 : 0.1);
      trebleLevel += (treble - trebleLevel) * (treble > trebleLevel ? 0.4 : 0.12);
      beat = Math.max(0, beat - dt * 6.5);

      if (playingRef.current) {
        hueDrift = (hueDrift + dt * (7 + trebleLevel * 26 + beat * 45)) % 360;
      }
      const targetHue = playingRef.current
        ? (hueDrift + centroid * 330 + bassLevel * 85 + trebleLevel * 55 + beat * 140) % 360
        : 30;
      const hueDiff = ((targetHue - hue + 540) % 360) - 180;
      hue = (hue + hueDiff * (0.08 + beat * 0.4) + 360) % 360;

      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';

      const speed = reducedMotion ? 0 : Math.min(2.6, 0.035 + level * 1.25 + beat * 1.6);
      const twinkleSpeed = 0.0011 + trebleLevel * 0.006 + beat * 0.002;

      for (const star of stars) {
        const previousZ = star.z;
        star.z -= speed * dt * (0.55 + star.size * 0.35);

        if (star.z <= MIN_Z) {
          Object.assign(star, makeStar(false));
          continue;
        }

        const previous = project(star, previousZ);
        const current = project(star, star.z);
        const margin = 48;
        if (
          current.x < -margin ||
          current.x > width + margin ||
          current.y < -margin ||
          current.y > height + margin
        ) {
          Object.assign(star, makeStar(false));
          continue;
        }

        const depth = Math.max(0, Math.min(1, 1 - star.z / MAX_Z));
        const twinkle = 0.8 + 0.2 * Math.sin(now * twinkleSpeed + star.twinkle);
        const alpha = Math.min(
          0.98,
          (0.12 + depth * 0.62 + level * 0.32 + beat * 0.22) * twinkle,
        );
        const starHue = (hue + star.hueOffset + 360) % 360;
        const saturation = Math.min(100, 72 + level * 24 + beat * 18);
        const lightness = Math.min(88, 54 + depth * 12 + level * 12 + beat * 18);
        const lineWidth = Math.max(
          0.35,
          star.size * (0.4 + depth * 1.15) * (0.85 + level * 0.55 + beat * 0.55),
        );
        const radius = Math.max(
          0.4,
          star.size * (0.32 + depth * 0.9) * (0.9 + level * 0.45 + beat * 0.55),
        );

        if (depth > 0.45 && star.size > 0.9) {
          ctx.fillStyle = `hsla(${starHue}, ${saturation}%, ${lightness}%, ${alpha * (0.08 + beat * 0.18)})`;
          ctx.beginPath();
          ctx.arc(current.x, current.y, radius * (2.2 + beat * 1.8), 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.strokeStyle = `hsla(${starHue}, ${saturation}%, ${lightness}%, ${alpha})`;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(previous.x, previous.y);
        ctx.lineTo(current.x, current.y);
        ctx.stroke();

        ctx.fillStyle = `hsla(${starHue}, ${saturation}%, ${lightness}%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(current.x, current.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [analyserRef]);

  return <canvas ref={canvasRef} className="music-starfield" aria-hidden="true" />;
}
