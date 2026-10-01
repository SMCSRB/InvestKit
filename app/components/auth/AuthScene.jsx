'use client';

import { useEffect, useRef } from 'react';

// Fond animé des pages de compte : dégradé « aurore » qui dérive lentement, halos qui flottent, grille discrète et courbes de marché fantômes.
// Léger par construction : CSS (transform/opacity uniquement), aucune bibliothèque. Le parent .au porte data-anim / data-paused ;
// ici on ne gère que le parallaxe à la souris (aucune mise à jour React : une variable CSS, au plus une fois par image).
const CURVES = [
  'M0,420 C120,400 180,330 280,350 S430,260 540,290 S700,180 820,210 S1010,120 1120,150 S1300,70 1440,40',
  'M0,470 C140,440 220,450 330,400 S520,380 640,330 S840,300 960,250 S1220,230 1440,150',
  'M0,380 C100,360 200,390 300,330 S500,300 600,330 S800,230 920,260 S1180,190 1440,210',
];

export default function AuthScene({ lite = false, animated = true }) {
  const ref = useRef(null);

  useEffect(() => {
    const scene = ref.current;
    const el = scene?.closest('.au'); // les variables --mx / --my sont posées sur toute la page : le fond ET la scène 3D les lisent
    if (!el || !animated || lite) return undefined;
    // Parallaxe : souris seulement (pas d'écran tactile), jamais plus d'une mise à jour par image.
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined;
    let raf = 0; let nx = 0; let ny = 0;
    const apply = () => { raf = 0; el.style.setProperty('--mx', nx.toFixed(3)); el.style.setProperty('--my', ny.toFixed(3)); };
    const onMove = (e) => {
      nx = (e.clientX / window.innerWidth - 0.5) * 2;
      ny = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => { window.removeEventListener('pointermove', onMove); if (raf) cancelAnimationFrame(raf); };
  }, [animated, lite]);

  return (
    <div className="au-scene" ref={ref} data-lite={lite ? 'true' : 'false'} aria-hidden="true">
      <div className="au-px" style={{ '--d': -14 }}><div className="au-mesh" /></div>
      <div className="au-px" style={{ '--d': 26 }}>
        <div className="au-orb" style={{ '--x': '6%', '--y': '8%', '--s': '420px', '--t': '19s' }} />
        <div className="au-orb au-orb--x" style={{ '--x': '62%', '--y': '46%', '--s': '520px', '--t': '24s', '--dl': '-6s' }} />
        <div className="au-orb au-orb--x" style={{ '--x': '78%', '--y': '-8%', '--s': '300px', '--t': '16s', '--dl': '-3s' }} />
      </div>
      <div className="au-px" style={{ '--d': 8 }}><div className="au-grid" /></div>
      <div className="au-px" style={{ '--d': 40 }}>
        <svg className="au-curves" viewBox="0 0 1440 520" preserveAspectRatio="none" focusable="false">
          {CURVES.map((d) => <path key={d} d={d} />)}
        </svg>
      </div>
    </div>
  );
}
