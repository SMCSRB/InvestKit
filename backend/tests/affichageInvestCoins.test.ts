// Garde-fou d'affichage : tout le jeu se compte en InvestCoins (1 pièce = 1 €). L'Immobilier n'affiche plus de « € » ni de doublon « prix € ≈ pièces ».
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const immoFiles = fs.readdirSync(path.join(root, 'app/components/immo')).filter((f) => /\.(jsx|js)$/.test(f)).map((f) => `app/components/immo/${f}`).concat(['app/immobilier/page.jsx']);

describe('affichage en InvestCoins', () => {
  it('Immobilier : aucun symbole « € » dans les fichiers d\'affichage (hors commentaires)', () => {
    for (const f of immoFiles) {
      const lines = read(f).split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'));
      const bad = lines.filter((l) => l.includes('€'));
      expect(bad, `${f} contient encore un « € » : ${bad[0]}`).toEqual([]);
    }
  });
  it('Immobilier : plus de doublon « prix ≈ pièces »', () => {
    for (const f of immoFiles) expect(read(f), f).not.toMatch(/≈\s*\{coins\(/);
  });
  it('Banque : plus de conversion à l\'ancien taux de 20 € la pièce', () => {
    expect(read('app/banque/page.jsx')).not.toMatch(/\* 20/);
  });
  it('bandeau de cours : prix en InvestCoins (dollar seulement en repli)', () => {
    const t = read('app/components/shell/TickerBar.jsx');
    expect(t).toMatch(/priceCoins/);
    expect(t).toMatch(/<Coin \/>/);
  });
  it('checklist et bonus premiers pas : deux récompenses séparées, expliquées', () => {
    expect(read('app/components/OnboardingChecklist.jsx')).toMatch(/Deux récompenses séparées/);
    expect(read('backend/src/services/onboardingService.ts')).toMatch(/FIRST_STEP_BONUSES\.first_lesson/);
  });
});
