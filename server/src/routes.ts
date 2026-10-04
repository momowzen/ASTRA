import { Router, Response } from 'express';
import { config } from './config';
import * as sheets from './sheets';
import { findCredential, deleteCredential, setPassword, verifyCredential } from './credentials';
import { rateLimit, requireAdmin, requireAuth, signToken } from './auth';
import { findIgn, getSnapshot, getTab, scheduleRefresh, noteWrite, lastError } from './store';
import { BOSS_NAMES } from './bosses';

class ForbiddenRow extends Error {
  constructor(public row: number) {
    super(`Row ${row} does not belong to this member`);
  }
}

export const api = Router();

const MAX_VALUE_LEN = 1000;
const MAX_UPDATES = 200;

/** Database-only tabs backing the boss attendance tracker — never shown to any role. */
const INTERNAL_TABS = ['BOSS ATTENDANCE', 'BOSS CONFIG', 'DISTRIBUTION HISTORY', 'CP HISTORY'];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function intPoints(value: string | undefined): number {
  const n = parseInt(value ?? '', 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function distributionDate(d: Date): string {
  return `${MONTHS[d.getMonth()]}. ${d.getDate()}, ${d.getFullYear()}`;
}

function formatCp(value: string): string {
  const digits = value.replace(/[^0-9]/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('en-US');
}

function bad(res: Response, status: number, message: string): void {
  res.status(status).json({ error: message });
}

api.get('/health', (_req, res) => {
  let rev: string | null = null;
  let tabs = 0;
  try {
    const snap = getSnapshot();
    rev = snap.rev;
    tabs = snap.tabs.length;
  } catch {
    /* not loaded yet */
  }
  res.json({ ok: rev !== null, rev, tabs, lastError });
});

api.post('/auth/login', async (req, res) => {
  const username = String(req.body?.username ?? '').trim();
  const password = String(req.body?.password ?? '');
  if (!username || !password) return bad(res, 400, 'Username and password are required');

  const key = `login:${req.ip}:${username.toLowerCase()}`;
  if (!rateLimit(key, 10, 10 * 60 * 1000)) {
    return bad(res, 429, 'Too many login attempts. Try again in a few minutes.');
  }

  try {
    const cred = await findCredential(username);
    let role: 'ADMIN' | 'MEMBER';
    let canonical: string;

    if (cred) {
      if (!(await verifyCredential(cred, password))) {
        return bad(res, 401, 'Invalid username or password');
      }
      role = cred.role;
      canonical = cred.username;
    } else {
      // First login: members sign in with IGN / IGN until they set a password.
      const ign = findIgn(username);
      if (!ign || password !== ign) {
        return bad(res, 401, 'Invalid username or password');
      }
      await setPassword(ign, password, 'MEMBER');
      role = 'MEMBER';
      canonical = ign;
    }

    const session = {
      username: canonical,
      role,
      ign: role === 'ADMIN' ? '' : canonical,
    };
    const token = signToken(session);
    res.json({ token, role, username: canonical, ign: session.ign });
  } catch (err) {
    console.error('[auth] login failed:', err);
    bad(res, 500, 'Login failed. Please try again.');
  }
});

api.get('/me', requireAuth, (req, res) => {
  const s = req.session!;
  res.json({ username: s.username, role: s.role, ign: s.ign });
});

api.post('/auth/password', requireAuth, async (req, res) => {
  const s = req.session!;
  const current = String(req.body?.currentPassword ?? '');
  const next = String(req.body?.newPassword ?? '');
  if (!current || !next) return bad(res, 400, 'Current and new password are required');
  if (next.length < 6) return bad(res, 400, 'New password must be at least 6 characters');
  if (next.length > 128) return bad(res, 400, 'New password must be 128 characters or fewer');

  try {
    const cred = await findCredential(s.username);
    let ok: boolean;
    if (cred) {
      ok = await verifyCredential(cred, current);
    } else {
      // No stored password yet: the current password is still the initial one (IGN).
      ok = current === s.ign || current === s.username;
      if (ok && s.role === 'ADMIN') {
        ok = current === config.adminInitialPassword;
      }
    }
    if (!ok) return bad(res, 403, 'Current password is incorrect');
    await setPassword(s.username, next, s.role);
    res.json({ ok: true });
  } catch (err) {
    console.error('[auth] password change failed:', err);
    bad(res, 500, 'Could not change password');
  }
});

api.get('/data', requireAuth, (req, res) => {
  const s = req.session!;
  const snap = getSnapshot();

  const clientRev = typeof req.query.rev === 'string' ? req.query.rev : '';
  if (clientRev && clientRev === snap.rev) {
    res.json({ rev: snap.rev, unchanged: true });
    return;
  }

  const isAdmin = s.role === 'ADMIN';
  const ign = s.ign.toLowerCase();

  const tabs = snap.tabs
    .filter((t) => isAdmin || !INTERNAL_TABS.includes(t.meta.title.toUpperCase()))
    .map((t) => ({
      meta: t.meta,
      rows: isAdmin ? t.rows : t.rows.filter((r) => (r.cells[0] || '').trim().toLowerCase() === ign),
    }));

  res.json({
    rev: snap.rev,
    ts: snap.ts,
    serverTime: Date.now(),
    role: s.role,
    username: s.username,
    ign: s.ign,
    tabs,
  });
});

api.put('/tabs/:title/values', requireAuth, async (req, res) => {
  const title = decodeURIComponent(req.params.title);
  const tab = getTab(title);
  if (!tab) return bad(res, 404, 'Tab not found');
  if (title === config.credentialsTab) return bad(res, 403, 'This tab is not editable');

  const updates = req.body?.updates;
  if (!Array.isArray(updates) || updates.length === 0) {
    return bad(res, 400, 'No updates supplied');
  }
  if (updates.length > MAX_UPDATES) return bad(res, 400, 'Too many updates in one request');

  const s = req.session!;
  const isAdmin = s.role === 'ADMIN';
  if (!isAdmin && INTERNAL_TABS.includes(title.toUpperCase())) {
    return bad(res, 403, 'This tab is not editable');
  }
  const clean: { row: number; col: number; value: string }[] = [];

  for (const u of updates) {
    const row = Number(u?.row);
    const col = Number(u?.col);
    const value = String(u?.value ?? '');
    if (!Number.isInteger(row) || !Number.isInteger(col)) return bad(res, 400, 'Invalid update');
    if (row <= tab.meta.headerRows) return bad(res, 400, 'Cannot edit header rows');
    if (col < 0 || col >= tab.meta.columnCount) return bad(res, 400, 'Column out of range');
    if (value.length > MAX_VALUE_LEN) return bad(res, 400, 'Value too long');
    if (value.startsWith('=')) return bad(res, 400, 'Formulas are not allowed');
    if (!isAdmin) {
      if (col === 0) return bad(res, 403, 'You cannot change your IGN');
    }
    clean.push({ row, col, value });
  }

  try {
    if (!isAdmin) {
      const rows = [...new Set(clean.map((u) => u.row))];
      if (rows.length > 50) return bad(res, 400, 'Too many rows');
      const ranges = rows.map((r) => `${sheets.q(title)}!A${r}`);
      const live = await sheets.getCells(ranges);
      rows.forEach((rowNum, i) => {
        const owner = ((live[i] || [])[0] || '').trim().toLowerCase();
        if (owner !== s.ign.trim().toLowerCase()) {
          throw new ForbiddenRow(rowNum);
        }
      });
    }

    await sheets.batchUpdateValues(
      title,
      clean.map((u) => ({ a1: `${sheets.columnLetter(u.col)}${u.row}`, values: [[u.value]] })),
    );
    for (const u of clean) noteWrite(title, u.row, u.col, u.value);
    scheduleRefresh();
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof ForbiddenRow) {
      return bad(res, 403, 'That row does not belong to your IGN');
    }
    console.error('[write] cell update failed:', err);
    bad(res, 502, 'Could not write to the spreadsheet');
  }
});

api.post('/tabs/:title/rows', requireAuth, requireAdmin, async (req, res) => {
  const title = decodeURIComponent(req.params.title);
  const tab = getTab(title);
  if (!tab) return bad(res, 404, 'Tab not found');

  const cells = Array.isArray(req.body?.cells) ? req.body.cells.map((c: unknown) => String(c ?? '')) : null;
  if (!cells) return bad(res, 400, 'Row cells are required');
  if (cells.some((c: string) => c.length > MAX_VALUE_LEN)) return bad(res, 400, 'Value too long');
  if (cells.some((c: string) => c.startsWith('='))) return bad(res, 400, 'Formulas are not allowed');
  if (cells.length > tab.meta.columnCount) return bad(res, 400, 'Too many cells for this tab');
  if (!cells[0] || !cells[0].trim()) return bad(res, 400, 'IGN (first column) is required');
  if (tab.rows.some((r) => (r.cells[0] || '').trim().toLowerCase() === cells[0].trim().toLowerCase())) {
    return bad(res, 409, 'A row with this IGN already exists');
  }

  try {
    const padded = [...cells];
    while (padded.length < tab.meta.columnCount) padded.push('');
    await sheets.appendRow(title, padded, tab.meta.columnCount);
    scheduleRefresh();
    res.json({ ok: true });
  } catch (err) {
    console.error('[write] append row failed:', err);
    bad(res, 502, 'Could not add the row');
  }
});

api.delete('/tabs/:title/rows', requireAuth, requireAdmin, async (req, res) => {
  const title = decodeURIComponent(req.params.title);
  const tab = getTab(title);
  if (!tab) return bad(res, 404, 'Tab not found');

  const row = Number(req.query.row);
  if (!Number.isInteger(row) || row <= tab.meta.headerRows) return bad(res, 400, 'Invalid row');
  if (!tab.rows.some((r) => r.row === row)) return bad(res, 404, 'Row not found');

  try {
    await sheets.deleteRow(title, tab.meta.sheetId, row);
    scheduleRefresh();
    res.json({ ok: true });
  } catch (err) {
    console.error('[write] delete row failed:', err);
    bad(res, 502, 'Could not delete the row');
  }
});

api.post('/admin/reset-member', requireAuth, requireAdmin, async (req, res) => {
  const ign = String(req.query.ign ?? '').trim();
  if (!ign) return bad(res, 400, 'IGN is required');
  try {
    const removed = await deleteCredential(ign);
    res.json({ ok: true, removed });
  } catch (err) {
    console.error('[admin] reset member failed:', err);
    bad(res, 502, 'Could not reset the member password');
  }
});

api.post('/boss/config/seed', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const tab = getTab('BOSS CONFIG');
    if (tab && tab.rows.length > 0) {
      return res.json({ ok: true, seeded: false });
    }
    const rows: string[][] = [['Boss', 'Points'], ...BOSS_NAMES.map((name) => [name, '1'])];
    await sheets.batchUpdateValues('BOSS CONFIG', [{ a1: 'A1', values: rows }]);
    scheduleRefresh();
    res.json({ ok: true, seeded: true, count: BOSS_NAMES.length });
  } catch (err) {
    console.error('[boss] seed config failed:', err);
    bad(res, 502, 'Could not seed boss config');
  }
});

api.post('/boss/distribute', requireAuth, requireAdmin, async (req, res) => {
  const pool = Number(req.body?.pool);
  if (!Number.isFinite(pool) || pool <= 0) {
    return bad(res, 400, 'A positive diamond pool is required');
  }

  try {
    const snap = getSnapshot();
    const attTab = snap.tabs.find((t) => t.meta.title.toUpperCase() === 'BOSS ATTENDANCE');
    if (!attTab) return bad(res, 404, 'BOSS ATTENDANCE tab not found');

    const members = attTab.rows
      .map((r) => ({ ign: (r.cells[0] || '').trim(), points: intPoints(r.cells[1]) }))
      .filter((m) => m.ign && m.points > 0)
      .sort((a, b) => b.points - a.points || a.ign.localeCompare(b.ign));
    const topPoints = members[0]?.points ?? 0;
    const threshold = topPoints > 0 ? Math.max(1, Math.round(topPoints * 0.3)) : 0;
    const band = members.filter((m) => threshold > 0 && m.points >= threshold);
    if (band.length === 0) return bad(res, 400, 'No points to distribute yet');

    const totalBandPoints = band.reduce((s, m) => s + m.points, 0);

    const allocated = band.map((m) => ({
      ign: m.ign,
      points: m.points,
      diamonds: Math.round((pool * m.points) / totalBandPoints),
    }));
    const remainder = pool - allocated.reduce((s, m) => s + m.diamonds, 0);
    allocated[0].diamonds += remainder;

    const distTab = snap.tabs.find((t) => t.meta.title.toUpperCase() === 'DISTRIBUTION HISTORY');
    const header0 = distTab?.meta.headers[0] || [];
    const header1 = distTab?.meta.headers[1] || [];
    const date = distributionDate(new Date());

    // Locate today's date group (Points at odd columns) or append a new one.
    let pointsCol = -1;
    for (let i = 1; i < header0.length; i += 2) {
      if ((header0[i] || '').trim() === date) {
        pointsCol = i;
        break;
      }
    }
    const appending = pointsCol === -1;
    if (appending) pointsCol = header1.length > 0 ? header1.length : 1;
    const rewardCol = pointsCol + 1;

    const ignRow = new Map<string, number>();
    for (const r of distTab?.rows ?? []) {
      const ign = (r.cells[0] || '').trim();
      if (ign && !ignRow.has(ign)) ignRow.set(ign, r.row);
    }

    const writes: { a1: string; values: string[][] }[] = [];
    if (appending) {
      writes.push({ a1: `${sheets.columnLetter(pointsCol)}1`, values: [[date]] });
      writes.push({ a1: `${sheets.columnLetter(pointsCol)}2`, values: [['Points']] });
      writes.push({ a1: `${sheets.columnLetter(rewardCol)}2`, values: [['Reward']] });
    }

    const newRows: string[][] = [];
    for (const m of allocated) {
      const existing = ignRow.get(m.ign);
      if (existing) {
        writes.push({ a1: `${sheets.columnLetter(pointsCol)}${existing}`, values: [[String(m.points)]] });
        writes.push({ a1: `${sheets.columnLetter(rewardCol)}${existing}`, values: [[String(m.diamonds)]] });
      } else {
        const cells = new Array(rewardCol + 1).fill('');
        cells[0] = m.ign;
        cells[pointsCol] = String(m.points);
        cells[rewardCol] = String(m.diamonds);
        newRows.push(cells);
      }
    }

    await sheets.batchUpdateValues('DISTRIBUTION HISTORY', writes);
    for (const cells of newRows) {
      await sheets.appendRow('DISTRIBUTION HISTORY', cells, rewardCol + 1);
    }

    const reset = attTab.rows.map((r) => ({ a1: `${sheets.columnLetter(1)}${r.row}`, values: [['']] }));
    await sheets.batchUpdateValues('BOSS ATTENDANCE', reset);
    for (const r of attTab.rows) noteWrite('BOSS ATTENDANCE', r.row, 1, '');

    scheduleRefresh();
    res.json({ ok: true, date, pool, totalBandPoints, band: allocated });
  } catch (err) {
    console.error('[boss] distribute failed:', err);
    bad(res, 502, 'Could not distribute diamonds');
  }
});

const ATTENDANCE_PROMPT = `You transcribe player names from a game guild screenshot.
Output ONLY the player names visible in the image, one per line, in reading order.
Rules:
- Transcribe each name exactly as displayed, including decorations, spaces, punctuation, symbols and mixed scripts (e.g. "A \u00b7 \u536dTotik\u536d", "A . y").
- Do NOT correct spelling, do NOT translate.
- Do not output CP numbers, stat values, UI labels, headers, buttons, guild names or anything that is not a player name.
- No numbering, no bullets, no quotes, no commentary.
- If no player names are visible, output nothing.`;

interface DeepSeekResponse {
  error?: { message?: string };
  choices?: { message?: { content?: string } }[];
}

interface GeminiResponse {
  error?: { code?: number; message?: string };
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

/**
 * Free-tier friendly: models are tried in order, so a per-model daily quota
 * (429) or a transient overload (503) falls through to the next one. The
 * lite models reject thinkingConfig (400) and are retried without it.
 */
const GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
];

async function readWithDeepSeek(image: string): Promise<string> {
  const upstream = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.deepseekApiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-flash',
      messages: [
        { role: 'system', content: ATTENDANCE_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Transcribe the player names in this screenshot.' },
            { type: 'image_url', image_url: { url: image } },
          ],
        },
      ],
      stream: false,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const data = (await upstream.json().catch(() => null)) as DeepSeekResponse | null;
  if (!upstream.ok) {
    throw new Error(String(data?.error?.message ?? `HTTP ${upstream.status}`));
  }
  const text = String(data?.choices?.[0]?.message?.content ?? '');
  if (!text.trim()) throw new Error('empty reading');
  return text;
}

async function readWithGemini(image: string): Promise<string> {
  const mime = image.slice(image.indexOf('data:') + 5, image.indexOf(';'));
  const data = image.slice(image.indexOf(',') + 1);
  let lastError = '';
  for (const model of GEMINI_MODELS) {
    for (const thinking of [true, false]) {
      let status = 0;
      let message = '';
      try {
        const upstream = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.geminiApiKey },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: 'Transcribe the player names in this image.' },
                    { inline_data: { mime_type: mime, data } },
                  ],
                },
              ],
              systemInstruction: { parts: [{ text: ATTENDANCE_PROMPT }] },
              ...(thinking ? { generationConfig: { thinkingConfig: { thinkingBudget: 0 } } } : {}),
            }),
            signal: AbortSignal.timeout(60_000),
          },
        );
        const body = (await upstream.json().catch(() => null)) as GeminiResponse | null;
        status = body?.error?.code ?? upstream.status;
        if (upstream.ok) {
          const text = (body?.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('\n');
          if (text.trim()) return text;
          lastError = `${model}: empty reading`;
          break;
        }
        message = String(body?.error?.message ?? '').split('\n')[0];
      } catch (err) {
        message = (err as Error).message;
      }
      lastError = `${model}: ${message || `HTTP ${status}`}`;
      // Key or permission problems are provider-wide — other models won't help.
      if (status === 401 || status === 403) throw new Error(lastError);
      // Only a 400 is worth retrying without thinkingConfig (lite models).
      if (status !== 400 || !thinking) break;
    }
  }
  throw new Error(lastError || 'Gemini request failed');
}

api.post('/ocr/attendance', requireAuth, requireAdmin, async (req, res) => {
  const image = String(req.body?.image ?? '');
  if (!image.startsWith('data:image/') || !image.includes(';base64,')) {
    return bad(res, 400, 'A base64 image data URL is required');
  }
  if (image.length > 12_000_000) return bad(res, 413, 'Image is too large');

  const deepseek = config.aiProvider === 'deepseek';
  const provider = deepseek ? 'DeepSeek' : 'Gemini';
  if (!(deepseek ? config.deepseekApiKey : config.geminiApiKey)) {
    return bad(res, 503, `${deepseek ? 'DEEPSEEK' : 'GEMINI'}_API_KEY is not configured on the server`);
  }

  try {
    const text = deepseek ? await readWithDeepSeek(image) : await readWithGemini(image);
    res.json({ text });
  } catch (err) {
    console.error(`[ocr] ${provider} failed:`, err);
    bad(res, 502, `${provider}: ${(err as Error).message}`);
  }
});

api.post('/cp/update', requireAuth, requireAdmin, async (req, res) => {
  const items = req.body?.items;
  if (!Array.isArray(items) || items.length === 0) return bad(res, 400, 'No CP items supplied');

  try {
    const snap = getSnapshot();
    const basic = snap.tabs.find((t) => t.meta.title.toUpperCase() === 'BASIC INFORMATION');
    const cpHist = snap.tabs.find((t) => t.meta.title.toUpperCase() === 'CP HISTORY');
    if (!basic) return bad(res, 404, 'BASIC INFORMATION tab not found');
    if (!cpHist) return bad(res, 404, 'CP HISTORY tab not found');

    const clean: { ign: string; cp: string }[] = [];
    for (const it of items) {
      const ign = String(it?.ign ?? '').trim();
      const cp = formatCp(String(it?.cp ?? ''));
      if (!ign || !cp) continue;
      if (clean.some((c) => c.ign.toLowerCase() === ign.toLowerCase())) continue;
      clean.push({ ign, cp });
    }
    if (clean.length === 0) return bad(res, 400, 'No valid CP items supplied');

    const basicRow = new Map<string, number>();
    for (const r of basic.rows) {
      const ign = (r.cells[0] || '').trim();
      if (ign && !basicRow.has(ign)) basicRow.set(ign, r.row);
    }
    const histRow = new Map<string, number>();
    for (const r of cpHist.rows) {
      const ign = (r.cells[0] || '').trim();
      if (ign && !histRow.has(ign)) histRow.set(ign, r.row);
    }

    const header0 = cpHist.meta.headers[0] || ['IGN'];
    const date = distributionDate(new Date());
    // Reuse today's dated column when it already exists instead of adding a duplicate.
    const existingCol = header0.findIndex((h) => String(h ?? '').trim() === date);
    const reusedColumn = existingCol >= 0;
    const colIndex = reusedColumn ? existingCol : header0.length;
    const letter = sheets.columnLetter(colIndex);

    const basicWrites: { a1: string; values: string[][] }[] = [];
    const histWrites: { a1: string; values: string[][] }[] = reusedColumn
      ? []
      : [{ a1: `${letter}1`, values: [[date]] }];
    const newRows: string[][] = [];

    for (const it of clean) {
      const bRow = basicRow.get(it.ign);
      if (bRow) basicWrites.push({ a1: `${sheets.columnLetter(1)}${bRow}`, values: [[it.cp]] });
      const hRow = histRow.get(it.ign);
      if (hRow) {
        histWrites.push({ a1: `${letter}${hRow}`, values: [[it.cp]] });
      } else {
        const cells = new Array(colIndex + 1).fill('');
        cells[0] = it.ign;
        cells[colIndex] = it.cp;
        newRows.push(cells);
      }
    }

    await sheets.batchUpdateValues('BASIC INFORMATION', basicWrites);
    await sheets.batchUpdateValues('CP HISTORY', histWrites);
    for (const cells of newRows) {
      await sheets.appendRow('CP HISTORY', cells, colIndex + 1);
    }
    for (const it of clean) {
      const bRow = basicRow.get(it.ign);
      if (bRow) noteWrite('BASIC INFORMATION', bRow, 1, it.cp);
    }

    scheduleRefresh();
    res.json({ ok: true, date, count: clean.length, items: clean, reusedColumn });
  } catch (err) {
    console.error('[cp] update failed:', err);
    bad(res, 502, 'Could not update CP');
  }
});
