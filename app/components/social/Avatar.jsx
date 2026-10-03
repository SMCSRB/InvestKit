'use client';

import { useEffect, useState } from 'react';
import { avatarUrl } from '@/app/lib/profileApi';

// Photo d'un joueur, ou sa lettre initiale en secours (pas de photo, ou image qui ne charge pas). Même rendu partout.
export default function Avatar({ avatarId, name = '', size = 28, className = '', style }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => { setBroken(false); }, [avatarId]);
  const src = avatarId && !broken ? avatarUrl(avatarId) : null;
  const common = { width: size, height: size, borderRadius: '50%', flexShrink: 0, ...style };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={`ik-avatar ${className}`.trim()} src={src} alt="" aria-hidden="true" loading="lazy" decoding="async" onError={() => setBroken(true)} style={{ ...common, objectFit: 'cover' }} data-avatar="photo" />;
  }
  return <span className={`ik-avatar ${className}`.trim()} aria-hidden="true" style={{ ...common, fontSize: Math.max(11, Math.round(size * 0.45)) }} data-avatar="initial">{(name || '?').trim().slice(0, 1).toUpperCase()}</span>;
}
