import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
// @ts-expect-error module JavaScript du frontend
import { THEMED_PREFIXES } from '../../app/lib/designRoutes.js';

const APP = join(__dirname, '../../app');
const read = (p: string) => readFileSync(join(APP, p), 'utf8');

// Pages passées au nouveau design : dans la coque, thème clair/sombre, aucune couleur d'origine codée en dur.
const MIGRATED: Record<string, string> = {
  '/immobilier': 'immobilier/page.jsx',
  '/banque': 'banque/page.jsx',
  '/glossaire': 'glossaire/page.jsx',
  '/friends': 'friends/page.jsx',
};
const EDUCATION = ['education/page.jsx', 'education/[domain]/page.jsx', 'education/[domain]/[chapter]/page.jsx', 'education/[domain]/final-quiz/page.jsx'];

describe('pages migrées vers le nouveau design', () => {
  for (const [route, file] of Object.entries(MIGRATED)) {
    it(`${route} : coque, thème et jetons`, () => {
      const src = read(file);
      expect(THEMED_PREFIXES, `${route} absent de THEMED_PREFIXES`).toContain(route);
      expect(src).toContain('<AppShell>');
      expect(src, 'plus de <main> plein écran avec dégradé').not.toMatch(/minHeight: '100vh'/);
      // texte blanc codé en dur seulement sur boutons pleins (jetons text-on-*), jamais « white » / « #fff » nus
      if (!route.startsWith('/education')) expect(src).not.toMatch(/color: '(?:white|#fff|#ffffff)'/);
      // anciens gris-bleus de la palette d'origine
      expect(src).not.toMatch(/#(?:0f172a|1e293b|94a3b8|cbd5e1|e2e8f0|64748b|60a5fa)\b/i);
    });
  }

  it('/education : toutes les pages dans la coque, sans couleurs d\'origine', () => {
    expect(THEMED_PREFIXES).toContain('/education');
    for (const f of EDUCATION) {
      const src = read(f);
      expect(src, f).toContain('<AppShell>');
      expect(src, f).not.toMatch(/#(?:0f172a|1e293b|94a3b8|cbd5e1|e2e8f0|64748b|60a5fa|3b82f6|8b5cf6)\b/i);
    }
  });

  it('utilitaires de mise en page : Tailwind n\'est pas installé, le sous-ensemble généré couvre les classes utilisées', () => {
    const css = read('styles/utilities.css');
    for (const c of ['.max-w-6xl', '.grid-cols-1', '.text-gray-400', '.bg-slate-800\\/50', '.md\\:grid-cols-2']) expect(css, c).toContain(c);
    expect(css).toMatch(/var\(--ik-text-3\)/); // couleurs du thème, pas de gris fixes
    expect(css).not.toMatch(/#(?:94a3b8|1e293b|0f172a)/i);
  });
});
