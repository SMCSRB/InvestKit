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

// ── Retours de test sur la copie de test ──
test('tableau de bord, carte Immobilier : la performance a un libellé clair et un calcul expliqué', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByText('Résultat si tu revendais aujourd’hui')).toBeVisible();
  await expect(page.getByText('Valeur de tes biens', { exact: true })).toBeVisible();
  await expect(page.getByTestId('dash-re-values-note')).toContainText('ce n’est pas la valeur de ton bien');
  const bloc = page.getByTestId('dash-re-explain');
  await expect(bloc).toBeVisible();
  await bloc.locator('summary').click();
  for (const mot of ['apport', 'frais de notaire', 'prix d’achat', 'décote d’un bien loué', 'capital de départ']) await expect(bloc).toContainText(mot);
  await expect(bloc).not.toContainText(/undefined|NaN/);
  await pasDEurosDansLeJeu(page, 'Tableau de bord');
});

test('« Tes premiers pas » : un compte Pro ne voit pas « Choisir ton domaine gratuit »', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByText(/Tes premiers pas/i).first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Choisir ton domaine gratuit');
});

test('Banque : le lien retour mène à la page d\'où l\'on vient, sinon au tableau de bord', async ({ page }) => {
  await page.goto('/banque');                                   // arrivée directe
  await expect(page.getByTestId('bank-back')).toContainText('Tableau de bord');
  // Navigation interne depuis l'Immobilier : le menu mène à la Banque.
  await page.goto('/immobilier');
  await page.getByRole('link', { name: /Banque et InvestCoins/ }).first().click();
  await page.waitForURL('**/banque');
  const retour = page.getByTestId('bank-back');
  await expect(retour).toContainText('Immobilier');
  await retour.click();
  await page.waitForURL('**/immobilier');
});

test('Bourse : plus de badge « Données illustratives », une note discrète à la première utilisation puis un pied de graphique', async ({ page }) => {
  await page.goto('/bourse');
  await expect(page.locator('.ik-chip--example')).toHaveCount(0);
  const note = page.getByTestId('hist-first-note');
  await expect(note).toBeVisible();
  await note.getByRole('button', { name: 'Compris' }).click();
  await expect(note).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('advance-year')).toBeVisible();
  await expect(page.getByTestId('hist-first-note')).toHaveCount(0);                 // plus jamais affichée
  await expect(page.getByText('Données illustratives : cours de clôture annuels').first()).toBeVisible();   // la mention reste en pied de graphique
});
