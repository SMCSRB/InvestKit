import { expect, type Page } from '@playwright/test';

// Le document ne doit jamais être plus large que l'écran configuré (pas de défilement horizontal).
// On compare à la largeur CONFIGURÉE du test, pas à window.innerWidth : en émulation mobile, Chrome peut élargir la fenêtre
// quand le contenu déborde, ce qui cacherait justement le défaut qu'on cherche.
// La mesure est répétée pendant 5 secondes : une animation d'entrée qui n'a pas fini (machine lente) disparaît, un VRAI débordement persiste.
// En cas d'échec, le message nomme les éléments qui dépassent, pour trouver tout de suite le coupable.
export async function pasDeDefilementHorizontal(page: Page, nom: string): Promise<void> {
  const ecran = page.viewportSize()?.width ?? 0;
  expect(ecran, 'la largeur d\'écran du test doit être définie').toBeGreaterThan(0);
  const mesure = () => page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0));
  try {
    await expect.poll(mesure, { timeout: 5_000, intervals: [100, 250, 500, 1_000] }).toBeLessThanOrEqual(ecran + 1);
  } catch {
    const contenu = await mesure();
    const fautifs = await page.evaluate((largeur) => [...document.querySelectorAll('body *')]
      .filter((e) => e.getBoundingClientRect().right > largeur + 1)
      .slice(0, 6)
      .map((e) => `${e.tagName.toLowerCase()}.${String((e as HTMLElement).className).slice(0, 50)} (droite à ${Math.round(e.getBoundingClientRect().right)} px)`), ecran);
    throw new Error(`${nom} : le contenu (${contenu} px) dépasse l'écran (${ecran} px). Éléments qui dépassent : ${fautifs.join(' | ') || 'aucun repéré'}`);
  }
}

// Aucune valeur « cassée » dans le texte affiché.
export async function pasDeValeurCassee(page: Page, nom: string): Promise<void> {
  const texte = await page.locator('body').innerText();
  expect(texte, `${nom} : « undefined » affiché`).not.toMatch(/\bundefined\b/);
  expect(texte, `${nom} : « NaN » affiché`).not.toMatch(/\bNaN\b/);
  expect(texte, `${nom} : « [object Object] » affiché`).not.toMatch(/\[object Object\]/);
}

// Aucun montant en euros sur une page du jeu (tout est en InvestCoins ; l'euro est réservé à l'argent réel).
export async function pasDEurosDansLeJeu(page: Page, nom: string): Promise<void> {
  const texte = await page.locator('main').first().innerText().catch(() => '');
  expect(texte, `${nom} : un montant en € est affiché`).not.toMatch(/\d\s?€/);
}

// Ouvre l'Immobilier ; si la partie n'est pas commencée, choisit le premier profil, puis attend les annonces.
export async function ouvrirImmobilier(page: Page): Promise<void> {
  await page.goto('/immobilier');
  const choisir = page.getByRole('button', { name: 'Choisir ce profil' }).first();
  const cartes = page.locator('.rp-card');
  await choisir.or(cartes.first()).waitFor({ state: 'visible', timeout: 30_000 });
  if (await choisir.isVisible()) {
    await choisir.click();
    await expect(page.getByRole('button', { name: 'Choisir ce profil' })).toHaveCount(0);
  }
  await expect(cartes.first()).toBeVisible({ timeout: 30_000 });
}
