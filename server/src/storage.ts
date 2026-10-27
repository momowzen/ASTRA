import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Storage } from '@google-cloud/storage';
import sharp from 'sharp';
import { config } from './config';

const AVATAR_SIZE = 512;
const LOCAL_DIR = path.resolve(process.cwd(), 'uploads', 'avatars');

let storage: Storage | null = null;

function gcs(): Storage {
  if (!storage) {
    storage = new Storage({
      credentials: {
        client_email: config.serviceEmail,
        private_key: config.privateKey,
      },
      ...(config.googleProjectId ? { projectId: config.googleProjectId } : {}),
    });
  }
  return storage;
}

export async function prepareAvatar(input: Buffer): Promise<Buffer> {
  const meta = await sharp(input, { failOn: 'error' }).metadata();
  if (!meta.width || !meta.height) throw new Error('Could not read image dimensions');
  if (meta.width * meta.height > 40_000_000) throw new Error('Image dimensions are too large');

  return sharp(input, { failOn: 'error' })
    .rotate()
    .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', position: 'attention' })
    .webp({ quality: 84 })
    .toBuffer();
}

function publicBase(): string {
  if (config.storagePublicBase) return config.storagePublicBase.replace(/\/+$/, '');
  return `https://storage.googleapis.com/${config.storageBucket}`;
}

function localFileName(): string {
  return `${randomUUID().replace(/-/g, '').slice(0, 20)}.webp`;
}

export async function storeAvatar(
  buffer: Buffer,
  origin: string,
): Promise<{ url: string; key: string }> {
  const fileName = localFileName();

  if (config.storageBucket) {
    const key = `avatars/${fileName}`;
    await gcs().bucket(config.storageBucket).file(key).save(buffer, {
      contentType: 'image/webp',
      resumable: false,
      metadata: {
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });
    return { url: `${publicBase()}/${key}`, key };
  }

  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_DIR, fileName), buffer);
  return { url: `${origin.replace(/\/+$/, '')}/api/avatars/${fileName}`, key: fileName };
}

export async function deleteAvatarByUrl(url: string): Promise<void> {
  const value = (url || '').trim();
  if (!value) return;

  if (config.storageBucket) {
    const base = `${publicBase()}/`;
    if (value.startsWith(base)) {
      const key = value.slice(base.length);
      if (key) await gcs().bucket(config.storageBucket).file(key).delete({ ignoreNotFound: true });
      return;
    }
  }

  const marker = '/api/avatars/';
  const at = value.indexOf(marker);
  if (at >= 0) {
    const file = value.slice(at + marker.length).split(/[?#]/)[0];
    if (/^[A-Za-z0-9._-]+$/.test(file)) {
      await unlink(path.join(LOCAL_DIR, file)).catch(() => undefined);
    }
  }
}
