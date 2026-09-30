'use client';

import { useEffect } from 'react';
import { useTheme } from '@/app/context/ThemeContext';

// Inclinaison 3D des cartes au survol (éléments portant data-tilt) : délégation d'événements, un seul écouteur pour toute la page.
// Uniquement avec une vraie souris (pas sur écran tactile) et si les animations sont activées.
const MAX = 7;

export default function TiltScope() {
  const { motionEnabled } = useTheme();
  useEffect(() => {
    if (!motionEnabled || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined;
    let el = null;
    let raf = 0;
    let last = null;
    const reset = (t) => {
      t.style.setProperty('--rx', '0deg');
      t.style.setProperty('--ry', '0deg');
      delete t.dataset.active;
    };
    const paint = () => {
      raf = 0;
      if (!el || !last) return;
      const r = el.getBoundingClientRect();
      const x = (last.clientX - r.left) / r.width;
      const y = (last.clientY - r.top) / r.height;
      el.style.setProperty('--ry', `${((x - 0.5) * 2 * MAX).toFixed(2)}deg`);
      el.style.setProperty('--rx', `${(-(y - 0.5) * 2 * MAX).toFixed(2)}deg`);
      el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      el.dataset.active = '1';
    };
    const onMove = (e) => {
      const t = e.target instanceof Element ? e.target.closest('[data-tilt]') : null;
      if (el && el !== t) reset(el);
      el = t;
      if (!t) return;
      last = e;
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const onOut = (e) => { if (!e.relatedTarget && el) { reset(el); el = null; } };
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerout', onOut);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerout', onOut);
      if (raf) cancelAnimationFrame(raf);
      if (el) reset(el);
    };
  }, [motionEnabled]);
  return null;
}
