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

// ── Rendement net et flux mensuel sur la carte et la fiche d'une annonce ──
test('Immobilier : la carte montre le net et le flux mensuel avec l\'infobulle « Pourquoi le net est plus bas que le brut »', async ({ page }) => {
  await ouvrirImmobilier(page);
  const carte = page.locator('.rp-card').first();
  await expect(carte.getByTestId('card-net-yield')).toContainText(/Net \d/);
  await expect(carte.getByTestId('card-monthly-flow')).toContainText(/flux [+-−]?\s?[\d\s ]+/);
  await carte.getByRole('button', { name: 'Pourquoi le net est plus bas que le brut' }).click();
  const bulle = page.getByRole('dialog').filter({ hasText: 'Pourquoi le net est plus bas que le brut' });
  await expect(bulle).toBeVisible();
  await expect(bulle).toContainText('mois sans locataire');
  await pasDeValeurCassee(page, 'Carte d\'annonce');
});

test('Immobilier : la fiche d\'un bien montre rendement net, flux mensuel et son hypothèse', async ({ page }) => {
  await ouvrirImmobilier(page);
  await page.locator('.rp-card').first().locator('.rp-card__title button').click();
  await expect(page.getByTestId('sheet-net-yield')).toContainText('%');
  await expect(page.getByTestId('sheet-monthly-flow')).toContainText('/mois');
  const note = page.getByTestId('sheet-scenario-note');
  await expect(note).toContainText('apport minimal');
  await expect(note).toContainText('prêt de 25 ans');
  await pasDeValeurCassee(page, 'Fiche d\'un bien');
  await pasDEurosDansLeJeu(page, 'Fiche d\'un bien');
});

test('Crypto : après +1 mois, la liste, la fiche et le bandeau des prix suivent la nouvelle date, sans recharger la page', async ({ page }) => {
  await page.goto('/crypto');
  const date = page.getByTestId('sim-date');
  await expect(date).toContainText('2020');
  const lignes = page.locator('tbody tr[data-testid^="row-"]');
  await expect(lignes.first()).toBeVisible();
  const bandeau = page.locator('.ik-ticker__row').first();
  await expect(bandeau).toBeVisible();
  const [dateAvant, ligneAvant, bandeauAvant] = [await date.innerText(), await lignes.first().innerText(), await bandeau.innerText()];

  await page.getByTestId('adv-month').click();
  await expect(date).not.toHaveText(dateAvant);
  await expect(lignes.first()).toBeVisible();                                      // la liste n'est pas vide
  expect(await lignes.count()).toBeGreaterThan(0);
  await expect.poll(async () => lignes.first().innerText()).not.toBe(ligneAvant);   // prix de la liste à la nouvelle date
  await expect.poll(async () => bandeau.innerText(), { message: 'le bandeau des prix doit suivre la date' }).not.toBe(bandeauAvant);

  // La fiche d'un actif : le prix change quand on avance le temps depuis la fiche.
  const symbole = ((await lignes.first().getAttribute('data-testid')) ?? '').replace('row-', '');
  await lignes.first().click();
  const prix = async () => {
    const texte = (await page.locator('main').innerText()).replace(/[  ]/g, ' ');
    return new RegExp(`${symbole}\\s+([\\d ]+[,.]?\\d*)\\s*\\(`).exec(texte)?.[1] ?? null;
  };
  await expect.poll(prix).not.toBeNull();
  const prixAvant = await prix();
  const dateFiche = await date.innerText();
  await page.getByTestId('adv-month').click();
  await expect(date).not.toHaveText(dateFiche);
  await expect.poll(prix, { message: 'la fiche doit afficher le prix de la nouvelle date, sans rechargement' }).not.toBe(prixAvant);
});
