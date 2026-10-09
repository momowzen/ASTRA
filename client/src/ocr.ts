import { createWorker, PSM, setLogging } from 'tesseract.js';
import type { Worker } from 'tesseract.js';
import { request } from './api';

setLogging(false);

type OcrLanguage = 'eng' | 'kor' | 'jpn';

const workers = new Map<OcrLanguage, Promise<Worker>>();

function getWorker(lang: OcrLanguage): Promise<Worker> {
  let pending = workers.get(lang);
  if (!pending) {
    pending = createWorker(lang).catch((err) => {
      workers.delete(lang);
      throw err;
    });
    workers.set(lang, pending);
  }
  return pending;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Could not load image'));
    el.src = src;
  });
}

function otsuThreshold(gray: Uint8ClampedArray, total: number): number {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < total; i++) hist[gray[i]]++;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let varMax = 0;
  let threshold = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > varMax) {
      varMax = between;
      threshold = t;
    }
  }
  return threshold;
}

async function preprocess(image: string, factor = 3, binarize = true): Promise<string> {
  const img = await loadImage(image);
  const w = Math.max(1, Math.round(img.naturalWidth * factor));
  const h = Math.max(1, Math.round(img.naturalHeight * factor));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(img, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const total = w * h;
  const gray = new Uint8ClampedArray(total);
  let sum = 0;
  for (let i = 0; i < total; i++) {
    const v = Math.round(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]);
    gray[i] = v;
    sum += v;
  }

  const invert = sum / total < 128;
  if (invert) for (let i = 0; i < total; i++) gray[i] = 255 - gray[i];

  if (binarize) {
    const threshold = otsuThreshold(gray, total);
    for (let i = 0; i < total; i++) {
      const v = gray[i] < threshold ? 0 : 255;
      gray[i] = v;
    }
  }
  for (let i = 0; i < total; i++) {
    const v = gray[i];
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

async function recognize(lang: OcrLanguage, image: string, psm: PSM): Promise<string> {
  try {
    const worker = await getWorker(lang);
    await worker.setParameters({ tessedit_pageseg_mode: psm });
    const { data } = await worker.recognize(image);
    return (data.text ?? '').replace(/\r/g, '');
  } catch {
    return '';
  }
}

export type OcrFlow = 'cp' | 'attendance';

async function runPasses(image: string, psm: PSM, korBinarize: boolean): Promise<string[]> {
  const binarized = await preprocess(image, 3, true);
  const grayscale = await preprocess(image, 3, false);
  const [eng, kor, jpn] = await Promise.all([
    recognize('eng', binarized, psm),
    recognize('kor', korBinarize ? binarized : grayscale, psm),
    recognize('jpn', binarized, psm),
  ]);
  return [eng, kor, jpn];
}

async function ocrAttendance(image: string): Promise<string[]> {
  const binarized = await preprocess(image, 3, true);
  const gray4 = await preprocess(image, 4, false);
  const [eng, kor, jpn] = await Promise.all([
    recognize('eng', binarized, PSM.SPARSE_TEXT),
    recognize('kor', binarized, PSM.SPARSE_TEXT),
    recognize('jpn', binarized, PSM.SPARSE_TEXT),
  ]);
  const [korBig, engBlock] = await Promise.all([
    recognize('kor', gray4, PSM.SPARSE_TEXT),
    recognize('eng', binarized, PSM.SINGLE_BLOCK),
  ]);
  return [eng, kor, jpn, korBig, engBlock];
}

export const ATTENDANCE_READER: 'ai' | 'tesseract' = 'ai';

async function ocrAttendanceAI(image: string): Promise<string[]> {
  const { text } = await request<{ text: string }>('/ocr/attendance', {
    method: 'POST',
    body: JSON.stringify({ image }),
  });
  return [text];
}

export const CP_READER: 'ai' | 'tesseract' = 'ai';

async function ocrCpAI(image: string): Promise<string[]> {
  const { texts } = await request<{ texts: string[] }>('/ocr/cp', {
    method: 'POST',
    body: JSON.stringify({ image }),
  });
  if (!texts || texts.length === 0) throw new Error('empty reading');
  return texts;
}

async function ocrCp(image: string): Promise<string[]> {
  if (CP_READER === 'ai') {
    try {
      return await ocrCpAI(image);
    } catch {
    }
  }
  return runPasses(image, PSM.SINGLE_BLOCK, false);
}

export async function ocrVariants(image: string, flow: OcrFlow = 'cp'): Promise<string[]> {
  if (flow === 'attendance') {
    return ATTENDANCE_READER === 'ai' ? ocrAttendanceAI(image) : ocrAttendance(image);
  }
  return ocrCp(image);
}

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[øØ]/g, 'o')
    .replace(/[ー一丨卍]/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

const CHOSEONG = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];
const JUNGSEONG = [
  'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ',
];
const JONGSEONG = [
  '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ',
  'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];
const CHOSEONG_FOLD: Record<string, string> = { 'ㄲ': 'ㄱ', 'ㄸ': 'ㄷ', 'ㅃ': 'ㅂ', 'ㅆ': 'ㅅ', 'ㅉ': 'ㅈ' };
const COMPOUND_FOLD: Record<string, string> = {
  'ㅘ': 'ㅗㅏ', 'ㅙ': 'ㅗㅐ', 'ㅚ': 'ㅗㅣ', 'ㅝ': 'ㅜㅓ', 'ㅞ': 'ㅜㅔ', 'ㅟ': 'ㅜㅣ', 'ㅢ': 'ㅡㅣ',
  'ㄳ': 'ㄱㅅ', 'ㄵ': 'ㄴㅈ', 'ㄶ': 'ㄴㅎ', 'ㄺ': 'ㄹㄱ', 'ㄻ': 'ㄹㅁ', 'ㄼ': 'ㄹㅂ', 'ㄽ': 'ㄹㅅ',
  'ㄾ': 'ㄹㅌ', 'ㄿ': 'ㄹㅍ', 'ㅀ': 'ㄹㅎ', 'ㅄ': 'ㅂㅅ',
};

export function jamoFold(s: string): string {
  let out = '';
  for (const ch of normalize(s)) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp >= 0xac00 && cp <= 0xd7a3) {
      const i = cp - 0xac00;
      const choseong = CHOSEONG[Math.floor(i / 588)] ?? '';
      const jungseong = JUNGSEONG[Math.floor((i % 588) / 28)] ?? '';
      const jongseong = JONGSEONG[i % 28] ?? '';
      out +=
        (CHOSEONG_FOLD[choseong] ?? choseong) +
        (COMPOUND_FOLD[jungseong] ?? jungseong) +
        (COMPOUND_FOLD[jongseong] ?? jongseong);
    } else {
      out += ch;
    }
  }
  return out;
}

export function jamoBag(s: string): string {
  return [...jamoFold(s)].sort().join('');
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

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

export function parseCpLine(line: string): { name: string; cp: string } | null {
  const m = line.match(/(\d{1,3}(?:[.,]\d{3})+|\d+)\s*$/);
  if (!m || m.index === undefined) return null;
  const digits = m[1].replace(/\D/g, '');
  if (!digits) return null;
  const name = line
    .slice(0, m.index)
    .replace(/[^\p{L}\p{N}]+$/u, '')
    .trim();
  if (!name) return null;
  return { name, cp: digits };
}

export const MATCH_THRESHOLD = 0.6;

export function scoreIgn(name: string, roster: string[]): { ign: string; score: number } {
  const n = normalize(name);
  const j = jamoFold(name);
  if (!n && !j) return { ign: name, score: 0 };

  let bestIgn = name;
  let bestScore = 0;
  for (const r of roster) {
    const rn = normalize(r);
    const rj = jamoFold(r);
    if ((rn && rn === n) || (rj && rj === j)) return { ign: r, score: 1 };

    let score = Math.max(similarity(n, rn), similarity(j, rj));
    if (rn.length >= 3 && n.length >= 3 && (n.includes(rn) || rn.includes(n))) {
      const ratio = Math.min(rn.length, n.length) / Math.max(rn.length, n.length);
      score = Math.max(score, 0.7 + 0.25 * ratio);
    }
    if (score > bestScore) {
      bestScore = score;
      bestIgn = r;
    }
  }
  if (bestScore < 1) {
    const bag = jamoBag(bestIgn);
    for (const r of roster) {
      if (r !== bestIgn && jamoBag(r) === bag) return { ign: name, score: 0 };
    }
  }
  return { ign: bestIgn, score: bestScore };
}

export function matchIgn(name: string, roster: string[]): { ign: string; matched: boolean } {
  const { ign, score } = scoreIgn(name, roster);
  if (score >= MATCH_THRESHOLD) return { ign, matched: true };
  return { ign: name, matched: false };
}

export interface ScannedRow {
  name: string;
  cp: string;
  ign: string;
  matched: boolean;
  score: number;
  size: number;
}

export function mergeVariants(variants: string[], roster: string[]): ScannedRow[] {
  const groups = new Map<string, { name: string; cp: string }[]>();
  for (const text of variants) {
    for (const line of text.split('\n')) {
      const row = parseCpLine(line);
      if (!row) continue;
      const list = groups.get(row.cp);
      if (!list) {
        groups.set(row.cp, [{ name: row.name, cp: row.cp }]);
      } else if (!list.some((x) => x.name === row.name)) {
        list.push({ name: row.name, cp: row.cp });
      }
    }
  }

  const rows: ScannedRow[] = [];
  for (const list of groups.values()) {
    let best: ScannedRow | null = null;
    for (const cand of list) {
      const { ign, score } = scoreIgn(cand.name, roster);
      const matched = score >= MATCH_THRESHOLD;
      const row: ScannedRow = {
        name: cand.name,
        cp: cand.cp,
        ign: matched ? ign : cand.name,
        matched,
        score,
        size: list.length,
      };
      if (
        !best ||
        row.score > best.score ||
        (row.score === best.score && row.size > best.size)
      ) {
        best = row;
      }
    }
    if (best) rows.push(best);
  }
  return rows;
}

export function scanPartyIgns(variants: string[], roster: string[]): string[] {
  const best = new Map<string, number>();
  for (const text of variants) {
    for (const raw of text.split('\n')) {
      const line = raw.trim();
      if (!line || line.length > 60) continue;
      const candidates: string[] = [];
      const cpRow = parseCpLine(line);
      if (cpRow) candidates.push(cpRow.name);
      candidates.push(line);
      for (const cand of candidates) {
        const n = normalize(cand);
        if (n.length < 2 || /^\d+$/.test(n)) continue;
        const { ign, score } = scoreIgn(cand, roster);
        const accepted = score >= 1 || (n.length < 4 ? score >= 0.8 : score >= 0.68);
        if (!accepted) continue;
        if (score > (best.get(ign) ?? 0)) best.set(ign, score);
      }
    }
  }
  return [...best.keys()];
}
