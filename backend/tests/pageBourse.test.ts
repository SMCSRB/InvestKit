// Page Bourse refaite : vérifications statiques (le moteur de trading est déjà testé ailleurs).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '../..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('page Bourse', () => {
  const page = read('app/bourse/page.jsx');
  it('utilise le serveur pour les prix et les coûts (aucun calcul de prix côté client)', () => {
    expect(page).toContain('/quote');
    expect(page).toContain('/buy');
    expect(page).toContain('/sell');
    expect(page).toContain("const DOMAIN = 'stocks'");
  });
  it('a les repères de test et pas d\'emoji ni de « € »', () => {
    for (const id of ['advance-year', 'preview-buy', 'buy-quote', 'confirm-buy', 'sell-quote', 'confirm-sell'])
      expect(page).toContain(id);
    expect(page).not.toMatch(/\d\s?€|\} €/);
  });
  it('le menu et les raccourcis mènent à /bourse', () => {
    expect(read('app/components/shell/nav.js')).toContain("href: '/bourse'");
    expect(read('app/classements/page.jsx')).toContain("go: '/bourse'");
    expect(read('app/dashboard/DashHero.jsx')).toContain("href: '/bourse'");
  });
});
