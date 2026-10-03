// Pièce InvestCoin (dessin original) : remplace l'emoji de pièce. Elle suit la taille du texte (1,1 em) et se lit « InvestCoins ».
import { useId } from 'react';

export default function Coin({ size = '1.1em', label = 'InvestCoins', className = '' }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={`ik-coin ${className}`.trim()} width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={label} focusable="false"
      style={{ verticalAlign: '-0.18em', display: 'inline-block', flex: 'none' }}>
      <defs>
        <linearGradient id={`c${id}`} x1="5" y1="3" x2="19" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffe58a" />
          <stop offset="0.5" stopColor="#f2a900" />
          <stop offset="1" stopColor="#b96f00" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10.6" fill={`url(#c${id})`} stroke="#8a5300" strokeWidth="0.9" />
      <circle cx="12" cy="12" r="7.7" fill="none" stroke="#fff6c9" strokeOpacity="0.65" strokeWidth="0.9" />
      <path d="M8.3 15.6v-2.6 M12 15.6V9.8 M15.7 15.6V7.9" stroke="#7a4700" strokeWidth="1.9" strokeLinecap="round" fill="none" />
    </svg>
  );
}
