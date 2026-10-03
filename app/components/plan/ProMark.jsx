'use client';

import { useId } from 'react';

// Petite couronne dorée « Membre Pro » (dessin original), lisible dès 16 px. Affichée seulement quand le SERVEUR dit que le joueur est Pro
// ET qu'il ne l'a pas masquée. Info-bulle au survol et au clavier ; le nom accessible est « Membre Pro ».
export default function ProMark({ size = 16, label = 'Membre Pro' }) {
  const id = useId().replace(/:/g, '');
  return (
    <span className="ik-promark" role="img" aria-label={label} title={label} data-tip={label} tabIndex={0} data-testid="pro-mark" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`g${id}`} x1="4" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fff0a8" />
            <stop offset="0.45" stopColor="#f6b91a" />
            <stop offset="1" stopColor="#b9740a" />
          </linearGradient>
        </defs>
        <path d="M2.8 8.2l4.7 4 4.5-7.6 4.5 7.6 4.7-4-1.7 10.3H4.5L2.8 8.2z" fill={`url(#g${id})`} stroke="#8a5300" strokeWidth="1.1" strokeLinejoin="round" />
        <path d="M4.9 19.6h14.2" stroke="#8a5300" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="12" cy="4.4" r="1.5" fill="#fff0a8" stroke="#8a5300" strokeWidth="0.9" />
        <circle cx="2.8" cy="8.2" r="1.2" fill="#fff0a8" stroke="#8a5300" strokeWidth="0.8" />
        <circle cx="21.2" cy="8.2" r="1.2" fill="#fff0a8" stroke="#8a5300" strokeWidth="0.8" />
      </svg>
    </span>
  );
}
