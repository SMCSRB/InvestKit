'use client';

import { useEffect, useState } from 'react';

// Couleurs des graphiques canvas (Lightweight Charts n'accepte que des couleurs concrètes, pas var(--…)) :
// on lit les jetons du thème actif et on se met à jour quand le thème change (clair/sombre).
const read = (name, fallback) => {
  try { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback; } catch { return fallback; }
};

// '#rrggbb' ou 'rgba(r,g,b,a)' → rgba(r,g,b,alpha)
export const withAlpha = (color, alpha) => {
  const c = String(color).trim();
  const h = /^#([0-9a-f]{6})$/i.exec(c);
  if (h) { const n = parseInt(h[1], 16); return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`; }
  const m = /^rgba?\(([^)]+)\)/i.exec(c);
  if (m) { const [r, g, b] = m[1].split(',').map((x) => x.trim()); return `rgba(${r}, ${g}, ${b}, ${alpha})`; }
  return c;
};

export const readChartTheme = () => {
  const up = read('--ik-positive', '#3ddc97');
  const down = read('--ik-negative', '#ff6b81');
  const text = read('--ik-text-3', '#908ab0');
  const line = read('--ik-accent', '#a893ff');
  return {
    up, down, text, line,
    grid: read('--ik-grid', 'rgba(255,255,255,0.06)'),
    border: read('--ik-border-strong', 'rgba(255,255,255,0.16)'),
    surface: read('--ik-surface-1', '#14122a'),
    warning: read('--ik-warning', '#ffc14d'),
    // Ordre fixe, jamais cyclé (séries validées avec le script du skill dataviz)
    ind: [read('--ik-series-3', '#cf7a22'), read('--ik-series-1', '#7a5cf0'), read('--ik-series-2', '#1a9fbf'), read('--ik-series-4', '#d6509a'), read('--ik-series-5', '#27a865'), read('--ik-info', '#5cc8ff')],
  };
};

export function useChartTheme() {
  const [theme, setTheme] = useState(readChartTheme);
  useEffect(() => {
    // On ne remplace l'objet que si une couleur a réellement changé (sinon chaque graphique serait recréé pour rien).
    const refresh = () => setTheme((prev) => { const next = readChartTheme(); return JSON.stringify(prev) === JSON.stringify(next) ? prev : next; });
    refresh();
    const mo = new MutationObserver(refresh);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);
  return theme;
}
