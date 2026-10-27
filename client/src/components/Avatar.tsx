import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { avatarTone, initials } from '../utils';

interface Props {
  ign: string;
  src?: string;
  className?: string;
  alt?: string;
  title?: string;
  onClick?: (e: MouseEvent<HTMLSpanElement>) => void;
}

export default function Avatar({ ign, src, className = '', alt, title, onClick }: Props) {
  const [broken, setBroken] = useState(false);
  const url = (src ?? '').trim();
  const showImg = Boolean(url) && !broken;

  useEffect(() => {
    setBroken(false);
  }, [url]);

  // Fallback colours come from the IGN (not the list position), so a member
  // looks identical on every screen. Callers may still pin an explicit tone.
  const hasTone = /(^|\s)tone-\d+/.test(className);
  const classes = `avatar-media${className ? ` ${className}` : ''}${
    hasTone ? '' : ` tone-${avatarTone(ign)}`
  }${showImg ? ' has-img' : ''}`;

  return (
    <span
      className={classes}
      onClick={onClick}
      title={title ?? alt ?? ign}
    >
      {showImg ? (
        <img
          src={url}
          alt={alt ?? ign}
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
        />
      ) : (
        initials(ign)
      )}
    </span>
  );
}
