import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
// @ts-ignore : fichiers JavaScript partagés avec le site
import { keepGenuineSparklines, usableSeries } from '../../app/lib/sparklines.js';

const root = path.join(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const walk = (dir: string, out: string[] = []): string[] => {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(rel, out); else if (/\.(jsx?|tsx?)$/.test(e.name)) out.push(rel);
  }
  return out;
};

// Valeurs d'exemple ou inventées déjà rencontrées : elles ne doivent JAMAIS réapparaître dans le code de l'interface.
// (docs/faux-contenus.md explique d'où elles venaient.) Ajouter ici toute nouvelle valeur d'exemple découverte.
const INTERDITS: [RegExp, string][] = [
  [/jean\.dupont/i, 'e-mail d\'exemple'],
  [/andrejasimic05/i, 'adresse personnelle écrite en dur'],
  [/10\s?K\+/i, 'faux compteur d\'investisseurs'],
  [/99[.,]9\s?%\s*(uptime|de disponibilité|garanti)/i, 'fausse disponibilité garantie'],
  [/investisseurs actifs/i, 'faux compteur'],
  [/Passionné par l.investissement/i, 'bio d\'exemple'],
  [/Investisseur Premium/, 'bio d\'exemple'],
  [/InvestKitUser/, 'pseudo d\'exemple'],
  [/CAC 40 en hausse/, 'fausse actualité'],
  [/Alerte BTC/, 'fausse alerte'],
  [/\+€5k de gains/, 'faux gain'],
  [/Il y a (2h|5h|1h|3h)\b/, 'heure inventée'],
  [/Dernière modification il y a 3 mois/, 'faux historique'],
  [/Math\.random\(\) > 0\.6/, 'activité tirée au hasard'],
  [/useState\(Math\.floor\(Math\.random\(\)/, 'XP tiré au hasard'],
  [/\bRacha\b/i, 'faute (« série »)'],
  [/Profil Public|Masquer votre XP publiquement|Résumé hebdomadaire de vos progrès/, 'réglage sans effet'],
  [/setShowProfileMenu|const \[profileVisibility/, 'code mort ou réglage local sans effet'],
  [/2 mois offerts/, 'chiffre non calculé'],
];

describe('faux contenus : aucune valeur d\'exemple connue dans le code de l\'interface', () => {
  const files = [...walk('app'), ...walk('data'), ...walk('lib')].filter((f) => !f.startsWith('app/design-system/'));   // la page de référence du design n'existe qu'en développement
  it('le code de l\'interface est analysé (garde-fou contre un chemin faux)', () => { expect(files.length).toBeGreaterThan(100); });
  for (const [re, why] of INTERDITS) {
    it(`${re} (${why})`, () => {
      const hits = files.filter((f) => re.test(read(f)));
      expect(hits, `valeur d'exemple de retour : ${hits.join(', ')}`).toEqual([]);
    });
  }
});

describe('mini-courbes : chaque courbe vient de la vraie série de son actif', () => {
  const walkSeries = (seed: number, drift = 0) => { let x = 100; const out = [x]; let s = seed; for (let i = 0; i < 24; i++) { s = (s * 16807) % 2147483647; x *= 1 + ((s / 2147483647) - 0.5) * 0.08 + drift; out.push(x); } return out; };
  it('deux séries réellement différentes sont gardées, une copie à l\'échelle près est retirée', () => {
    const btc = walkSeries(7), eth = walkSeries(99);
    const copy = btc.map((v) => v * 0.05);                 // même forme, autre échelle : copie
    const out = keepGenuineSparklines([{ symbol: 'BTC', series: btc }, { symbol: 'ETH', series: eth }, { symbol: 'BNB', series: copy }]);
    expect(out.map((o: any) => o.series.length > 0)).toEqual([true, true, false]);
  });
  it('courbe trop courte, plate ou invalide : retirée ; la ligne reste affichée', () => {
    expect(usableSeries([1, 2, 3])).toBe(false);
    expect(usableSeries(Array(24).fill(5))).toBe(false);
    expect(usableSeries([...walkSeries(3).slice(0, 10), NaN])).toBe(false);
    expect(usableSeries(walkSeries(3))).toBe(true);
    const out = keepGenuineSparklines([{ symbol: 'X', price: 3, series: [] }]);
    expect(out[0]).toMatchObject({ symbol: 'X', price: 3, series: [] });
  });
  it('actifs corrélés mais distincts (cas réel BTC/ETH) : gardés tous les deux', () => {
    const a = walkSeries(5); const b = a.map((v, i) => v * (1 + Math.sin(i * 1.7) * 0.02));   // très proches, pas identiques
    const out = keepGenuineSparklines([{ series: a }, { series: b }]);
    expect(out.every((o: any) => o.series.length > 0)).toBe(true);
  });
  it('le bandeau et l\'onglet Marché lisent la série de CHAQUE actif au serveur, sans aucune courbe écrite en dur', () => {
    for (const f of ['app/components/shell/TickerBar.jsx', 'app/dashboard/MarketTab.jsx']) {
      const t = read(f);
      expect(t, f).toMatch(/crypto\/candles\?symbol=\$\{encodeURIComponent\(a\.symbol\)\}/);
      expect(t, f).toContain('keepGenuineSparklines');
      expect(t, f).not.toMatch(/series:\s*\[\s*\d/);
    }
  });
});

describe('actualités et profil : plus de contenu inventé', () => {
  it('« Actualités » lit les vraies annonces du serveur, avec un état vide honnête', () => {
    const t = read('app/dashboard/NewsFeed.jsx');
    expect(t).toContain('/announcements');
    expect(t).toContain('Aucune actualité pour le moment');
  });
  it('l\'e-mail affiché sur /profile est celui du serveur', () => {
    const t = read('app/profile/page.jsx');
    expect(t).toContain('profileData.email');
    expect(t).toContain('downloadMyData');
  });
});

describe('suppression de compte : le bouton agit vraiment', () => {
  it('formulaire relié à /auth/me/delete : mot de passe, 2FA, mot SUPPRIMER, session effacée', () => {
    const t = read('app/components/profile/DeleteAccount.jsx');
    expect(t).toContain('/auth/me/delete');
    expect(t).toContain("CONFIRM_PHRASE = 'SUPPRIMER'");
    expect(t).toContain('TWO_FACTOR_REQUIRED');
    expect(t).toMatch(/disabled=\{busy \|\| confirm !== CONFIRM_PHRASE/);
    expect(read('app/dashboard/page.jsx')).toContain('<DeleteAccount />');
    expect(read('app/profile/page.jsx')).toContain('<DeleteAccount />');
  });
});
