import { useEffect, useRef } from 'react';

/**
 * In-page host for the tools mini-app (Boss Tracker / Hidden Class / Relic).
 *
 * The tools still live as a standalone vanilla-JS app under `public/tools/`,
 * but instead of an iframe this component mounts them into the member page:
 *
 *  1. The `<body>` markup of `tools/index.html` is injected into a persistent
 *     `.tools-root` div.
 *  2. `style.css` + `theme.css` are injected as one `<style>` element with
 *     every selector scoped under `.tools-root`, so the tools' rules (and its
 *     `:root`/`html`/`body` resets) cannot touch the rest of the app. The
 *     tools' own `.embedded` rules are remapped onto the scope element - they
 *     express exactly the "let the host page show through" behavior we want.
 *  3. The Firebase compat SDK and `tools/app.js` are executed exactly once for
 *     the lifetime of the document. app.js is a global program (timers,
 *     Firestore listeners, document-level input handlers) that keeps writing
 *     to its nodes, so `.tools-root` stays mounted at all times and is hidden
 *     with CSS while another view is open; `visible` only controls when the
 *     app first boots.
 *
 * Once running, app.js exposes `window.ASTRA_TOOLS` - the API MemberApp uses
 * (`setPage`/`setLang`/`toggleAlarm`/status callbacks) via its `toolsApi()`.
 * Its relative asset URLs (`assets/...`) are rewritten against the app root
 * (see `__toolsUrl` in `tools/app.js`).
 */

const TOOLS_DIR = 'tools/';
/** Keep in sync with the `?v=` stamp on the app.js script tag in `tools/index.html`. */
const APP_JS = `${TOOLS_DIR}app.js?v=20261120a01`;
const FIREBASE_JS = [
  'https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore-compat.js',
];
const SCOPE = '.tools-root';

/** Boot state lives on `window` so a dev-server hot reload cannot re-run app.js. */
interface ToolsBootWindow extends Window {
  __astraToolsBoot?: Promise<void>;
  __astraToolsScripts?: Map<string, Promise<void>>;
  __astraToolsAppStarted?: boolean;
  ASTRA_TOOLS?: unknown;
}

/* -------------------------------------------------------------------------- */
/* CSS scoping                                                                */
/* -------------------------------------------------------------------------- */

function stripComments(css: string): string {
  // Comments can contain braces, which would confuse the block parser below.
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** `assets/...` in an injected stylesheet resolves against the host document. */
function rewriteAssetUrls(css: string): string {
  return css.replace(/url\((['"]?)assets\//g, (_m, quote: string) => `url(${quote}${TOOLS_DIR}assets/`);
}

/**
 * Prefixes one comma-separated selector list with the scope. `:root`/`html`/
 * `body` and the tools' `.embedded` mode all designate "the document root" -
 * inside the inlined page that role belongs to the scope element itself.
 */
function scopeSelectorList(prelude: string, scope: string): string {
  return prelude
    .split(',')
    .map((raw) => {
      let sel = raw.trim().replace(/\s+/g, ' ');
      if (sel === '.embedded') return scope;
      if (sel.startsWith('.embedded ')) sel = sel.slice('.embedded '.length);
      sel = sel.replace(/^(html|body|:root)(?=[\s.:#[+~>]|$)/, scope);
      if (sel === scope || sel.startsWith(`${scope} `) || sel.startsWith(`${scope}:`) || sel.startsWith(`${scope}::`)) {
        return sel;
      }
      return `${scope} ${sel}`;
    })
    .join(', ');
}

/**
 * Walks a stylesheet block by block, scoping every style rule. Conditional
 * at-rules (`@media`, `@supports`) recurse; `@keyframes`, `@font-face` and
 * friends are kept verbatim (keyframe selectors must not be scoped, and their
 * names do not collide with the host app's).
 */
function scopeRules(css: string, scope: string): string {
  let out = '';
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open < 0) {
      out += css.slice(i);
      break;
    }
    const prelude = css.slice(i, open).trim();
    let depth = 1;
    let end = open + 1;
    while (end < css.length && depth > 0) {
      if (css[end] === '{') depth += 1;
      else if (css[end] === '}') depth -= 1;
      end += 1;
    }
    const body = css.slice(open + 1, end - 1);
    const at = /^@[\w-]+/.exec(prelude)?.[0].toLowerCase() ?? '';
    if (at === '@media' || at === '@supports') {
      out += `${prelude} { ${scopeRules(body, scope)} }\n`;
    } else if (at) {
      out += `${prelude} { ${body} }\n`;
    } else if (prelude) {
      if (body.includes('{')) {
        // Nested rules would keep unscoped selectors; the tools' CSS is flat,
        // so this only guards against a future regression.
        console.warn('[ASTRA tools] nested rule in tools CSS was not scoped:', prelude);
      }
      out += `${scopeSelectorList(prelude, scope)} { ${body} }\n`;
    }
    i = end;
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Boot                                                                       */
/* -------------------------------------------------------------------------- */

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`ASTRA tools: ${url} responded ${res.status}`);
  return res.text();
}

function loadScript(src: string, retryable: boolean): Promise<void> {
  const w = window as ToolsBootWindow;
  const cache = (w.__astraToolsScripts ??= new Map());
  const cached = cache.get(src);
  if (cached) return cached;
  const promise = new Promise<void>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      el.remove();
      // A failed library load may be transient; app.js is never retried once
      // appended (a partial run leaves globals behind - re-running would clash).
      if (retryable) cache.delete(src);
      reject(new Error(`ASTRA tools: failed to load ${src}`));
    };
    document.head.appendChild(el);
  });
  cache.set(src, promise);
  return promise;
}

async function mountMarkup(root: HTMLElement): Promise<void> {
  if (root.firstElementChild) return;
  const html = await fetchText(`${TOOLS_DIR}index.html`);
  const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1];
  if (!body) throw new Error('ASTRA tools: tools/index.html has no <body> content');
  const markup = body
    // The firebase/app.js tags would be inert via innerHTML anyway; boot loads them explicitly.
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/(src|href)="assets\//g, `$1="${TOOLS_DIR}assets/`);
  root.innerHTML = markup;
}

async function mountStyles(): Promise<void> {
  if (document.querySelector('style[data-tools-scope]')) return;
  const [styleCss, themeCss] = await Promise.all([
    fetchText(`${TOOLS_DIR}style.css`),
    fetchText(`${TOOLS_DIR}theme.css`),
  ]);
  const style = document.createElement('style');
  style.setAttribute('data-tools-scope', '');
  style.textContent = [styleCss, themeCss]
    .map((css) => rewriteAssetUrls(scopeRules(stripComments(css), SCOPE)))
    .join('\n');
  document.head.appendChild(style);
}

async function bootTools(root: HTMLElement): Promise<void> {
  const w = window as ToolsBootWindow;
  if (w.__astraToolsBoot) return w.__astraToolsBoot;
  w.__astraToolsBoot = (async () => {
    try {
      await mountMarkup(root);
      await mountStyles();
      await loadScript(FIREBASE_JS[0], true);
      await loadScript(FIREBASE_JS[1], true);
      if (!w.ASTRA_TOOLS) {
        w.__astraToolsAppStarted = true;
        await loadScript(APP_JS, false);
      }
      if (!w.ASTRA_TOOLS) throw new Error('ASTRA tools: app.js ran without exposing window.ASTRA_TOOLS');
    } catch (err) {
      // Failures before app.js starts are safe to retry (the stages above are
      // idempotent); after app.js starts there is no clean re-entry.
      if (!w.__astraToolsAppStarted) w.__astraToolsBoot = undefined;
      throw err;
    }
  })();
  return w.__astraToolsBoot;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export interface ToolsHostProps {
  /** Whether the tools view is the active view (boot on first activation). */
  visible: boolean;
  /** Fired once `window.ASTRA_TOOLS` is available (again on each activation). */
  onLoad: () => void;
}

export default function ToolsHost({ visible, onLoad }: ToolsHostProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;

  useEffect(() => {
    const root = rootRef.current;
    if (!visible || !root) return;
    // ToolsHost stays mounted for the whole session (the tools mini-app is only
    // hidden via CSS), so it is safe to fire onLoad whenever boot resolves.
    // Gating on a `cancelled` flag made onLoad silently no-op under React
    // StrictMode's mount/unmount/remount cycle, which left the tools view
    // uninitialised until a manual page refresh.
    bootTools(root).then(
      () => onLoadRef.current(),
      (err) => console.error(err),
    );
  }, [visible]);

  return <div ref={rootRef} className={`tools-root${visible ? '' : ' is-off'}`} />;
}
