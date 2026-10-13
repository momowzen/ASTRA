import { FormEvent, useState } from 'react';
import { changePassword, setMemberEdit, ApiError } from '../api';
import { useLang } from '../i18n';

interface Props {
  memberEdit: boolean;
  sheetUrl?: string;
  onClose: () => void;
  toast: (msg: string, kind?: 'ok' | 'err') => void;
}

export default function AdminSettings({ memberEdit, sheetUrl, onClose, toast }: Props) {
  const { t } = useLang();
  const [view, setView] = useState<'menu' | 'password' | 'member'>('menu');

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [memberOn, setMemberOn] = useState(memberEdit);
  const [memberBusy, setMemberBusy] = useState(false);

  async function submitPassword(e: FormEvent) {
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
      toast(t('admin.passwordUpdated'), 'ok');
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('pw.couldNot'));
    } finally {
      setBusy(false);
    }
  }

  async function toggleMember(on: boolean) {
    setMemberBusy(true);
    try {
      await setMemberEdit(on);
      setMemberOn(on);
      toast(t('settings.saved'), 'ok');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : t('settings.couldNot'), 'err');
    } finally {
      setMemberBusy(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h3>{t('admin.settingsTitle')}</h3>

        {view === 'menu' && (
          <div className="settings-menu">
            <button type="button" className="settings-item" onClick={() => setView('password')}>
              <span>{t('settings.changePassword')}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <button type="button" className="settings-item" onClick={() => setView('member')}>
              <span>{t('settings.memberAccess')}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            {sheetUrl && (
              <button
                type="button"
                className="settings-item"
                onClick={() => window.open(sheetUrl, '_blank', 'noopener,noreferrer')}
              >
                <span>{t('settings.googleSheet')}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </button>
            )}
          </div>
        )}

        {view !== 'menu' && (
          <button type="button" className="settings-back" onClick={() => setView('menu')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {t('settings.back')}
          </button>
        )}

        {view === 'password' && (
          <form onSubmit={submitPassword}>
            {error && <div className="error auth-error">{error}</div>}
            <div className="field">
              <label>{t('admin.currentAdminPassword')}</label>
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
        )}

        {view === 'member' && (
          <div className="settings-toggle-row">
            <div>
              <div className="settings-toggle-label">{t('settings.memberEdit')}</div>
              <div className="settings-toggle-desc">
                {memberOn ? t('settings.memberEditOn') : t('settings.memberEditOff')}
              </div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={memberOn}
                disabled={memberBusy}
                onChange={(e) => void toggleMember(e.target.checked)}
              />
              <span className="switch-track">
                <span className="switch-thumb" />
              </span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
