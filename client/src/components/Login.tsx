import { FormEvent, useState } from 'react';
import { login, ApiError } from '../api';
import type { Session } from '../types';

export default function Login({ onDone }: { onDone: (session: Session) => void }) {
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
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="brand">
          <svg className="mark" viewBox="0 0 64 64" aria-hidden>
            <defs>
              <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#8b7cff" />
                <stop offset="1" stopColor="#f5b942" />
              </linearGradient>
            </defs>
            <rect width="64" height="64" rx="16" fill="#0a0e1a" stroke="#232c4a" />
            <path
              fill="url(#lg)"
              d="M32 10l5.4 14.7L52 29.2 37.2 34.6 32 49l-5.2-14.4L12 29.2l14.6-4.5L32 10z"
            />
            <circle cx="47" cy="16" r="3" fill="#f5b942" />
          </svg>
          <div>
            <div className="name">ASTRA</div>
            <div className="tag">Guild Manager</div>
          </div>
        </div>

        <h1>Welcome back</h1>
        <p className="sub">Sign in to manage the guild roster and your profile.</p>

        <form onSubmit={submit}>
          {error && <div className="error">{error}</div>}
          <div className="field">
            <label htmlFor="u">Username</label>
            <input
              id="u"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin or your IGN"
              autoFocus
              autoComplete="username"
            />
          </div>
          <div className="field">
            <label htmlFor="p">Password</label>
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
            {busy ? <span className="spinner" /> : 'Sign in'}
          </button>
        </form>

        <div className="hint">
          <strong>Members:</strong> your username and initial password are both your IGN. You can
          change your password from your profile settings after signing in.
        </div>
      </div>
    </div>
  );
}
