import { FormEvent, useState } from 'react';
import { changePassword, ApiError } from '../api';
import { useLang } from '../i18n';

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
  currentLabel,
  onClose,
  onDone,
}: Props) {
  const { t } = useLang();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (next !== confirm) {
      setError(t('pw.mismatch'));
      return;
    }
    if (next.length < 6) {
      setError(t('pw.tooShort'));
      return;
    }
    setBusy(true);
    try {
      await changePassword(current, next);
      onDone?.();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('pw.couldNot'));
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
            <label>{t('pw.newPassword')}</label>
            <input
              className="input"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="field">
            <label>{t('pw.confirmNew')}</label>
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
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? <span className="spinner" /> : t('pw.update')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
