import { getToken } from './sheets';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';

export interface DriveStoreResult {
  url: string;
  key: string; // file id
}

function folderId(): string {
  return (process.env.GOOGLE_DRIVE_FOLDER_ID || '').trim();
}

export function isDriveConfigured(): boolean {
  return folderId().length > 0;
}

export async function storeAvatar(buffer: Buffer): Promise<DriveStoreResult> {
  const fid = folderId();
  if (!fid) throw new Error('GOOGLE_DRIVE_FOLDER_ID is not set');

  const fileName = `${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36)}.webp`;
  const boundary = `astra_${Date.now()}`;
  const meta = JSON.stringify({ name: fileName, parents: [fid] });

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: image/webp\r\n\r\n`),
    buffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const token = await getToken();
  const res = await fetch(`${DRIVE_UPLOAD}?uploadType=multipart&fields=id,name`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  const data = (await res.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };
  if (!res.ok || !data.id) {
    throw new Error(`Drive upload failed: ${data.error?.message || res.statusText}`);
  }
  const fileId = data.id;

  // Make the file publicly viewable (anyone with link).
  const permRes = await fetch(`${DRIVE_API}/files/${fileId}/permissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  });
  if (!permRes.ok) {
    const p = await permRes.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(`Drive permission failed: ${p.error?.message || permRes.statusText}`);
  }

  return { url: `https://lh3.googleusercontent.com/d/${fileId}`, key: fileId };
}

export async function deleteAvatarByUrl(url: string): Promise<void> {
  const value = (url || '').trim();
  if (!value) return;
  const marker = 'lh3.googleusercontent.com/d/';
  const at = value.indexOf(marker);
  if (at < 0) return;
  const fileId = value.slice(at + marker.length).split(/[?#]/)[0];
  if (!/^[A-Za-z0-9_-]+$/.test(fileId)) return;

  const token = await getToken();
  const res = await fetch(`${DRIVE_API}/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  // Ignore 404 (already deleted).
  if (!res.ok && res.status !== 404) {
    const data = await res.json().catch(() => ({})) as { error?: { message?: string } };
    console.warn('[drive] delete failed:', data.error?.message || res.statusText);
  }
}
