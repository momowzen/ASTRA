import { FormEvent, useEffect, useState } from 'react';
import { login, ApiError, apiBase } from '../api';
import type { Session } from '../types';
import { LangToggle, useLang } from '../i18n';
import { APP_COMMIT, APP_VERSION } from 'virtual:astra-release';

export default function Login({ onDone }: { onDone: (session: Session) => void }) {
  const { t } = useLang();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch(`${apiBase()}/health`, { cache: 'no-store' });
        const data = (await res.json().catch(() => null)) as { ok?: boolean } | null;
        if (alive) setOnline(res.ok && !!data?.ok);
      } catch {
        if (alive) setOnline(false);
      }
    };
    void check();
    const id = window.setInterval(check, 15000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const session = await login(username, password);
      onDone(session);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('login.failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      {/* HUD chrome: viewport corner brackets */}
      <div className="auth-frame" aria-hidden="true" />

      <div className="auth-lang">
        <LangToggle />
      </div>

      <main className="auth-stage">
        <div className="auth-crest-wrap" aria-hidden="true">
          <div className="auth-crest-halo" />
          <div className="auth-crest-ring auth-crest-ring--outer" />
          <div className="auth-crest-ring auth-crest-ring--inner" />
          <div className="auth-crest-arc" />
          <img className="auth-crest" src="./assets/astra-crest.png" alt="" />
        </div>

        <h1 className="auth-wordmark">ASTRA</h1>
        <p className="auth-tagline">
          <span className="auth-tagline-slash">//</span> {t('login.tag')}
        </p>

        <form className="auth-console" onSubmit={submit}>
          <div className="auth-console-head">
            <span className="auth-console-title">{t('login.secureAccess')}</span>
            <span
              className={`auth-console-status${online === false ? ' offline' : ''}`}
              aria-live="polite"
            >
              <span className="status-dot" />
              {online === false ? t('login.systemsOffline') : t('login.systemsOnline')}
            </span>
          </div>

          {error && <div className="error">{error}</div>}

          <div className="field">
            <label htmlFor="u">{t('login.username')}</label>
            <input
              id="u"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('login.usernamePh')}
              autoFocus
              autoComplete="username"
              spellCheck={false}
            />
          </div>
          <div className="field">
            <label htmlFor="p">{t('login.password')}</label>
            <input
              id="p"
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button className="btn btn-primary auth-submit" type="submit" disabled={busy}>
            {busy ? (
              <span className="spinner" />
            ) : (
              <>
                {t('login.signIn')}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </>
            )}
          </button>

          <p className="auth-console-foot">
            <span className="auth-console-note">&gt; {t('login.members')} —</span> {t('login.hint')}
          </p>
        </form>
      </main>

      <footer className="auth-bar">
        <span className="auth-bar-mid mono">AUTHORIZED PERSONNEL ONLY</span>
        <span className="mono" title={`commit ${APP_COMMIT}`}>
          v{APP_VERSION}
        </span>
      </footer>
    </div>
  );
}
