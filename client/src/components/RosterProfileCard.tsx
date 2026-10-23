import { useEffect } from 'react';
import type { RosterMember } from '../types';
import { useLang } from '../i18n';
import { valueLabel } from '../display';
import { formatCp, optionColor, toIsoDate } from '../utils';
import Avatar from './Avatar';
import { IconClose } from './icons';

interface Props {
  member: RosterMember;
  avatar?: string;
  onClose: () => void;
}

export default function RosterProfileCard({ member, avatar, onClose }: Props) {
  const { t, lang } = useLang();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const role = member.role ? valueLabel(member.role, t, lang) : '';
  const status = member.status ? valueLabel(member.status, t, lang) : '';
  const country = member.country ? valueLabel(member.country, t, lang) : '';
  const weapon = member.mainWeapon ? valueLabel(member.mainWeapon, t, lang) : '';
  const joined = toIsoDate(member.joined) || member.joined || '';

  return (
    <div
      className="overlay roster-profile-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="roster-profile-card" role="dialog" aria-modal="true" aria-label={member.ign}>
        <div className="roster-profile-banner" />
        <button type="button" className="roster-profile-close" aria-label={t('common.close')} onClick={onClose}>
          <IconClose />
        </button>

        <div className="roster-profile-head">
          <Avatar
            ign={member.ign}
            src={avatar}
            className="roster-profile-avatar"
            alt={member.ign}
          />
          <div className="roster-profile-id">
            <span className="roster-profile-kicker">{t('member.profile')}</span>
            <h2>{member.ign}</h2>
            <div className="roster-profile-badges">
              {role && (
                <span className="roster-profile-badge" style={{ color: optionColor(member.role) }}>
                  {role}
                </span>
              )}
              {status && (
                <span className="roster-profile-badge" style={{ color: optionColor(member.status) }}>
                  {status}
                </span>
              )}
            </div>
          </div>
          <div className="roster-profile-cp">
            <span>{t('roster.cp')}</span>
            <strong>{member.cp ? formatCp(member.cp) : '—'}</strong>
          </div>
        </div>

        <div className="roster-profile-details">
          <div>
            <span>{t('col.country')}</span>
            <strong>{country || '—'}</strong>
          </div>
          <div>
            <span>{t('col.guild')}</span>
            <strong>{member.guild || '—'}</strong>
          </div>
          <div>
            <span>{t('col.nickname')}</span>
            <strong>{member.nickname || '—'}</strong>
          </div>
          <div>
            <span>{t('col.dateJoined')}</span>
            <strong>{joined || '—'}</strong>
          </div>
          <div className="roster-profile-detail-wide">
            <span>{t('roster.mainWeapon')}</span>
            <strong>{weapon || '—'}</strong>
          </div>
        </div>

        <div className="roster-profile-notes">
          <span>{t('col.notes')}</span>
          <p>{member.notes?.trim() || '—'}</p>
        </div>
      </div>
    </div>
  );
}
