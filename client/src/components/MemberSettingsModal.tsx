import { FormEvent, useState } from 'react';
import { changePassword, changeUsername, ApiError } from '../api';
import type { Session } from '../types';
import { useLang } from '../i18n';

interface Props {
  session: Session;
  onClose: () => void;
  onSessionChange: (s: Session) => void;
  toast: (msg: string, kind?: 'ok' | 'err') => void;
}

export default function MemberSettingsModal({ session, onClose, onSessionChange, toast }: Props) {
  const { t } = useLang();
  const [view, setView] = useState<'menu' | 'username' | 'password'>('menu');

  const [username, setUsername] = useState(session.username);
  const [unamePw, setUnamePw] = useState('');
  const [unameErr, setUnameErr] = useState('');
  const [unameBusy, setUnameBusy] = useState(false);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  async function submitUsername(e: FormEvent) {
    e.preventDefault();
    setUnameErr('');
    const value = username.trim();
    if (!value) {
      setUnameErr(t('member.usernameRequired'));
      return;
    }
    if (value.toLowerCase() === session.username.toLowerCase()) {
      setUnameErr(t('member.usernameSame'));
      return;
    }
    if (!unamePw) {
      setUnameErr(t('member.usernamePasswordRequired'));
      return;
    }
    setUnameBusy(true);
    try {
      const s = await changeUsername(unamePw, value);
      onSessionChange(s);
      setUsername(s.username);
      setUnamePw('');
      toast(t('member.usernameUpdated'), 'ok');
      setView('menu');
    } catch (err) {
      setUnameErr(err instanceof ApiError ? err.message : t('member.couldNotChangeUsername'));
    } finally {
      setUnameBusy(false);
    }
  }

  async function submitPassword(e: FormEvent) {
    e.preventDefault();
    setPwErr('');
    if (next !== confirm) {
      setPwErr(t('pw.mismatch'));
      return;
    }
    if (next.length < 6) {
      setPwErr(t('pw.tooShort'));
      return;
    }
    setPwBusy(true);
    try {
      await changePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      toast(t('member.passwordUpdated'), 'ok');
      setView('menu');
    } catch (err) {
      setPwErr(err instanceof ApiError ? err.message : t('pw.couldNot'));
    } finally {
      setPwBusy(false);
    }
  }

  const chevron = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h3>{t('member.settingsTitle')}</h3>

        {view === 'menu' && (
          <>
            <p className="desc">{t('member.settingsDesc')}</p>
            <div className="settings-menu">
              <button type="button" className="settings-item" onClick={() => setView('username')}>
                <span>{t('member.usernameSection')}</span>
                {chevron}
              </button>
              <button type="button" className="settings-item" onClick={() => setView('password')}>
                <span>{t('member.passwordSection')}</span>
                {chevron}
              </button>
            </div>
          </>
        )}

        {view !== 'menu' && (
          <button type="button" className="settings-back" onClick={() => setView('menu')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {t('settings.back')}
          </button>
        )}

        {view === 'username' && (
          <form onSubmit={submitUsername}>
            <div className="settings-section-title">{t('member.usernameSection')}</div>
            {unameErr && <div className="error auth-error">{unameErr}</div>}
            <div className="field">
              <label>{t('member.newUsername')}</label>
              <input
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>
            <div className="field">
              <label>{t('member.currentPassword')}</label>
              <input
                className="input"
                type="password"
                value={unamePw}
                onChange={(e) => setUnamePw(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="row">
              <button type="submit" className="btn btn-primary" disabled={unameBusy}>
                {unameBusy ? <span className="spinner" /> : t('member.changeUsername')}
              </button>
            </div>
          </form>
        )}

        {view === 'password' && (
          <form onSubmit={submitPassword}>
            <div className="settings-section-title">{t('member.passwordSection')}</div>
            {pwErr && <div className="error auth-error">{pwErr}</div>}
            <div className="field">
              <label>{t('member.currentPassword')}</label>
              <input
                className="input"
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                autoComplete="current-password"
                autoFocus
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
              <button type="submit" className="btn btn-primary" disabled={pwBusy}>
                {pwBusy ? <span className="spinner" /> : t('pw.update')}
              </button>
            </div>
          </form>
        )}

        <div className="row">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
