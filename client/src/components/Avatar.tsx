import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { initials } from '../utils';

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

  useEffect(() => {
    setBroken(false);
  }, [url]);

  return (
    <span
      className={`avatar-media${className ? ` ${className}` : ''}`}
      onClick={onClick}
      title={title ?? alt ?? ign}
    >
      {url && !broken ? (
        <img
          src={url}
          alt={alt ?? ign}
          loading="lazy"
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
