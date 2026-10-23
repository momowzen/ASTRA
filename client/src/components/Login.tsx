import { FormEvent, useEffect, useState } from 'react';
import { login, ApiError, apiBase } from '../api';
import type { Session } from '../types';
import { LangToggle, useLang } from '../i18n';
import { version } from '../../package.json';

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
      <section className="auth-scene" aria-hidden="true">
        <div className="auth-scene-grid" />
        <div className="auth-crest-wrap">
          <div className="auth-crest-halo" />
          <div className="auth-crest-ring auth-crest-ring--outer" />
          <div className="auth-crest-ring auth-crest-ring--inner" />
          <img className="auth-crest" src="./assets/logo.png" alt="" />
        </div>
        <div className="auth-scene-copy">
          <span className="eyebrow">
            <span className="eyebrow-rule" />
            {t('login.tag')}
          </span>
          <p className="auth-scene-line">{t('login.sub')}</p>
          <div className="auth-scene-tags">
            <span>ROSTER</span>
            <span>ATTENDANCE</span>
            <span>DISTRIBUTION</span>
          </div>
        </div>
        <div className="auth-scene-foot">
          <span className="mono">ASTRA // GUILD MANAGER</span>
          <span className="mono">SECURE CHANNEL</span>
        </div>
      </section>

      <section className="auth-card">
        <div className="auth-lang">
          <LangToggle />
        </div>

        <div className="auth-mobile-brand">
          <img src="./assets/logo.png" alt="" />
          <span>ASTRA</span>
        </div>

        <div className="auth-card-body">
          <span className="eyebrow">
            <span className="eyebrow-rule" />
            SECURE ACCESS
          </span>
          <h1>{t('login.welcome')}</h1>
          <p className="sub">{t('login.sub')}</p>

          <form onSubmit={submit}>
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
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="hint">
            <strong>{t('login.members')}:</strong> {t('login.hint')}
          </div>
        </div>

        <div className="auth-card-foot">
          <span className={`auth-foot-status${online === false ? ' offline' : ''}`} aria-live="polite">
            <span className="status-dot" />
            {online === false ? 'SYSTEMS OFFLINE' : 'SYSTEMS ONLINE'}
          </span>
          <span className="mono">v{version}</span>
        </div>
      </section>
    </div>
  );
}
