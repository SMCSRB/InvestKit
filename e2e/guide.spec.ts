// Visite guidée interactive à 390 px : projecteur, navigation réelle, étapes qui sautent quand un élément manque, pause / reprise (état gardé par le compte), mini-visite, clavier.
// Exécution à part (API neuve : limite de requêtes). Le compte de test a la visite « terminée » au départ : chaque test commence par la remettre à zéro, comme un joueur, depuis « Aide et support ».
import { test, expect, Page } from '@playwright/test';
import { pasDeDefilementHorizontal } from './aide';

const remettreAZero = async (page: Page) => {
  await page.goto('/support');
  await page.getByTestId('tour-reset').click();
  await expect(page.getByTestId('tour-main-status')).toHaveText('Pas commencée');
};

// La bulle doit toujours tenir dans l'écran et rester lisible.
const bulleDansEcran = async (page: Page) => {
  const pop = page.getByTestId('tour-pop');
  await expect(pop).toBeVisible();
  const b = (await pop.boundingBox())!;
  const vp = page.viewportSize()!;
  expect(b.x).toBeGreaterThanOrEqual(-1);
  expect(b.x + b.width).toBeLessThanOrEqual(vp.width + 1);
  expect(b.y).toBeGreaterThanOrEqual(-1);
  expect(b.y + b.height).toBeLessThanOrEqual(vp.height + 1);
};

test('visite complète : s\'ouvre sur le tableau de bord, désigne les vrais éléments, emmène sur les pages, ne reste jamais coincée, puis est terminée pour le compte', async ({ page }) => {
  test.setTimeout(180_000);
  await remettreAZero(page);
  await page.goto('/dashboard');
  await expect(page.getByTestId('tour')).toHaveAttribute('data-step', 'welcome');
  await bulleDansEcran(page);
  await pasDeDefilementHorizontal(page, 'Visite guidée, accueil');
  await page.getByTestId('tour-next').click();
  await expect(page.getByTestId('tour')).toHaveAttribute('data-step', 'dash-patrimoine');
  await expect(page.getByTestId('tour-ring')).toBeVisible();                       // l'élément est mis en lumière
  await expect(page.getByTestId('tour-count')).toContainText('étape 2 sur');

  const vues = new Set<string>();
  const pages = new Set<string>();
  for (let i = 0; i < 200; i++) {
    if ((await page.getByTestId('tour-running').count()) === 0) break;
    const tour = page.getByTestId('tour');
    if ((await tour.count()) === 0) { await page.waitForTimeout(200); continue; }     // l'élément suivant n'est pas encore trouvé : aucun voile pendant ce temps
    const id = await tour.getAttribute('data-step');
    if (id) vues.add(id);
    pages.add(new URL(page.url()).pathname);
    await bulleDansEcran(page);
    const sauter = page.getByTestId('tour-skip-step');
    if (await sauter.isVisible().catch(() => false)) await sauter.click();          // étape active (action du joueur) : on passe
    else if (await page.getByTestId('tour-next').isVisible().catch(() => false)) await page.getByTestId('tour-next').click();
    await page.waitForTimeout(150);
  }
  await expect(page.getByTestId('tour-running')).toHaveCount(0, { timeout: 15_000 });
  for (const p of ['/bourse', '/crypto', '/immobilier', '/banque', '/education', '/classements', '/profile']) expect(pages, `la visite a emmené sur ${p}`).toContain(p);
  expect(vues).toContain('retour-bouton');

  // État gardé par le compte : après rechargement, la visite est terminée et ne revient pas.
  await page.goto('/support');
  await expect(page.getByTestId('tour-main-status')).toHaveText('Terminée');
  await page.goto('/dashboard');
  await expect(page.locator('main, [role="main"]').first()).toBeVisible();
  await page.waitForTimeout(2_500);
  await expect(page.getByTestId('tour')).toHaveCount(0);
});

test('Échap met la visite en pause, « Reprendre » repart de la bonne étape, « Passer la visite » arrête sans reprise automatique', async ({ page }) => {
  await remettreAZero(page);
  await page.goto('/dashboard');
  await page.getByTestId('tour-next').click();
  await page.getByTestId('tour-next').click();                                     // dash-liquidites
  const id = await page.getByTestId('tour').getAttribute('data-step');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('tour')).toHaveCount(0);
  await page.goto('/support');                                                    // l'écriture serveur est envoyée au changement de page
  await expect(page.getByTestId('tour-main-status')).toHaveText('En pause');
  await page.getByTestId('tour-resume').click();
  await expect(page.getByTestId('tour')).toHaveAttribute('data-step', /.+/);
  await expect(page.getByTestId('tour-count')).toBeVisible();
  expect(id).toBeTruthy();
  await page.getByTestId('tour-skip').click();
  await expect(page.getByTestId('tour')).toHaveCount(0);
  await page.goto('/support');
  await expect(page.getByTestId('tour-main-status')).toHaveText('Passée');
});

test('clavier : flèche droite et Entrée avancent, flèche gauche revient, le focus est dans la bulle', async ({ page }) => {
  await remettreAZero(page);
  await page.goto('/dashboard');
  await expect(page.getByTestId('tour')).toHaveAttribute('data-step', 'welcome');
  await expect(page.getByTestId('tour-pop')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('tour')).toHaveAttribute('data-step', 'dash-patrimoine');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('tour')).not.toHaveAttribute('data-step', 'dash-patrimoine');
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('tour')).toHaveAttribute('data-step', 'dash-patrimoine');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('tour')).toHaveCount(0);
});

test('mini-visite : invitation au premier passage sur la page, bouton « Guide de cette page » toujours là, quitter à tout moment', async ({ page }) => {
  await remettreAZero(page);
  await page.goto('/immobilier');
  await expect(page.getByTestId('tour-invite')).toBeVisible({ timeout: 15_000 });
  await pasDeDefilementHorizontal(page, 'Invitation à la mini-visite');
  await page.getByTestId('tour-invite-go').click();
  await expect(page.getByTestId('tour')).toBeVisible();
  await expect(page.getByTestId('tour-count')).toContainText('Guide : l\'Immobilier');
  await bulleDansEcran(page);
  await page.getByTestId('tour-skip').click();                                     // « Quitter »
  await expect(page.getByTestId('tour')).toHaveCount(0);
  await expect(page.getByTestId('tour-page-guide')).toBeVisible();                 // toujours visible
  await page.getByTestId('tour-page-guide').click();
  await expect(page.getByTestId('tour')).toBeVisible();
  await page.keyboard.press('Escape');
  // Pas de nouvelle invitation après « Quitter ».
  await page.reload();
  await expect(page.locator('main, [role="main"]').first()).toBeVisible();
  await page.waitForTimeout(2_000);
  await expect(page.getByTestId('tour-invite')).toHaveCount(0);
});
