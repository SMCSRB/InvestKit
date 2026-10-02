import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// Étape 1 des retours : bande de cours collée, statut Pro, menu du profil. Contrôles statiques de l'interface.
const ROOT = join(__dirname, '../..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

describe('bande de cours : collée sous la barre du haut, sans masquer le contenu', () => {
  const shell = read('app/components/shell/AppShell.jsx');
  const css = read('app/styles/shell.css');
  it('la barre du haut puis la bande de cours (dans cet ordre), toutes deux collées', () => {
    expect(shell.indexOf('<Topbar')).toBeGreaterThan(-1);
    expect(shell.indexOf('<Topbar')).toBeLessThan(shell.indexOf('<TickerBar'));
    expect(css).toMatch(/\.ik-ticker \{[^}]*position: sticky/);
  });
  it('elle passe au-dessus du contenu mais sous le menu latéral, les menus et les fenêtres', () => {
    expect(css).toMatch(/\.ik-ticker \{[^}]*z-index: calc\(var\(--ik-z-sidebar\) - 2\)/);
    const tokens = read('app/styles/tokens.css');
    const z = (n: string) => Number(tokens.match(new RegExp(`--ik-z-${n}: (\\d+)`))![1]);
    expect(z('sidebar') - 2).toBeLessThan(z('sidebar'));
    expect(z('topbar')).toBeGreaterThan(z('sidebar'));
    expect(z('menu')).toBeGreaterThan(z('topbar'));
    expect(z('modal')).toBeGreaterThan(z('menu'));
  });
  it('place réservée : décalage mesuré pour les ancres et les éléments collants de page', () => {
    expect(shell).toContain('--ik-sticky-offset');
    expect(read('app/styles/base.css')).toMatch(/scroll-padding-top: calc\([^;]*--ik-sticky-offset/);
    expect(read('app/styles/dashboard.css')).toContain('--ik-sticky-offset');
    expect(read('app/styles/sim.css')).toContain('--ik-sticky-offset');
  });
  it('pause au survol et au toucher, version compacte sur mobile, animations réduites respectées', () => {
    expect(css).toMatch(/\.ik-ticker__track:hover \.ik-ticker__row/);
    expect(css).toMatch(/\.ik-ticker__track:active \.ik-ticker__row/);
    expect(css).toMatch(/\.ik-tick svg \{ display: none; \}/);
    expect(css).toMatch(/prefers-reduced-motion: reduce\)[\s\S]*\.ik-ticker__track \{ overflow-x: auto/);
    expect(css).toMatch(/data-motion='off'\] \.ik-ticker__track/);
  });
  it('on peut la masquer dans les préférences (Apparence), choix mémorisé', () => {
    expect(read('app/context/ThemeContext.jsx')).toContain('tickerVisible');
    expect(read('app/components/AppearanceSettings.jsx')).toContain('Bande de cours');
    expect(read('app/components/shell/TickerBar.jsx')).toContain('tickerVisible');
  });
});

describe('statut Pro : lu depuis le serveur, jamais depuis le navigateur', () => {
  it('le badge et le texte de statut ne lisent aucune donnée enregistrée dans le navigateur', () => {
    for (const f of ['app/components/plan/PlanBadge.jsx', 'app/lib/plan.js']) expect(read(f), f).not.toMatch(/localStorage|sessionStorage|document\.cookie/);
  });
  it('le badge est affiché sur le tableau de bord et dans le menu du profil ; l\'encart « Passer Pro » seulement pour un compte gratuit', () => {
    expect(read('app/dashboard/DashHero.jsx')).toContain('<PlanBadge plan={shell?.user?.plan}');
    expect(read('app/components/shell/Topbar.jsx')).toContain('<PlanBadge plan={user?.plan}');
    const card = read('app/components/plan/UpgradeCard.jsx');
    expect(card).toMatch(/if \(!plan \|\| plan\.isPro \|\| hidden\) return null/);
  });
  it('l\'onglet Abonnement des paramètres utilise le plan du serveur (Pro manuel compris)', () => {
    expect(read('app/dashboard/page.jsx')).toContain('plan?.isPro ?? userData?.subscriptionTier');
  });
});

describe('menu du profil : accessible au clavier et sur mobile', () => {
  const top = read('app/components/shell/Topbar.jsx');
  const prim = read('app/components/ui/primitives.jsx');
  it('contient Mon profil, Paramètres, Abonnement, Aide, Se déconnecter ; Administration seulement pour un administrateur', () => {
    for (const label of ['Mon profil', 'Paramètres', 'Gérer mon abonnement', 'Voir les offres', 'Aide', 'Se déconnecter']) expect(top).toContain(label);
    expect(top).toMatch(/\{isAdmin && <Link href="\/admin"/);
  });
  it('vrai menu : rôles, flèches, Début/Fin, Échap avec retour du focus, Tab ferme, clic extérieur ferme', () => {
    expect(top).toContain('role="menuitem"');
    expect(prim).toMatch(/role: 'menu'/);
    for (const k of ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Escape', "e.key === 'Tab'", 'mousedown']) expect(prim, k).toContain(k);
    expect(prim).toContain('closeAndRestore');
  });
  it('« Paramètres » existe et est atteignable depuis le menu latéral comme depuis le menu du profil', () => {
    expect(read('app/components/shell/nav.js')).toContain("href: '/dashboard?tab=settings'");
    expect(top).toContain('/dashboard?tab=settings');
    expect(read('app/dashboard/page.jsx')).toContain("sectionParam");
  });
});
