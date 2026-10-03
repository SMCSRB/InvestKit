import { describe, expect, it } from 'vitest';
// @ts-expect-error module JavaScript du frontend
import { NAV_BOTTOM, NAV_MAIN, flatNav, isActive } from '../../app/components/shell/nav.js';

// Le menu latéral ne doit surligner qu'UNE entrée à la fois, et chaque entrée interne doit pointer vers une vraie page.
describe('menu latéral : entrées actives', () => {
  it('sans onglet demandé, seul « Tableau de bord » est actif', () => {
    const actifs = flatNav().filter((n: any) => isActive('/dashboard', '', n.href)).map((n: any) => n.id);
    expect(actifs).toEqual(['dashboard']);
  });
  it('sur la page /bourse, seule « Bourse et PEA » est active', () => {
    const actifs = flatNav().filter((n: any) => isActive('/bourse', '', n.href)).map((n: any) => n.id);
    expect(actifs).toEqual(['bourse']);
  });
  it('une autre page active uniquement sa propre entrée', () => {
    expect(flatNav().filter((n: any) => isActive('/crypto', '', n.href)).map((n: any) => n.id)).toEqual(['crypto']);
    expect(flatNav().filter((n: any) => isActive('/education/crypto_market/2', '', n.href)).map((n: any) => n.id)).toEqual(['education']);
  });
});

describe('menu latéral : destinations', () => {
  it('chaque entrée interne correspond à une page existante du dossier app/', async () => {
    const { existsSync } = await import('fs');
    const { join } = await import('path');
    const pages = [...NAV_MAIN, ...NAV_BOTTOM].flatMap((n: any) => (n.children ? n.children : [n])).filter((n: any) => !n.external);
    for (const n of pages) {
      const path = n.href.split('?')[0].replace(/^\//, '');
      expect(existsSync(join(__dirname, '../../app', path, 'page.jsx')), `${n.id} → ${n.href}`).toBe(true);
    }
  });
});
