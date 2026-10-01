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
    expect(page).not.toContain('dash-rail');
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
    expect(page).toMatch(/tabParam === 'risk' \? 'trading'/); // les anciens liens ?tab=risk mènent à l'analyse réelle
  });

  it('le texte sur surface utilise les jetons de thème (lisible en clair comme en sombre)', () => {
    for (const f of ['components/PortfolioRisk.jsx', 'components/HelpTip.jsx', 'crypto/page.jsx']) expect(read(f), f).not.toMatch(/color: '(?:white|#fff)'/);
    // boutons pleins : jetons « texte sur primaire / positif / négatif », jamais de blanc nu
    expect(read('components/OnboardingChecklist.jsx')).not.toMatch(/color: '(?:white|#fff)'/);
  });
});

describe('marchés (lot 4) : thème et honnêteté des graphiques', () => {
  it('le graphique pro lit les couleurs du thème (plus de palette sombre codée en dur)', () => {
    const chart = read('crypto/PriceChart.jsx');
    expect(chart).toContain('useChartTheme');
    expect(chart).not.toMatch(/const COLORS = /);
    expect(chart).not.toMatch(/createChart\([\s\S]{0,400}#[0-9a-fA-F]{6}/);
  });

  it('l\'historique Bourse est borné côté serveur, étiqueté illustratif et attribué à TradingView', () => {
    const h = read('components/HistoryChart.jsx');
    expect(h).toMatch(/Données illustratives/);
    expect(h).toMatch(/Lightweight Charts/);
    expect(h).toMatch(/\/trading\/history\?domain=/);
    expect(h).toMatch(/Voir les valeurs \(tableau\)/); // vue tableau accessible
  });

  it('/crypto utilise la coque et le thème', () => {
    expect(read('crypto/page.jsx')).toContain('<AppShell>');
  });
});
