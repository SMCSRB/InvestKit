'use client';

import { useEffect, useRef } from 'react';

// Regroupe les bandeaux (« voir comme », annonces) dans un seul bloc collant en haut de page et publie sa hauteur réelle
// dans --ik-banner-h : le menu latéral et la barre supérieure se décalent exactement de cette hauteur (un ou deux bandeaux, texte sur plusieurs lignes).
export default function BannerStack({ children }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const apply = () => document.documentElement.style.setProperty('--ik-banner-h', `${el.offsetHeight}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => { ro.disconnect(); document.documentElement.style.removeProperty('--ik-banner-h'); };
  }, []);
  return <div ref={ref} className="ik-banners">{children}</div>;
}
