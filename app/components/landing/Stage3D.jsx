'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from '@/app/context/ThemeContext';

// Scène 3D de l'accroche : la scène s'incline légèrement en suivant la souris, et ses couches (placées à des profondeurs
// différentes avec --z) se décalent naturellement. Uniquement transform : fluide, sans bibliothèque.
// Coupée si « Animations : Non » ou « réduire les animations ». Sur écran tactile : léger balancement automatique.
export default function Stage3D({ children }) {
  const ref = useRef(null);
  const { motionEnabled } = useTheme();

  useEffect(() => {
    const stage = ref.current;
    const hero = stage?.closest('.lp-hero');
    if (!stage || !hero || !motionEnabled) return undefined;

    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    stage.dataset.idle = fine ? 'false' : 'true';

    let raf = 0;
    let rx = 0;
    let ry = 0;
    const apply = () => {
      raf = 0;
      stage.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
      stage.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(apply); };
    const onMove = (e) => {
      const r = hero.getBoundingClientRect();
      ry = ((e.clientX - r.left) / r.width - 0.5) * 16;
      rx = -((e.clientY - r.top) / r.height - 0.5) * 11;
      schedule();
    };
    const onLeave = () => { rx = 0; ry = 0; schedule(); };
    if (fine) {
      hero.addEventListener('pointermove', onMove, { passive: true });
      hero.addEventListener('pointerleave', onLeave);
    }

    // Parallaxe au défilement : seulement tant que l'accroche est visible.
    let visible = true;
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; });
    io.observe(hero);
    const onScroll = () => { if (visible) hero.style.setProperty('--sy', String(Math.min(window.scrollY, 900))); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      hero.removeEventListener('pointermove', onMove);
      hero.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('scroll', onScroll);
      io.disconnect();
      hero.style.removeProperty('--sy');
      delete stage.dataset.idle;
    };
  }, [motionEnabled]);

  return (
    <div className="lp-stage-wrap">
      <div ref={ref} className="lp-stage">{children}</div>
    </div>
  );
}

// Couche de la scène : z = profondeur en pixels, par = vitesse de parallaxe au défilement.
export function Layer({ z = 0, par = 0, className = '', children, ...rest }) {
  return (
    <div className={`lp-layer ${className}`.trim()} style={{ '--z': `${z}px`, '--par': par }} {...rest}>
      {children}
    </div>
  );
}

// Pièce InvestKit en 3D (CSS pur) : deux faces, tranche en épaisseur, rotation continue.
export function Coin3D({ size = 72 }) {
  const mark = (
    <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 40 40" aria-hidden="true">
      <rect x="6" y="22" width="7" height="12" rx="2.5" fill="#8a5a06" />
      <rect x="16.5" y="15" width="7" height="19" rx="2.5" fill="#8a5a06" />
      <rect x="27" y="7" width="7" height="27" rx="2.5" fill="#8a5a06" />
    </svg>
  );
  return (
    <div className="lp-coin3d" style={{ '--s': `${size}px` }} aria-hidden="true">
      {[-3, -2, -1, 0, 1, 2, 3].map((t) => <span key={t} className="lp-coin3d__edge" style={{ transform: `translateZ(${t}px)` }} />)}
      <span className="lp-coin3d__face" style={{ transform: 'translateZ(4px)' }}>{mark}</span>
      <span className="lp-coin3d__face" style={{ transform: 'rotateY(180deg) translateZ(4px)' }}>{mark}</span>
    </div>
  );
}
