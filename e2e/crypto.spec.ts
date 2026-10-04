// Parcours Crypto (ordinateur) : l'affichage suit la date de jeu après une avance du temps. Exécution à part : chaque exécution démarre une API neuve (limite de requêtes).
import { test, expect } from '@playwright/test';

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
