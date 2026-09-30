import { useId } from 'react';

// Logo InvestKit : pastille violet-orchidée, trois barres ascendantes (progression) et une étincelle.
export function LogoMark({ size = 36 }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="InvestKit" focusable="false">
      <defs>
        <linearGradient id={`g${id}`} x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6d4ff0" />
          <stop offset="1" stopColor="#c15bf0" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill={`url(#g${id})`} />
      <rect x="9" y="22" width="5.6" height="10" rx="2.2" fill="#fff" fillOpacity=".72" />
      <rect x="17.2" y="16" width="5.6" height="16" rx="2.2" fill="#fff" fillOpacity=".88" />
      <rect x="25.4" y="10" width="5.6" height="22" rx="2.2" fill="#fff" />
      <circle cx="11.8" cy="14" r="2" fill="#fff" fillOpacity=".9" />
    </svg>
  );
}

export default function Logo({ size = 36, showText = true }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <LogoMark size={size} />
      {showText && (
        <span style={{ fontWeight: 800, fontSize: size * 0.6, letterSpacing: '-0.02em', color: 'var(--ik-text)' }}>
          Invest<span style={{ color: 'var(--ik-accent)' }}>Kit</span>
        </span>
      )}
    </span>
  );
}
