import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// Honnêteté des textes : le jeu rejoue des données simplifiées, fictives ou historiques. Aucun texte visible ne doit laisser croire
// à des cours réels, en direct ou « comme dans la vraie vie ». Ce test cherche les formulations trompeuses (hors commentaires) et
// n'accepte que les phrases qui disent justement l'inverse (« pas en direct », « pas encore disponible »…).
const root = path.join(__dirname, '..', '..');
const walk = (dir: string, exts: string[]): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  if (['node_modules', '.next', 'design-system'].includes(e.name)) return [];
  const p = path.join(dir, e.name);
  return e.isDirectory() ? walk(p, exts) : exts.some((x) => p.endsWith(x)) ? [p] : [];
});
const stripComments = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');

const FILES = [
  ...walk(path.join(root, 'app'), ['.js', '.jsx']),
  ...walk(path.join(root, 'data'), ['.js']),
  ...walk(path.join(root, 'backend', 'src'), ['.ts']),
];

const FORBIDDEN: RegExp[] = [
  /cours réels?/i, /prix réels?/i, /données réelles?/i, /vrais (cours|prix|données)/i, /marché réel/i,
  /historiques réels/i, /en direct/i, /temps réel/i, /taux historiques/i, /comme dans la vraie vie/i, /\bcotations? en direct/i,
];
// Lignes qui contiennent la formulation mais pour dire exactement le contraire, ou qui parlent du temps réel du monde (pas du jeu).
const ALLOWED_LINE: RegExp[] = [
  /pas (des )?cours réels/i, /pas de vrais cours/i, /pas en direct/i, /ne sont pas en direct/i, /pas encore disponible/i,
  /espacées de 30 jours \(temps réel\)/,           // délais de la procédure de rétablissement : en temps réel du monde, pas du jeu
  /realtime/i,                                      // libellé du mode « Temps réel » signalé indisponible par le serveur
  /'Les prix réels'/,                               // mauvaise réponse proposée dans un quiz d'éducation
  /aucun marché réel/i,                             // bandeau « données fictives » : dit justement que ce n'est pas un marché réel
];

describe('textes honnêtes : aucune promesse de cours réels, en direct ou « comme dans la vraie vie »', () => {
  it('aucune formulation trompeuse dans les textes visibles (hors commentaires)', () => {
    const hits: string[] = [];
    for (const f of FILES) {
      const lines = stripComments(fs.readFileSync(f, 'utf8')).split('\n');
      lines.forEach((line, i) => {
        if (FORBIDDEN.some((re) => re.test(line)) && !ALLOWED_LINE.some((re) => re.test(line))) hits.push(`${path.relative(root, f)}:${i + 1}: ${line.trim().slice(0, 140)}`);
      });
    }
    expect(hits).toEqual([]);
  });

  it('le bandeau de cours reste discret (étiquette « Marché ») mais dit, à la lecture et au survol, que ce sont des cours simulés rejoués, pas en direct, et signale les données fictives', () => {
    const t = fs.readFileSync(path.join(root, 'app/components/shell/TickerBar.jsx'), 'utf8');
    expect(t).toMatch(/aria-label=\{synthetic \? 'Cours du marché simulé \(données fictives, pas en direct\)'/);
    expect(t).toMatch(/title="Cours historiques rejoués à ta date de jeu : ils ne sont pas en direct\."/);
    expect(t).toContain("synthetic ? 'Données fictives' : 'Marché'");   // l'étiquette « fictives » n'apparaît que si les données le sont vraiment
    expect(t).toContain('synthetic: !!a.synthetic');
  });

  it('la page d\'accueil dit que les règles s\'inspirent du réel (simplifiées) et que les pertes sont virtuelles', () => {
    const page = fs.readFileSync(path.join(root, 'app/page.jsx'), 'utf8');
    const land = fs.readFileSync(path.join(root, 'app/components/landing/LandingSections.jsx'), 'utf8');
    expect(page).toContain('s&apos;inspirent de la vraie vie');
    expect(land).toContain('inspirées du réel');
    expect(land).toContain('taux inspirés de l\\\'histoire');
    expect(land).toMatch(/séries simplifiées à visée pédagogique, pas des cours réels/);
  });

  it('la FAQ et les pages de marché ne promettent pas de données réelles à venir', () => {
    const market = fs.readFileSync(path.join(root, 'app/dashboard/MarketTab.jsx'), 'utf8');
    expect(market).not.toMatch(/arrivent avec leurs données/);
    expect(market).toContain('aucune source de données fiable n&apos;est branchée');
  });

  it('le plafond de courtage de 0,5 % est présenté comme celui du PEA en ligne, repris au compte-titres par simplification', () => {
    const rules = fs.readFileSync(path.join(root, 'backend/src/config/tradingRules.ts'), 'utf8');
    expect(rules).toMatch(/PASSÉ EN LIGNE SUR UN PEA/);
    expect(rules).toMatch(/Il ne s'applique pas au compte-titres/);
    expect(rules).not.toMatch(/courtiers réels/);
  });

  it('la fiche « Action » du glossaire ne parle plus de « cours historiques réels », et la fiche InvestCoin porte la phrase permanente sur l\'absence de valeur réelle', () => {
    const g = fs.readFileSync(path.join(root, 'app', 'lib', 'glossaire.js'), 'utf8');
    expect(g).not.toMatch(/cours historiques réels/i);
    expect(g).toContain('sur des cours annuels simplifiés (illustratifs, pas de vrais cours de Bourse)');
    expect(g).toContain("Les InvestCoins n\\'ont aucune valeur réelle : on ne peut ni les acheter, ni les retirer, ni les échanger entre joueurs.");
  });
});
