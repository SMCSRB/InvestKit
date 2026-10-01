import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';
// @ts-expect-error module JavaScript du frontend
import { themeInitScript } from '../../app/lib/designRoutes.js';

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
      expect(src).toContain('<AppShell>');
      expect(src, 'plus de <main> plein écran avec dégradé').not.toMatch(/minHeight: '100vh'/);
      // texte blanc codé en dur seulement sur boutons pleins (jetons text-on-*), jamais « white » / « #fff » nus
      expect(src).not.toMatch(/color: '(?:white|#fff|#ffffff)'/);
      // anciens gris-bleus de la palette d'origine
      expect(src).not.toMatch(/#(?:0f172a|1e293b|94a3b8|cbd5e1|e2e8f0|64748b|60a5fa)\b/i);
    });
  }

  it('/education : toutes les pages dans la coque, sans couleurs d\'origine', () => {
    for (const f of EDUCATION) {
      const src = read(f);
      expect(src, f).toContain('<AppShell>');
      expect(src, f).not.toMatch(/minHeight: '100vh'/);
      expect(src, f).not.toMatch(/#(?:0f172a|1e293b|94a3b8|cbd5e1|e2e8f0|64748b|60a5fa|3b82f6|8b5cf6)\b/i);
    }
  });

  it('utilities.css est à jour avec le générateur (python3 scripts/gen-utilities.py)', () => {
    const r = spawnSync('python3', ['scripts/gen-utilities.py', '--check'], { cwd: join(__dirname, '../..') });
    expect(r.status, 'relancer : python3 scripts/gen-utilities.py').toBe(0);
  });

  it('utilitaires de mise en page : Tailwind n\'est pas installé, le sous-ensemble généré couvre les classes utilisées', () => {
    const css = read('styles/utilities.css');
    for (const c of ['.max-w-6xl', '.grid-cols-1', '.text-gray-400', '.bg-slate-800\\/50', '.md\\:grid-cols-2']) expect(css, c).toContain(c);
    expect(css).toMatch(/var\(--ik-text-3\)/); // couleurs du thème, pas de gris fixes
    expect(css).not.toMatch(/#(?:94a3b8|1e293b|0f172a)/i);
  });

  const pages = (dir = ''): string[] => readdirSync(join(APP, dir)).flatMap((e) => {
    const rel = join(dir, e);
    if (statSync(join(APP, rel)).isDirectory()) return pages(rel);
    return e === 'page.jsx' ? [rel] : [];
  });
  const SHELLS = ['AppShell', 'PublicShell', 'AuthLayout', 'LegalPage', 'DesignSystemClient', 'redirect', 'SupportRedirect', 'SimFrame'];

  it('chaque page du site est dans une coque (menu connecté ou en-tête public) : plus aucune page à l\'ancien habillage', () => {
    const sans = pages().filter((f) => !SHELLS.some((k) => read(f).includes(k)));
    expect(sans).toEqual([]);
  });

  it('plus aucun dégradé d\'origine plein écran ni couleur d\'origine dans les pages et composants partagés', () => {
    const all = [...pages(), 'components/LegalPage.jsx', 'components/AppearanceSettings.jsx', 'components/OnboardingChecklist.jsx', 'components/PortfolioRisk.jsx'];
    for (const f of all) {
      const src = read(f);
      expect(src, f).not.toMatch(/linear-gradient\(135deg, #0f172a 0%, #1e293b/);
      expect(src, f).not.toMatch(/background: '#(?:0f172a|1e293b|1a1a2e)'/i);
    }
  });

  it('l\'init anti-flash du thème ne dépend d\'aucune route (le thème s\'applique partout)', () => {
    expect(themeInitScript).toContain("data-theme");
    expect(themeInitScript).not.toContain('location.pathname');
  });
});
