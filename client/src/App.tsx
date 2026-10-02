import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, clearSession, fetchData, getSession } from './api';
import type { DataResponse, Session } from './types';
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
  const [syncedAt, setSyncedAt] = useState(Date.now());
  const [, setTick] = useState(0);

  const revRef = useRef('');
  const pendingRef = useRef<DataResponse | null>(null);
  const lastWriteAt = useRef(0);
  const toastId = useRef(1);
  const sessionRef = useRef(session);
  sessionRef.current = session;

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
      setSyncedAt(Date.now());
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
        !!ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA') && ae.getAttribute('type') !== 'checkbox';

      try {
        const res = await fetchData(revRef.current || undefined);
        setLive('live');
        setSyncedAt(Date.now());

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
          pushToast('Sheet updated — view refreshed', 'info');
        }
        applyData(res);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return;
        setLive('error');
      }
    }, POLL_MS);

    return () => clearInterval(interval);
  }, [session, applyData, pushToast]);

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

  const secondsAgo = Math.max(0, Math.round((Date.now() - syncedAt) / 1000));
  const liveNote =
    live === 'error'
      ? 'connection lost'
      : live === 'stale'
        ? 'waiting for data…'
        : secondsAgo <= 1
          ? 'live · just synced'
          : `live · synced ${secondsAgo}s ago`;

  if (!session) {
    return (
      <>
        <Login onDone={(s) => setSession(s)} />
        <Toasts items={toasts} />
      </>
    );
  }

  if (error && !data) {
    return (
      <div className="auth">
        <div className="auth-card">
          <h1>Connection problem</h1>
          <p className="sub">{error}</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={() => void loadFull()}>
              Retry
            </button>
            <button className="btn btn-ghost" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
        <Toasts items={toasts} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="auth">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <span className="spinner" style={{ width: 26, height: 26, color: 'var(--accent)' }} />
          <p className="sub" style={{ marginTop: 16, marginBottom: 0 }}>
            Loading guild data…
          </p>
        </div>
        <Toasts items={toasts} />
      </div>
    );
  }

  if (data.tabs.length === 0) {
    return (
      <div className="auth">
        <div className="auth-card">
          <h1>No tabs found</h1>
          <p className="sub">The spreadsheet has no visible tabs, or the service account lost access.</p>
          <button className="btn btn-ghost" onClick={logout}>
            Sign out
          </button>
        </div>
        <Toasts items={toasts} />
      </div>
    );
  }

  const shared = { data, session, live, liveNote, onPatch, toast: pushToast, onLogout: logout };

  return (
    <>
      {session.role === 'ADMIN' ? <AdminApp {...shared} /> : <MemberApp {...shared} />}
      <Toasts items={toasts} />
    </>
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
