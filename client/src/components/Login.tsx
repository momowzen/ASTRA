import { FormEvent, useState } from 'react';
import { login, ApiError } from '../api';
import type { Session } from '../types';
import { LangToggle, useLang } from '../i18n';

export default function Login({ onDone }: { onDone: (session: Session) => void }) {
  const { t } = useLang();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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
      <div className="auth-card">
        <div className="auth-lang">
          <LangToggle />
        </div>
        <div className="brand">
          <img className="mark" src="./assets/logo.png" alt="" />
          <div>
            <div className="name">ASTRA</div>
            <div className="tag">{t('login.tag')}</div>
          </div>
        </div>

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
          <button className="btn btn-primary" type="submit" disabled={busy} style={{ marginTop: 6 }}>
            {busy ? <span className="spinner" /> : t('login.signIn')}
          </button>
        </form>

        <div className="hint">
          <strong>{t('login.members')}:</strong> {t('login.hint')}
        </div>
      </div>
    </div>
  );
}
