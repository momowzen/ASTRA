import { FormEvent, useState } from 'react';
import { changePassword, ApiError } from '../api';

interface Props {
  title: string;
  description?: string;
  currentLabel?: string;
  onClose: () => void;
  onDone?: () => void;
}

export default function PasswordModal({
  title,
  description,
  currentLabel = 'Current password',
  onClose,
  onDone,
}: Props) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (next !== confirm) {
      setError('New passwords do not match');
      return;
    }
    if (next.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    setBusy(true);
    try {
      await changePassword(current, next);
      onDone?.();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not change password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h3>{title}</h3>
        {description && <p className="desc">{description}</p>}
        <form onSubmit={submit}>
          {error && <div className="error auth-error">{error}</div>}
          <div className="field">
            <label>{currentLabel}</label>
            <input
              className="input"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoFocus
              autoComplete="current-password"
            />
          </div>
          <div className="field">
            <label>New password</label>
            <input
              className="input"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="field">
            <label>Confirm new password</label>
            <input
              className="input"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="row">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? <span className="spinner" /> : 'Update password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
