import { Router, Response } from 'express';
import { config } from './config';
import * as sheets from './sheets';
import { findCredential, deleteCredential, setPassword, verifyCredential } from './credentials';
import { rateLimit, requireAdmin, requireAuth, signToken } from './auth';
import { findIgn, getSnapshot, getTab, scheduleRefresh, noteWrite, lastError } from './store';

class ForbiddenRow extends Error {
  constructor(public row: number) {
    super(`Row ${row} does not belong to this member`);
  }
}

export const api = Router();

const MAX_VALUE_LEN = 1000;
const MAX_UPDATES = 200;

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

  const tabs = snap.tabs.map((t) => ({
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
