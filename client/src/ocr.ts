import { createWorker, PSM } from 'tesseract.js';
import type { Worker } from 'tesseract.js';

let workerPromise: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker(['eng', 'kor', 'jpn']);
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
      return worker;
    })().catch((err) => {
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

/** Upscale the image (Tesseract reads small text much better when enlarged). */
async function upscale(image: string, factor = 2): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Could not load image'));
    el.src = image;
  });
  const w = Math.max(1, Math.round(img.naturalWidth * factor));
  const h = Math.max(1, Math.round(img.naturalHeight * factor));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/png');
}

/** Run OCR on an image data URL and return the raw text. */
export async function ocrImage(image: string): Promise<string> {
  const worker = await getWorker();
  const enlarged = await upscale(image, 2);
  const { data } = await worker.recognize(enlarged);
  return (data.text ?? '').replace(/\r/g, '');
}

/** Normalize for matching: lowercase and keep only letters + numbers. */
export function normalize(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[m][n];
}

/** Extract the trailing combat-power number from an OCR line, returning the name and raw digits. */
export function parseCpLine(line: string): { name: string; cp: string } | null {
  const m = line.match(/([\d][\d,.\s]*)\s*$/);
  if (!m) return null;
  const digits = m[1].replace(/[^\d]/g, '');
  if (!digits) return null;
  const name = line.slice(0, m.index).trim();
  if (!name) return null;
  return { name, cp: digits };
}

/** Match an OCR'd name to the roster, favoring the roster IGNs. */
export function matchIgn(name: string, roster: string[]): { ign: string; matched: boolean } {
  const n = normalize(name);
  if (!n) return { ign: name, matched: false };

  // exact normalized match
  for (const r of roster) {
    if (normalize(r) === n) return { ign: r, matched: true };
  }

  // containment match (OCR often drops/merges a few characters)
  let bestContain = '';
  for (const r of roster) {
    const rn = normalize(r);
    if (rn.length >= 4 && (n.includes(rn) || rn.includes(n))) {
      if (rn.length > bestContain.length) bestContain = r;
    }
  }
  if (bestContain) return { ign: bestContain, matched: true };

  // fuzzy (levenshtein ratio)
  let bestIgn = '';
  let bestDist = Infinity;
  for (const r of roster) {
    const rn = normalize(r);
    const d = levenshtein(n, rn);
    if (d < bestDist) {
      bestDist = d;
      bestIgn = r;
    }
  }
  if (bestIgn) {
    const maxLen = Math.max(n.length, normalize(bestIgn).length);
    const ratio = 1 - bestDist / maxLen;
    if (ratio >= 0.6) return { ign: bestIgn, matched: true };
  }

  return { ign: name, matched: false };
}
