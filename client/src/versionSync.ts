/**
 * Release sync: keeps open tabs in step with the deployed client build.
 *
 * Every push to main rebuilds the client and rewrites `version.json` next to
 * the bundle (see vite.config.ts). Open tabs compare that file against the
 * version they were built with and reload once when a new release appears —
 * so all logged-in users converge on the current release automatically.
 */
import { APP_COMMIT, APP_VERSION } from 'virtual:astra-release';

/** How often to check for a new release. */
const CHECK_MS = 60_000;
/** sessionStorage flag: only auto-reload once per target release per tab. */
const RELOAD_KEY = 'astra.release.reloaded';

/** True while the user is typing — reloading then would lose their input. */
function isTyping(): boolean {
  const ae = document.activeElement as HTMLElement | null;
  if (!ae) return false;
  const tag = ae.tagName;
  if (ae.isContentEditable) return true;
  if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') return false;
  const type = ae.getAttribute('type');
  return type !== 'checkbox' && type !== 'radio';
}

function alreadyTried(target: string): boolean {
  try {
    return sessionStorage.getItem(RELOAD_KEY) === target;
  } catch {
    return false;
  }
}

function markTried(target: string): void {
  try {
    sessionStorage.setItem(RELOAD_KEY, target);
  } catch {
    // Storage unavailable — reload anyway, the mismatch guard below won't hold.
  }
}

export function startVersionSync(): () => void {
  let stopped = false;

  async function check(): Promise<void> {
    if (stopped || document.hidden) return;
    try {
      // Cache-busted: GitHub Pages caches assets for ~10 minutes.
      const url = new URL('version.json', document.baseURI);
      url.searchParams.set('t', String(Date.now()));
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return;
      const data: unknown = await res.json();
      const version = String((data as { version?: unknown })?.version ?? '');
      const commit = String((data as { commit?: unknown })?.commit ?? '');
      if (!version && !commit) return;

      const current = `${APP_VERSION}:${APP_COMMIT}`;
      const deployed = `${version || APP_VERSION}:${commit || APP_COMMIT}`;
      if (deployed === current) return;

      // Already reloaded for this release and still mismatched (stale HTML
      // cache / mid-deploy): don't loop — wait for a manual refresh.
      if (alreadyTried(deployed)) return;

      // User is mid-typing: retry on the next tick instead of dropping input.
      if (isTyping()) return;

      markTried(deployed);
      window.location.reload();
    } catch {
      // Offline, dev server (404), transient network — try again next tick.
    }
  }

  const interval = setInterval(() => void check(), CHECK_MS);
  const initial = setTimeout(() => void check(), 8000);
  const onVisibility = () => {
    if (!document.hidden) void check();
  };
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    stopped = true;
    clearInterval(interval);
    clearTimeout(initial);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
