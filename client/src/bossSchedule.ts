import { useEffect, useState } from 'react';
import { BOSSES } from './bosses';
import type { Boss } from './bosses';

/* ============================================================
   Shared hook for live boss data. Polls the timer doc every 30s and
   ticks every second so derived values (next spawn, today's list) stay
   current. Used by the top bar pill in both member and admin shells.
   ============================================================ */
export function useBossData(enabled: boolean): { timers: BossTimers; now: number } {
  const [timers, setTimers] = useState<BossTimers>({});
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const ctrl = new AbortController();
    const load = async () => {
      const next = await fetchBossTimers(ctrl.signal);
      if (alive && next) setTimers(next);
    };
    void load();
    const id = window.setInterval(() => void load(), 30000);
    return () => {
      alive = false;
      ctrl.abort();
      window.clearInterval(id);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [enabled]);

  return { timers, now };
}

/* Previous spawn instant (epoch ms) on or before `baseMs`, for weekly slots
   that just fired (within the tracker's 2-minute expiry window). */
export function prevSpawnAt(boss: Boss, baseMs: number): number | null {
  if (!boss.schedule?.length) return null;
  const base = new Date(baseMs + SCHEDULE_OFFSET_MS);
  let best: number | null = null;
  for (const slot of boss.schedule) {
    const at = new Date(base);
    const delay = (slot.d + 7 - base.getUTCDay()) % 7;
    at.setUTCDate(base.getUTCDate() + delay);
    at.setUTCHours(slot.h, slot.m, 0, 0);
    let ts = at.getTime() - SCHEDULE_OFFSET_MS;
    if (ts >= baseMs) ts -= WEEK_MS;
    if (best === null || ts > best) best = ts;
  }
  return best;
}

export interface TodayBoss {
  boss: Boss;
  at: number;
  remainingMs: number;
}

/* Bosses spawning today (UTC+9 day), mirroring the tracker's rUpcoming. */
export function todayBosses(timers: BossTimers, now: number): TodayBoss[] {
  const tKey = Math.floor((now + SCHEDULE_OFFSET_MS) / 86400000);
  const out: { boss: Boss; at: number }[] = [];
  const push = (boss: Boss, t: number) => {
    if (t <= now) {
      out.push({ boss, at: t });
      return;
    }
    const dk = Math.floor((t + SCHEDULE_OFFSET_MS) / 86400000);
    if (dk === tKey) out.push({ boss, at: t });
  };
  const expireMs = 120000;
  for (const boss of BOSSES) {
    if (boss.respawn) {
      const et = timerFor(timers, boss)?.endTime;
      if (et !== undefined) push(boss, et);
    } else if (boss.schedule?.length) {
      const x = nextSpawnAt(boss, timers, now);
      if (x !== null && x > now) push(boss, x);
      const p = prevSpawnAt(boss, now);
      if (p !== null && now - p <= expireMs) push(boss, p);
    }
  }
  out.sort((a, b) => a.at - b.at);
  return out.map(({ boss, at }) => ({ boss, at, remainingMs: at - now }));
}

/* ============================================================
   Boss spawn schedule - the same data the Boss Tracker tool uses.

   Spawn timers live in the boss bot's public Firestore doc and are read
   directly here (the tracker does the same from its iframe) so the top
   bar can show the next spawn while the tracker is not open.

   Two kinds of bosses:
   - respawn bosses: kill time + cooldown, taken from timers[id].endTime
   - weekly bosses: fixed weekly slots (UTC+9) from bosses.ts
   ============================================================ */

export interface BossTimer {
  endTime?: number;
  startedAt?: number;
  guild?: number;
}

export type BossTimers = Record<string, BossTimer>;

const TIMERS_URL =
  'https://firestore.googleapis.com/v1/projects/astra-boss-timer-759e5/databases/(default)/documents/timers/global?key=AIzaSyAboQqH7BmtLCO0ciHUvgGIUOU6SMzHnzo';

/* Weekly slots are entered in UTC+9; convert to epoch ms. */
const SCHEDULE_OFFSET_MS = 9 * 3600000;
const WEEK_MS = 7 * 24 * 3600000;

function toNumber(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/* Firestore REST encodes numbers as { integerValue: "1700000000000" }. */
function fsNumber(node: unknown): number | undefined {
  if (!node || typeof node !== 'object') return undefined;
  const n = node as { integerValue?: unknown; doubleValue?: unknown };
  return toNumber(n.integerValue ?? n.doubleValue);
}

/** Reads timers/global. Returns null when the fetch failed (keep last data). */
export async function fetchBossTimers(signal?: AbortSignal): Promise<BossTimers | null> {
  try {
    const res = await fetch(TIMERS_URL, { cache: 'no-store', signal });
    if (!res.ok) return null;
    const doc = (await res.json()) as {
      fields?: { timers?: { mapValue?: { fields?: Record<string, unknown> } } };
    };
    const fields = doc.fields?.timers?.mapValue?.fields;
    if (!fields) return {};
    const out: BossTimers = {};
    for (const [id, raw] of Object.entries(fields)) {
      const entry = (raw as { mapValue?: { fields?: Record<string, unknown> } })?.mapValue?.fields;
      if (!entry) continue;
      const endTime = fsNumber(entry.endTime);
      if (endTime === undefined) continue;
      out[id] = {
        endTime,
        startedAt: fsNumber(entry.startedAt),
        guild: fsNumber(entry.guild),
      };
    }
    return out;
  } catch {
    return null;
  }
}

/* Boss ids in Firestore may differ in case from the client list. */
function timerFor(timers: BossTimers, boss: Boss): BossTimer | undefined {
  const direct = timers[boss.id];
  if (direct) return direct;
  const want = boss.id.toLowerCase();
  for (const [id, timer] of Object.entries(timers)) {
    if (id.toLowerCase() === want) return timer;
  }
  return undefined;
}

/** Epoch ms of the next spawn strictly after `baseMs`, or null when unknown. */
export function nextSpawnAt(boss: Boss, timers: BossTimers, baseMs: number): number | null {
  if (boss.respawn) {
    const end = timerFor(timers, boss)?.endTime;
    return end !== undefined && end > baseMs ? end : null;
  }
  if (boss.schedule?.length) {
    const base = new Date(baseMs + SCHEDULE_OFFSET_MS);
    let best: number | null = null;
    for (const slot of boss.schedule) {
      const at = new Date(base);
      const delay = (slot.d + 7 - base.getUTCDay()) % 7;
      at.setUTCDate(base.getUTCDate() + delay);
      at.setUTCHours(slot.h, slot.m, 0, 0);
      let ts = at.getTime() - SCHEDULE_OFFSET_MS;
      if (ts <= baseMs) ts += WEEK_MS;
      if (best === null || ts < best) best = ts;
    }
    return best;
  }
  return null;
}

export interface NextSpawn {
  boss: Boss;
  at: number;
}

/** Nearest upcoming spawn across every tracked boss. */
export function computeNextSpawn(timers: BossTimers, baseMs: number): NextSpawn | null {
  let best: NextSpawn | null = null;
  for (const boss of BOSSES) {
    const at = nextSpawnAt(boss, timers, baseMs);
    if (at === null) continue;
    if (!best || at < best.at) best = { boss, at };
  }
  return best;
}

/** Compact countdown: "2d 4h", "3h 12m", "5m 09s", "42s". */
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}
