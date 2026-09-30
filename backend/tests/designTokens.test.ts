import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// Garde-fou d'accessibilité : les couleurs de texte du thème (clair et sombre) gardent un contraste AA (4,5:1 minimum)
// sur les surfaces où elles sont utilisées. Si on change une couleur dans app/styles/tokens.css, ce test le vérifie.
const css = readFileSync(join(__dirname, '../../app/styles/tokens.css'), 'utf8');

const block = (selector: string): Record<string, string> => {
  const start = css.indexOf(selector);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  const out: Record<string, string> = {};
  for (const m of css.slice(open, close).matchAll(/(--ik-[\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
};

const lum = (hex: string): number => {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
};
const contrast = (a: string, b: string): number => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const themes: Record<string, Record<string, string>> = {
  sombre: block(":root[data-theme='dark']"),
  clair: block(":root[data-theme='light']"),
};

describe.each(Object.entries(themes))('thème %s : contrastes AA des couleurs de texte', (_nom, t) => {
  const surfaces = ['--ik-bg', '--ik-surface-1', '--ik-surface-2'];
  it.each([['--ik-text'], ['--ik-text-2'], ['--ik-text-3'], ['--ik-accent'], ['--ik-positive'], ['--ik-negative']])('%s lisible sur les surfaces', (couleur) => {
    for (const s of surfaces) expect(contrast(t[couleur], t[s]), `${couleur} sur ${s}`).toBeGreaterThanOrEqual(4.5);
  });
  it('texte sur bouton principal', () => {
    expect(contrast(t['--ik-text-on-primary'], t['--ik-primary'])).toBeGreaterThanOrEqual(4.5);
  });
  it('couleurs de séries de graphique : contraste graphique 3:1 sur la carte', () => {
    for (let i = 1; i <= 5; i += 1) expect(contrast(t[`--ik-series-${i}`], t['--ik-surface-1']), `série ${i}`).toBeGreaterThanOrEqual(3);
  });
});

describe('mouvement', () => {
  it('les animations sont coupées par « Animations : non » et par prefers-reduced-motion', () => {
    expect(css).toMatch(/\[data-motion='off'\]/);
    expect(css).toMatch(/prefers-reduced-motion: reduce/);
  });
});
