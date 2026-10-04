// Guide du site à 390 px : parcours du premier lancement (passable, relançable), page d'aide complète, aucun défilement horizontal.
// Exécution à part (API neuve : limite de requêtes).
import { test, expect, Page } from '@playwright/test';
import { pasDeDefilementHorizontal } from './aide';

const CLE = 'ik-guide-seen-v1';
const oublier = async (page: Page) => { await page.evaluate((k) => localStorage.removeItem(k), CLE); };
const vu = (page: Page) => page.evaluate((k) => localStorage.getItem(k), CLE);

test('premier lancement : le parcours s\'ouvre, se déroule en six étapes sans défilement horizontal, puis ne revient plus', async ({ page }) => {
  await page.goto('/dashboard');
  await oublier(page);
  await page.reload();
  const fenetre = page.getByRole('dialog');
  await expect(fenetre).toBeVisible();
  for (let i = 1; i <= 6; i++) {
    await expect(page.getByTestId('guide-step')).toContainText(`Étape ${i} sur 6`);
    await pasDeDefilementHorizontal(page, `Parcours de bienvenue, étape ${i}`);
    const box = await fenetre.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(390);                                    // la fenêtre tient dans l'écran
    if (i < 6) await page.getByTestId('guide-next').click();
  }
  await page.getByTestId('guide-end').click();
  await expect(fenetre).toBeHidden();
  expect(await vu(page)).toBe('1');
  await page.reload();
  await expect(page.locator('main, [role="main"]').first()).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);                            // ne revient pas tout seul
});

test('on peut passer le parcours (bouton Passer ou touche Échap), et il ne revient pas', async ({ page }) => {
  await page.goto('/dashboard');
  await oublier(page);
  await page.reload();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByTestId('guide-skip').click();
  await expect(page.getByRole('dialog')).toBeHidden();
  expect(await vu(page)).toBe('1');
  await oublier(page);
  await page.reload();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  expect(await vu(page)).toBe('1');
});

test('Aide et support : le parcours se relance, le guide et les autres aides sont là', async ({ page }) => {
  await page.goto('/support');
  await expect(page.getByRole('heading', { name: 'Aide et support' }).first()).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByTestId('relaunch-guide').click();
  await expect(page.getByTestId('guide-step')).toContainText('Étape 1 sur 6');
  await page.getByTestId('guide-skip').click();
  for (const [nom, href] of [['Ouvrir le guide', '/guide'], ['Glossaire', '/glossaire'], ['Cours et quiz', '/education'], ['Nous contacter', '/contact']] as const) {
    await expect(page.getByRole('link', { name: nom })).toHaveAttribute('href', href);
  }
  await pasDeDefilementHorizontal(page, 'Aide et support');
});

test('page Guide : six rubriques, modes disponibles ou non dits clairement, quatre domaines, aucun défilement horizontal', async ({ page }) => {
  await page.goto('/guide');
  for (const id of ['quoi', 'temps', 'modes', 'domaines', 'progression', 'beta']) await expect(page.getByTestId(`section-${id}`)).toBeVisible();
  await expect(page.getByTestId('mode-history')).toContainText('Disponible aujourd\'hui');
  await expect(page.getByTestId('mode-sandbox')).toContainText('Pas encore disponible');
  await expect(page.getByTestId('mode-live')).toContainText('Pas encore disponible');
  await expect(page.getByTestId('mode-live')).toContainText('plan Pro');
  for (const d of ['bourse', 'crypto', 'immobilier', 'banque']) await expect(page.getByTestId(`domain-${d}`)).toBeVisible();
  await expect(page.getByTestId('section-quoi')).toContainText('aucune valeur réelle');
  await expect(page.getByTestId('section-beta')).toContainText('Un retour ?');
  await pasDeDefilementHorizontal(page, 'Guide du site');
  // Un lien du guide mène bien à un mot du glossaire.
  await page.getByTestId('section-quoi').getByRole('link', { name: /InvestCoin/ }).click();
  await expect(page).toHaveURL(/\/glossaire#investcoin/);
});
