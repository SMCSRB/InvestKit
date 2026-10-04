// Parcours bureau (1280 px) : titre d'onglet, Bourse (aperçu du coût), Immobilier, Crypto, Banque.
import { test, expect } from '@playwright/test';
import { ouvrirImmobilier, pasDeValeurCassee, pasDEurosDansLeJeu } from './aide';

test('titre d\'onglet : « simulation », plus l\'ancienne formule', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveTitle("InvestKit - Simulation d'investissement");
});

test('Bourse : l\'aperçu du coût affiche prix, frais et total, sans euros', async ({ page }) => {
  await page.goto('/bourse');
  await expect(page.getByTestId('advance-year')).toBeVisible();
  await page.getByTestId('preview-buy').click();
  await expect(page.getByTestId('buy-quote')).toBeVisible();
  await expect(page.getByTestId('buy-total')).toBeVisible();
  await pasDEurosDansLeJeu(page, 'Bourse');
  await pasDeValeurCassee(page, 'Bourse');
  await page.getByRole('tab', { name: 'Mes ordres' }).click();
  await expect(page.getByText(/Aucun ordre pour l.instant|Mes ordres/).first()).toBeVisible();
});

test('Crypto, Banque, Immobilier : les pages s\'ouvrent sans valeur cassée', async ({ page }) => {
  for (const [nom, chemin] of [['Crypto', '/crypto'], ['Banque', '/banque'], ['Immobilier', '/immobilier']] as const) {
    await page.goto(chemin);
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await pasDeValeurCassee(page, nom);
  }
});

test('ancien lien du tableau de bord : ?tab=trading arrive sur /bourse', async ({ page }) => {
  await page.goto('/dashboard?tab=trading');
  await page.waitForURL('**/bourse');
});

test('Immobilier : les descriptions des six premières annonces n\'affichent jamais « undefined »', async ({ page }) => {
  await ouvrirImmobilier(page);
  await pasDeValeurCassee(page, 'Immobilier (liste)');
  const cartes = page.locator('.rp-card');
  await expect(cartes.first()).toBeVisible();
  const n = Math.min(await cartes.count(), 6);
  for (let i = 0; i < n; i += 1) {
    await cartes.nth(i).locator('.rp-card__title button').click();
    await expect(page.locator('.rp-desc')).toBeVisible();
    await pasDeValeurCassee(page, `Annonce ${i + 1}`);
    await page.goBack().catch(() => undefined);
    await expect(cartes.first()).toBeVisible();
  }
});
