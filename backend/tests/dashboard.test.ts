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

  it('plus aucun ami, guilde ni activité d\'exemple : amis et guildes sont réels (serveur)', () => {
    expect(page).toContain('<SocialHub');
    for (const fake of ['Alice', 'Bob', 'Emma', 'Diana', 'Charlie', 'dash-demo-note']) expect(page, fake).not.toContain(`'${fake}`);
    expect(read('context/UserContext.jsx')).not.toMatch(/UJYD0L|SMC\.SRB/);
    const friends = read('friends/page.jsx');
    expect(friends).toContain('SocialHub');
    expect(friends).not.toMatch(/mockUsers|Alice Dupont/);
  });

  it('prix Pro : lus depuis plans.js, jamais recopiés', () => {
    for (const f of ['dashboard/page.jsx', 'dashboard/OverviewTab.jsx', 'dashboard/MarketTab.jsx']) {
      expect(read(f), f).not.toMatch(/7[.,]99|\b79\s?€/);
    }
  });

  it('la vue d\'ensemble n\'utilise que des données du serveur et ses boutons mènent à un onglet existant', () => {
    // Les sections restent joignables par ?tab=… (menu principal) ; la barre d'onglets en doublon a été retirée.
    const list = page.match(/\[('overview'[^\]]*)\]\.includes\(target\)/);
    expect(list, 'liste des sections autorisées').toBeTruthy();
    const tabs = [...list![1].matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
    expect(tabs).toEqual(['overview', 'market', 'trading', 'education', 'friends', 'notifications', 'settings']);
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

describe('vie du tableau de bord (lot 8) : mouvement honnête et respectueux', () => {
  const css = read('styles/dashboard.css');

  it('les couches de parallaxe reviennent à plat avec « Animations : Non » et « réduire les animations »', () => {
    expect(css).toMatch(/:root\[data-motion='off'\] \.dh__layer/);
    expect(css).toMatch(/:root:not\(\[data-motion='on'\]\) \.dh__layer/);
    expect(read('styles/base.css')).toMatch(/data-motion='off'\] \*/); // coupure globale de toute animation
  });

  it('uniquement transform et opacity pour animer (aucune propriété qui force la mise en page)', () => {
    const frames = [...css.matchAll(/@keyframes (dh-[\w-]+) \{([\s\S]*?)\n\}/g)].map((m) => m[2]);
    expect(frames.length).toBeGreaterThan(3);
    for (const f of frames) expect(f).not.toMatch(/\b(width|height|top|left|right|bottom|margin|padding)\s*:/);
  });

  it('l\'accueil n\'affiche que des données réelles (nom, jours actifs, patrimoine du serveur) et rien d\'inventé', () => {
    const hero = read('dashboard/DashHero.jsx');
    expect(hero).toContain('shell?.wallet'); // jours actifs et récompense : données partagées de la coque (/economy/balance)
    expect(hero).toMatch(/activeDays > 0/);             // aucun compteur affiché tant qu'il n'existe pas
    expect(hero).not.toMatch(/streak|série de/i);       // plus aucune série : ni compteur, ni message de série
    expect(hero).toMatch(/Number\.isFinite\(patrimoine\)/);
    const prog = read('dashboard/ProgressCard.jsx');
    expect(prog).toContain('useEducationProgress');     // niveau et XP réels
  });

  it('la récompense du jour utilise les données partagées de la coque (même fonction serveur que le bouton cadeau)', () => {
    const hero = read('dashboard/DashHero.jsx');
    expect(hero).toContain('useShell');
    expect(hero).toContain('shell.claimDaily');
    expect(hero).not.toContain("querySelector('.ik-rewardbtn')");
    expect(read('components/shell/AppShell.jsx')).toContain('ShellDataContext.Provider');
  });

  it('la règle de niveau (500 XP) existe une seule fois', () => {
    expect(read('context/EducationContext.jsx')).toContain('export const XP_PER_LEVEL = 500');
    expect(read('dashboard/ProgressCard.jsx')).not.toMatch(/=\s*500\b/);
  });
});
