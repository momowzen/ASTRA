import { config } from './config';
import * as sheets from './sheets';
import { hashPassword, verifyPassword } from './passwords';

export interface Credential {
  username: string;
  hash: string;
  salt: string;
  role: 'ADMIN' | 'MEMBER';
  createdAt: string;
  updatedAt: string;
  /** Roster identity (IGN column of the roster tab). Stable across username changes. */
  ign: string;
}

const HEADER = ['USERNAME', 'PASSWORD_HASH', 'SALT', 'ROLE', 'CREATED_AT', 'UPDATED_AT', 'IGN'];

function now(): string {
  return new Date().toISOString();
}

/** Create the hidden credentials tab if it does not exist yet. */
export async function ensureCredentialsTab(): Promise<void> {
  const meta = await sheets.getSpreadsheetMeta();
  let tab = meta.sheets.find((s) => s.title === config.credentialsTab);
  if (!tab) {
    try {
      const sheetId = await sheets.addSheet(config.credentialsTab);
      await sheets.setSheetHidden(sheetId, true);
      const admin = await hashPassword(config.adminInitialPassword);
      await sheets.updateValues(config.credentialsTab, 'A1:G2', [
        HEADER,
        [config.adminUsername, admin.hash, admin.salt, 'ADMIN', now(), now(), ''],
      ]);
      console.log(`[auth] created hidden credentials tab "${config.credentialsTab}" with seeded admin`);
      return;
    } catch (err) {
      // another instance may have created it concurrently — re-check below
      console.warn('[auth] addSheet failed, re-checking:', err instanceof Error ? err.message : err);
      tab = (await sheets.getSpreadsheetMeta()).sheets.find((s) => s.title === config.credentialsTab);
      if (!tab) throw err;
    }
  }
  if (!tab.hidden) {
    await sheets.setSheetHidden(tab.sheetId, true);
    console.log(`[auth] hid credentials tab "${config.credentialsTab}"`);
  }
}

function parse(rows: string[][]): Credential[] {
  const out: Credential[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const username = (r[0] || '').trim();
    if (!username) continue;
    const role = (r[3] || 'MEMBER').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'MEMBER';
    // Older rows have no IGN column — for members the username was the IGN.
    const ign = (r[6] || '').trim() || (role === 'ADMIN' ? '' : username);
    out.push({
      username,
      hash: r[1] || '',
      salt: r[2] || '',
      role,
      createdAt: r[4] || '',
      updatedAt: r[5] || '',
      ign,
    });
  }
  return out;
}

export async function listCredentials(): Promise<Credential[]> {
  const values = await sheets.getValues(config.credentialsTab);
  return parse(values);
}

export async function findCredential(username: string): Promise<Credential | null> {
  const want = username.trim().toLowerCase();
  const all = await listCredentials();
  return all.find((c) => c.username.toLowerCase() === want) || null;
}

/** Find a member's credential by their stable roster IGN. */
export async function findCredentialByIgn(ign: string): Promise<Credential | null> {
  const want = ign.trim().toLowerCase();
  if (!want) return null;
  const all = await listCredentials();
  return all.find((c) => c.ign && c.ign.toLowerCase() === want) || null;
}

/**
 * Create or update a credential row. Returns the sheet row number.
 * `ign` is only used when creating a new row.
 */
export async function setPassword(
  username: string,
  password: string,
  role: 'ADMIN' | 'MEMBER',
  ign = '',
): Promise<void> {
  const all = await listCredentials();
  const idx = all.findIndex((c) => c.username.toLowerCase() === username.trim().toLowerCase());
  const { hash, salt } = await hashPassword(password);
  const title = config.credentialsTab;
  if (idx >= 0) {
    // row in the sheet (header is row 1)
    const sheetRow = idx + 2;
    await sheets.updateValues(title, `B${sheetRow}:C${sheetRow}`, [[hash, salt]]);
    await sheets.updateValues(title, `D${sheetRow}:D${sheetRow}`, [[role]]);
    await sheets.updateValues(title, `F${sheetRow}:F${sheetRow}`, [[now()]]);
  } else {
    await sheets.appendRow(title, [username.trim(), hash, salt, role, now(), now(), ign.trim()], 7);
  }
}

/**
 * Change only the login username of an existing credential, keeping the IGN.
 * Persists the IGN column if it was never written.
 */
export async function renameUsername(currentUsername: string, newUsername: string, ign: string): Promise<void> {
  const all = await listCredentials();
  const idx = all.findIndex((c) => c.username.toLowerCase() === currentUsername.trim().toLowerCase());
  if (idx < 0) return;
  const sheetRow = idx + 2;
  const title = config.credentialsTab;
  await sheets.updateValues(title, `A${sheetRow}:A${sheetRow}`, [[newUsername.trim()]]);
  if (ign && !all[idx].ign) {
    await sheets.updateValues(title, `F${sheetRow}:G${sheetRow}`, [[now(), ign.trim()]]);
  } else {
    await sheets.updateValues(title, `F${sheetRow}:F${sheetRow}`, [[now()]]);
  }
}

export async function deleteCredentialByIgn(ign: string): Promise<boolean> {
  const want = ign.trim().toLowerCase();
  if (!want) return false;
  const meta = await sheets.getSpreadsheetMeta();
  const tab = meta.sheets.find((s) => s.title === config.credentialsTab);
  if (!tab) return false;
  const values = await sheets.getValues(config.credentialsTab);
  for (let i = 1; i < values.length; i++) {
    const r = values[i] || [];
    const rowIgn = (r[6] || '').trim() || ((r[3] || '').toUpperCase() === 'ADMIN' ? '' : (r[0] || '').trim());
    if (rowIgn.toLowerCase() === want) {
      await sheets.deleteRow(config.credentialsTab, tab.sheetId, i + 1);
      return true;
    }
  }
  return false;
}

export async function verifyCredential(cred: Credential, password: string): Promise<boolean> {
  if (!cred.hash || !cred.salt) return false;
  return verifyPassword(password, cred.hash, cred.salt);
}
