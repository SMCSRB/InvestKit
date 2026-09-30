import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const APP = join(__dirname, '../../app');
const read = (p: string) => readFileSync(join(APP, p), 'utf8');
const page = read('dashboard/page.jsx');

describe('tableau de bord : données réelles, pas de valeurs factices', () => {
  it('plus aucun cours codé en dur (ancien onglet Marché)', () => {
    for (const fake of ['7425.38', '68450.50', '2850.75', '2095.30', 'marketData']) expect(page, fake).not.toContain(fake);
  });

  it('le fil d\'activité ne contient plus de personnes inventées et ne relit plus l\'ancien fil enregistré', () => {
    const start = page.indexOf('const [activityFeed, setActivityFeed]');
    expect(page.slice(start, start + 120)).toContain('useState([])');
    expect(page).not.toMatch(/setActivityFeed\(JSON\.parse/);
  });

  it('les contenus d\'exemple du réseau social sont annoncés comme tels', () => {
    expect(page).toMatch(/dash-demo-note/);
    expect(page).toMatch(/profils d&apos;exemple/);
  });

  it('prix Pro : lus depuis plans.js, jamais recopiés', () => {
    for (const f of ['dashboard/page.jsx', 'dashboard/OverviewTab.jsx', 'dashboard/MarketTab.jsx']) {
      expect(read(f), f).not.toMatch(/7[.,]99|\b79\s?€/);
    }
  });

  it('la vue d\'ensemble n\'utilise que des données du serveur et ses boutons mènent à un onglet existant', () => {
    const tabs = [...page.matchAll(/\{ value: '([a-z]+)', label:/g)].map((m) => m[1]);
    expect(tabs).toEqual(['overview', 'market', 'trading', 'education', 'friends', 'notifications', 'activity', 'settings']);
    const overview = read('dashboard/OverviewTab.jsx');
    for (const m of overview.matchAll(/onOpenTab\('([a-z]+)'\)/g)) expect(tabs, `onglet ${m[1]}`).toContain(m[1]);
  });

  it('plus d\'onglet « Section en développement » accessible', () => {
    expect(page).not.toContain('Section en développement');
    expect(page).toMatch(/t === 'risk' \? 'trading'/); // les anciens liens ?tab=risk mènent à l'analyse réelle
  });

  it('le texte sur surface utilise les jetons de thème (lisible en clair comme en sombre)', () => {
    for (const f of ['components/PortfolioRisk.jsx', 'components/HelpTip.jsx']) expect(read(f), f).not.toMatch(/color: '(?:white|#fff)'/);
    // seuls les 3 boutons pleins (fond violet ou vert) gardent du blanc
    expect(read('components/OnboardingChecklist.jsx').match(/'white'/g)).toHaveLength(3);
  });
});
