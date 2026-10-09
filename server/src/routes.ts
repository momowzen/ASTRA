import { Router, Response } from 'express';
import { config } from './config';
import * as sheets from './sheets';
import { findCredential, findCredentialByIgn, renameUsername, deleteCredentialByIgn, setPassword, verifyCredential } from './credentials';
import { rateLimit, requireAdmin, requireAuth, signToken } from './auth';
import { applyLocalWrite, findIgn, getSnapshot, getTab, rowBelongsTo, scheduleRefresh, noteWrite, lastError } from './store';
import { BOSS_NAMES } from './bosses';

class ForbiddenRow extends Error {
  constructor(public row: number) {
    super(`Row ${row} does not belong to this member`);
  }
}

export const api = Router();

const MAX_VALUE_LEN = 1000;
const MAX_UPDATES = 200;

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
    const cred = (await findCredential(username)) || (await findCredentialByIgn(username));
    let role: 'ADMIN' | 'MEMBER';
    let canonical: string;
    let ign: string;

    if (cred) {
      if (!(await verifyCredential(cred, password))) {
        return bad(res, 401, 'Invalid username or password');
      }
      role = cred.role;
      canonical = cred.username;
      ign = role === 'ADMIN' ? '' : cred.ign || canonical;
    } else {
      const found = findIgn(username);
      if (!found || password !== found) {
        return bad(res, 401, 'Invalid username or password');
      }
      await setPassword(found, password, 'MEMBER', found);
      role = 'MEMBER';
      canonical = found;
      ign = found;
    }

    const session = { username: canonical, role, ign };
    const token = signToken(session);
    res.json({ token, role, username: canonical, ign });
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
    const cred =
      (s.role === 'MEMBER' && s.ign ? await findCredentialByIgn(s.ign) : null) ||
      (await findCredential(s.username));
    let ok: boolean;
    if (cred) {
      ok = await verifyCredential(cred, current);
    } else {
      ok = current === s.ign || current === s.username;
      if (ok && s.role === 'ADMIN') {
        ok = current === config.adminInitialPassword;
      }
    }
    if (!ok) return bad(res, 403, 'Current password is incorrect');
    await setPassword(cred ? cred.username : s.username, next, s.role);
    res.json({ ok: true });
  } catch (err) {
    console.error('[auth] password change failed:', err);
    bad(res, 500, 'Could not change password');
  }
});

api.post('/auth/username', requireAuth, async (req, res) => {
  const s = req.session!;
  if (s.role !== 'MEMBER') return bad(res, 403, 'Only members can change their username');
  const current = String(req.body?.currentPassword ?? '');
  const next = String(req.body?.username ?? '').trim();
  if (!next) return bad(res, 400, 'A username is required');
  if (!current) return bad(res, 400, 'Your current password is required');

  try {
    const cred =
      (s.ign ? await findCredentialByIgn(s.ign) : null) || (await findCredential(s.username));
    let ok: boolean;
    if (cred) {
      ok = await verifyCredential(cred, current);
    } else {
      ok = current === s.ign || current === s.username;
    }
    if (!ok) return bad(res, 403, 'Current password is incorrect');

    const currentUsername = cred?.username ?? s.username;
    if (next.toLowerCase() !== currentUsername.toLowerCase()) {
      if (await findCredential(next)) return bad(res, 409, 'That username is already taken');
      const clash = findIgn(next);
      if (clash && clash.trim().toLowerCase() !== s.ign.trim().toLowerCase()) {
        return bad(res, 409, "That username matches another member's IGN");
      }
    }

    const ign = s.ign.trim() || cred?.ign || findIgn(currentUsername) || currentUsername;
    if (cred) {
      await renameUsername(cred.username, next, ign);
    } else {
      await setPassword(next, current, 'MEMBER', ign);
    }

    const session = { username: next, role: 'MEMBER' as const, ign };
    const token = signToken(session);
    res.json({ token, role: 'MEMBER', username: next, ign });
  } catch (err) {
    console.error('[auth] username change failed:', err);
    bad(res, 500, 'Could not change username');
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

  const basic = snap.tabs.find((t) => t.meta.title.toUpperCase() === 'BASIC INFORMATION');
  const roster: { ign: string; role: string; guild: string; cp: string }[] = [];
  if (basic) {
    const h = (basic.meta.headers[0] || []).map((x) => String(x).trim().toUpperCase());
    const roleI = h.indexOf('ROLE');
    const guildI = h.indexOf('GUILD');
    const cpI = h.indexOf('CP');
    for (const r of basic.rows) {
      const rowIgn = (r.cells[0] || '').trim();
      if (!rowIgn) continue;
      roster.push({
        ign: rowIgn,
        role: roleI >= 0 ? (r.cells[roleI] || '').trim() : '',
        guild: guildI >= 0 ? (r.cells[guildI] || '').trim() : '',
        cp: cpI >= 0 ? (r.cells[cpI] || '').trim() : '',
      });
    }
  }

  res.json({
    rev: snap.rev,
    ts: snap.ts,
    serverTime: Date.now(),
    role: s.role,
    username: s.username,
    ign: s.ign,
    tabs,
    roster,
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
      const unknown: number[] = [];
      for (const rowNum of rows) {
        if (tab.rows.some((r) => r.row === rowNum)) {
          if (!rowBelongsTo(tab, rowNum, s.ign)) throw new ForbiddenRow(rowNum);
        } else {
          unknown.push(rowNum);
        }
      }
      if (unknown.length > 0) {
        const live = await sheets.getCells(unknown.map((r) => `${sheets.q(title)}!A${r}`));
        unknown.forEach((rowNum, i) => {
          const owner = ((live[i] || [])[0] || '').trim().toLowerCase();
          if (owner !== s.ign.trim().toLowerCase()) {
            throw new ForbiddenRow(rowNum);
          }
        });
      }
    }

    await sheets.batchUpdateValues(
      title,
      clean.map((u) => ({ a1: `${sheets.columnLetter(u.col)}${u.row}`, values: [[u.value]] })),
    );
    for (const u of clean) noteWrite(title, u.row, u.col, u.value);
    for (const u of clean) applyLocalWrite(title, u.row, u.col, u.value);
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
    const removed = await deleteCredentialByIgn(ign);
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

const CP_PROMPT = `You read combat-power (CP) rows from a game guild screenshot.
For every visible member row, output one line: <player name>\t<combat power>
Rules:
- Transcribe the player name exactly as displayed, including decorations, spaces, punctuation, symbols and mixed scripts.
- Output the combat power as digits only (no commas, spaces or symbols).
- One line per row, in reading order. No headers, no numbering, no bullets, no quotes, no commentary.
- Skip a row if its name or number is unreadable.`;

interface DeepSeekResponse {
  error?: { message?: string };
  choices?: { message?: { content?: string } }[];
}

interface GroqResponse {
  error?: { message?: string };
  choices?: { message?: { content?: string } }[];
}

interface GeminiResponse {
  error?: { code?: number; message?: string };
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

async function readWithGroq(image: string, prompt: string): Promise<string> {
  const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.groqApiKey}` },
    body: JSON.stringify({
      model: 'qwen/qwen3.8-27b',
      messages: [
        { role: 'system', content: prompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Transcribe the player names in this screenshot.' },
            { type: 'image_url', image_url: { url: image } },
          ],
        },
      ],
      temperature: 0,
      reasoning_format: 'hidden',
      max_tokens: 1000,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const data = (await upstream.json().catch(() => null)) as GroqResponse | null;
  if (!upstream.ok) {
    throw new Error(String(data?.error?.message ?? `HTTP ${upstream.status}`));
  }
  const text = String(data?.choices?.[0]?.message?.content ?? '');
  if (!text.trim()) throw new Error('empty reading');
  return text;
}

const GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
];

async function readWithDeepSeek(image: string, prompt: string): Promise<string> {
  const upstream = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.deepseekApiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-flash',
      messages: [
        { role: 'system', content: prompt },
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

async function readWithGemini(image: string, prompt: string): Promise<string> {
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
                    { text: 'Read this screenshot.' },
                    { inline_data: { mime_type: mime, data } },
                  ],
                },
              ],
              systemInstruction: { parts: [{ text: prompt }] },
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
      if (status === 401 || status === 403) throw new Error(lastError);
      if (status !== 400 || !thinking) break;
    }
  }
  throw new Error(lastError || 'Gemini request failed');
}

function readerFor(provider: string): { name: string; key: string; read: (image: string, prompt: string) => Promise<string> } | null {
  switch (provider) {
    case 'groq':
      return { name: 'Groq', key: config.groqApiKey, read: readWithGroq };
    case 'gemini':
      return { name: 'Gemini', key: config.geminiApiKey, read: readWithGemini };
    case 'deepseek':
      return { name: 'DeepSeek', key: config.deepseekApiKey, read: readWithDeepSeek };
    default:
      return null;
  }
}

async function runOcrReader(
  image: string,
  prompt: string,
): Promise<{ ok: true; text: string } | { ok: false; status: number; error: string }> {
  if (!image.startsWith('data:image/') || !image.includes(';base64,')) {
    return { ok: false, status: 400, error: 'A base64 image data URL is required' };
  }
  if (image.length > 12_000_000) return { ok: false, status: 413, error: 'Image is too large' };

  const chosen = config.aiProviders.map(readerFor);
  if (chosen.some((r) => r === null)) {
    return { ok: false, status: 400, error: `Unknown AI_PROVIDER value: ${config.aiProviders.join(', ')}` };
  }
  const ready = chosen.filter((r): r is NonNullable<typeof r> => r !== null && r.key !== '');
  if (ready.length === 0) {
    return { ok: false, status: 503, error: 'No AI reader key is configured on the server' };
  }

  const errors: string[] = [];
  for (const reader of ready) {
    try {
      const text = await reader.read(image, prompt);
      return { ok: true, text };
    } catch (err) {
      console.error(`[ocr] ${reader.name} failed:`, err);
      errors.push(`${reader.name}: ${(err as Error).message}`);
    }
  }
  return { ok: false, status: 502, error: errors.join(' | ') };
}

async function runOcrReadersAll(
  image: string,
  prompt: string,
): Promise<{ ok: true; texts: string[] } | { ok: false; status: number; error: string }> {
  if (!image.startsWith('data:image/') || !image.includes(';base64,')) {
    return { ok: false, status: 400, error: 'A base64 image data URL is required' };
  }
  if (image.length > 12_000_000) return { ok: false, status: 413, error: 'Image is too large' };

  const chosen = config.aiProviders.map(readerFor);
  if (chosen.some((r) => r === null)) {
    return { ok: false, status: 400, error: `Unknown AI_PROVIDER value: ${config.aiProviders.join(', ')}` };
  }
  const ready = chosen.filter((r): r is NonNullable<typeof r> => r !== null && r.key !== '');
  if (ready.length === 0) {
    return { ok: false, status: 503, error: 'No AI reader key is configured on the server' };
  }

  const settled = await Promise.allSettled(ready.map((r) => r.read(image, prompt)));
  const texts: string[] = [];
  const errors: string[] = [];
  settled.forEach((res, i) => {
    if (res.status === 'fulfilled' && res.value.trim()) {
      texts.push(res.value);
    } else {
      const msg = res.status === 'rejected' ? (res.reason as Error).message : 'empty reading';
      console.error(`[ocr] ${ready[i].name} failed:`, msg);
      errors.push(`${ready[i].name}: ${msg}`);
    }
  });
  if (texts.length === 0) return { ok: false, status: 502, error: errors.join(' | ') || 'No reader produced text' };
  return { ok: true, texts };
}

api.post('/ocr/attendance', requireAuth, requireAdmin, async (req, res) => {
  const result = await runOcrReader(String(req.body?.image ?? ''), ATTENDANCE_PROMPT);
  if (!result.ok) return bad(res, result.status, result.error);
  res.json({ text: result.text });
});

api.post('/ocr/cp', requireAuth, requireAdmin, async (req, res) => {
  const result = await runOcrReadersAll(String(req.body?.image ?? ''), CP_PROMPT);
  if (!result.ok) return bad(res, result.status, result.error);
  res.json({ texts: result.texts });
});

api.post('/tts', requireAuth, async (req, res) => {
  const input = typeof req.body?.input === 'string' ? req.body.input.trim() : '';
  if (!input) return bad(res, 400, 'input is required');
  const voice = (typeof req.body?.voice === 'string' && req.body.voice.trim()) || config.ttsVoice || 'en-US-AvaNeural';
  try {
    const upstream = await fetch(`${config.ttsUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.ttsApiKey}`,
      },
      body: JSON.stringify({ model: 'tts-1', input: input.slice(0, 2000), voice, response_format: 'mp3' }),
    });
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      return bad(res, 502, `tts upstream ${upstream.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`);
    }
    const audio = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.send(audio);
  } catch (err) {
    return bad(res, 502, `tts unreachable: ${String((err as Error)?.message || err).slice(0, 200)}`);
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
