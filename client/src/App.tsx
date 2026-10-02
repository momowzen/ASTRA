import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ApiError, clearSession, fetchData, getSession } from './api';
import type { DataResponse, Session } from './types';
import { LangProvider, loadLang, translate } from './i18n';
import type { Lang } from './i18n';
import Login from './components/Login';
import AdminApp from './components/AdminApp';
import MemberApp from './components/MemberApp';

const POLL_MS = 4000;
const WRITE_QUIET_MS = 12000;

interface Toast {
  id: number;
  msg: string;
  kind: 'ok' | 'err' | 'info';
}

export default function App() {
  const [session, setSession] = useState<Session | null>(() => getSession());
  const [data, setData] = useState<DataResponse | null>(null);
  const [error, setError] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [live, setLive] = useState<'live' | 'stale' | 'error'>('stale');
  const [, setTick] = useState(0);

  const revRef = useRef('');
  const pendingRef = useRef<DataResponse | null>(null);
  const lastWriteAt = useRef(0);
  const toastId = useRef(1);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const [lang, setLang] = useState<Lang>(loadLang);
  const setLangPersist = useCallback((l: Lang) => {
    setLang(l);
    try {
      localStorage.setItem('astra.lang', l);
    } catch {
      /* ignore */
    }
  }, []);
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang],
  );

  const pushToast = useCallback((msg: string, kind: Toast['kind'] = 'info') => {
    const id = toastId.current++;
    setToasts((prev) => [...prev.slice(-3), { id, msg, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3400);
  }, []);

  const applyData = useCallback((res: DataResponse) => {
    revRef.current = res.rev;
    pendingRef.current = null;
    setData(res);
  }, []);

  const loadFull = useCallback(async () => {
    const sess = getSession();
    if (!sess) return;
    setError('');
    try {
      const res = await fetchData();
      applyData(res);
      setLive('live');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      setError(err instanceof ApiError ? err.message : 'Failed to load data');
      setLive('error');
    }
  }, [applyData]);

  useEffect(() => {
    if (session) void loadFull();
    else {
      revRef.current = '';
      pendingRef.current = null;
      setData(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token]);

  useEffect(() => {
    function onUnauthorized() {
      setSession(null);
      setData(null);
    }
    window.addEventListener('astra:unauthorized', onUnauthorized);
    return () => window.removeEventListener('astra:unauthorized', onUnauthorized);
  }, []);

  useEffect(() => {
    if (!session) return;

    const interval = setInterval(async () => {
      if (!getSession()) return;
        const ae = document.activeElement;
        const typing =
          !!ae &&
          (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.tagName === 'SELECT') &&
          ae.getAttribute('type') !== 'checkbox';

        try {
          const res = await fetchData(revRef.current || undefined);
          setLive('live');

        if (res.unchanged) {
          if (pendingRef.current && !typing) applyData(pendingRef.current);
          return;
        }

        if (typing) {
          pendingRef.current = res;
          return;
        }

        const quiet = Date.now() - lastWriteAt.current < WRITE_QUIET_MS;
        if (revRef.current && res.rev !== revRef.current && !quiet) {
          pushToast(t('app.sheetUpdated'), 'info');
        }
        applyData(res);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return;
        setLive('error');
      }
    }, POLL_MS);

    return () => clearInterval(interval);
  }, [session, applyData, pushToast, t]);

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, []);

  const onPatch = useCallback(
    (tabTitle: string, updates: { row: number; col: number; value: string }[]) => {
      lastWriteAt.current = Date.now();
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tabs: prev.tabs.map((t) => {
            if (t.meta.title !== tabTitle) return t;
            return {
              ...t,
              rows: t.rows.map((r) => {
                const mine = updates.filter((u) => u.row === r.row);
                if (mine.length === 0) return r;
                const cells = [...r.cells];
                for (const u of mine) {
                  while (cells.length <= u.col) cells.push('');
                  cells[u.col] = u.value;
                }
                return { ...r, cells };
              }),
            };
          }),
        };
      });
    },
    [],
  );

  function logout() {
    clearSession();
    setSession(null);
    setData(null);
  }

  const liveNote =
    live === 'error' ? t('app.connectionLost') : live === 'stale' ? t('app.waiting') : t('app.live');

  let body: ReactNode;
  if (!session) {
    body = <Login onDone={(s) => setSession(s)} />;
  } else if (error && !data) {
    body = (
      <div className="auth">
        <div className="auth-card">
          <h1>{t('app.connectionProblem')}</h1>
          <p className="sub">{error}</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={() => void loadFull()}>
              {t('app.retry')}
            </button>
            <button className="btn btn-ghost" onClick={logout}>
              {t('common.signOut')}
            </button>
          </div>
        </div>
      </div>
    );
  } else if (!data) {
    body = (
      <div className="auth">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <span className="spinner" style={{ width: 26, height: 26, color: 'var(--accent)' }} />
          <p className="sub" style={{ marginTop: 16, marginBottom: 0 }}>
            {t('app.loadingData')}
          </p>
        </div>
      </div>
    );
  } else if (data.tabs.length === 0) {
    body = (
      <div className="auth">
        <div className="auth-card">
          <h1>{t('app.noTabs')}</h1>
          <p className="sub">{t('app.noTabsDesc')}</p>
          <button className="btn btn-ghost" onClick={logout}>
            {t('common.signOut')}
          </button>
        </div>
      </div>
    );
  } else {
    const shared = { data, session, live, liveNote, onPatch, toast: pushToast, onLogout: logout };
    body = session.role === 'ADMIN' ? <AdminApp {...shared} /> : <MemberApp {...shared} />;
  }

  return (
    <LangProvider lang={lang} setLang={setLangPersist}>
      {body}
      <Toasts items={toasts} />
    </LangProvider>
  );
}

function Toasts({ items }: { items: Toast[] }) {
  if (items.length === 0) return null;
  return (
    <div className="toasts">
      {items.map((t) => (
        <div key={t.id} className={`toast ${t.kind === 'ok' ? 'ok' : t.kind === 'err' ? 'err' : ''}`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
