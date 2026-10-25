import { Readable } from 'node:stream';
import type { Request, Response } from 'express';
import { config } from './config';

export interface MediaTrack {
  id: string;
  title: string;
  artist: string;
  modified: string;
  mime: string;
  stream: string;
}

export interface MediaLibrary {
  folder: string;
  folderUrl: string;
  tracks: MediaTrack[];
  fetchedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const DRIVE_ORIGIN = 'https://drive.usercontent.google.com';

let cache: MediaLibrary | null = null;
let inflight: Promise<MediaLibrary> | null = null;

function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    })
    .replace(/&#(\d+);/g, (_, dec: string) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    })
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function parseLibrary(html: string, folderId: string): MediaLibrary {
  const folderMatch = /<title>([\s\S]*?)<\/title>/i.exec(html);
  const folder = decodeEntities(folderMatch?.[1]?.trim() || 'ASTRA SONGS');
  const tracks: MediaTrack[] = [];
  const seen = new Set<string>();
  const entryRe = /<div class="flip-entry"[^>]*id="entry-([^"]+)"[^>]*>([\s\S]*?)(?=<div class="flip-entry"|$)/g;

  let match: RegExpExecArray | null;
  while ((match = entryRe.exec(html))) {
    const [, id, body] = match;
    if (seen.has(id)) continue;

    const mimeMatch = /type\/(audio\/[a-z0-9.+-]+)/i.exec(body);
    const titleMatch = /<div class="flip-entry-title">([\s\S]*?)<\/div>/.exec(body);
    if (!titleMatch) continue;

    const rawTitle = decodeEntities(titleMatch[1].replace(/<[^>]*>/g, '')).trim();
    const audio = /type\/audio\//i.test(body) || /\.(mp3|m4a|aac|wav|ogg|flac)\b/i.test(rawTitle);
    if (!rawTitle || !audio) continue;

    const modifiedMatch = /<div class="flip-entry-last-modified"><div>([\s\S]*?)<\/div>/.exec(body);
    const modified = modifiedMatch
      ? decodeEntities(modifiedMatch[1].replace(/<[^>]*>/g, '')).trim()
      : '';
    const title = rawTitle.replace(/\.(mp3|m4a|aac|wav|ogg|flac)$/i, '').trim();

    seen.add(id);
    tracks.push({
      id,
      title: title || rawTitle,
      artist: 'ASTRA',
      modified,
      mime: mimeMatch?.[1] || 'audio/mpeg',
      stream: `/media/${encodeURIComponent(id)}/stream`,
    });
  }

  return {
    folder,
    folderUrl: `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}`,
    tracks,
    fetchedAt: Date.now(),
  };
}

async function fetchLibrary(): Promise<MediaLibrary> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(
      `https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(config.mediaFolderId)}#list`,
      {
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': 'ASTRA-Guild-Media/1.0',
        },
        signal: controller.signal,
      },
    );
    if (!res.ok) throw new Error(`Google Drive folder request failed (${res.status})`);
    return parseLibrary(await res.text(), config.mediaFolderId);
  } finally {
    clearTimeout(timer);
  }
}

export async function getMedia(force = false): Promise<MediaLibrary> {
  if (!force && cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache;
  if (inflight) return inflight;

  inflight = fetchLibrary()
    .then((next) => {
      cache = next;
      return next;
    })
    .catch((err) => {
      if (cache) {
        console.warn('[media] refresh failed; using cached library:', err instanceof Error ? err.message : err);
        return cache;
      }
      throw err;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

async function findTrack(id: string): Promise<MediaTrack | null> {
  const library = await getMedia();
  return library.tracks.find((track) => track.id === id) ?? null;
}

/**
 * Streams an audio file from the public Drive folder. Only IDs present in the
 * cached folder listing can be streamed, so this route cannot proxy arbitrary
 * Drive files.
 */
export async function streamMediaTrack(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id || '').trim();
  if (!/^[A-Za-z0-9_-]{10,}$/.test(id)) {
    res.status(400).json({ error: 'Invalid track' });
    return;
  }

  let track: MediaTrack | null;
  try {
    track = await findTrack(id);
  } catch (err) {
    console.error('[media] track lookup failed:', err instanceof Error ? err.message : err);
    res.status(502).json({ error: 'Could not load the music library' });
    return;
  }
  if (!track) {
    res.status(404).json({ error: 'Track not found' });
    return;
  }

  const controller = new AbortController();
  res.once('close', () => controller.abort());

  const upstreamHeaders: Record<string, string> = {
    Accept: '*/*',
    'User-Agent': 'ASTRA-Guild-Media/1.0',
  };
  const range = req.headers.range;
  if (range) upstreamHeaders.Range = range;

  let upstream: globalThis.Response;
  try {
    upstream = await fetch(
      `${DRIVE_ORIGIN}/download?id=${encodeURIComponent(id)}&export=download`,
      { headers: upstreamHeaders, signal: controller.signal },
    );
  } catch (err) {
    if (!res.headersSent) {
      console.error('[media] stream request failed:', err instanceof Error ? err.message : err);
      res.status(502).json({ error: 'Could not reach the music source' });
    }
    return;
  }

  if (!upstream.ok && upstream.status !== 206 && upstream.status !== 416) {
    if (!res.headersSent) res.status(502).json({ error: 'Could not load this track' });
    return;
  }

  res.status(upstream.status);
  for (const name of ['content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
    const value = upstream.headers.get(name);
    if (value) res.setHeader(name, value);
  }
  const safeName = track.title.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '').trim() || 'ASTRA track';
  res.setHeader('Content-Type', track.mime || 'audio/mpeg');
  res.setHeader('Content-Disposition', `inline; filename="${safeName}.mp3"`);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  if (!upstream.body) {
    res.end();
    return;
  }

  const stream = Readable.fromWeb(upstream.body as never);
  stream.on('error', (err) => {
    console.error('[media] stream failed:', err instanceof Error ? err.message : err);
    if (!res.headersSent) res.status(502);
    res.destroy();
  });
  res.once('close', () => stream.destroy());
  stream.pipe(res);
}
