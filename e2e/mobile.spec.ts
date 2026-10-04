// Parcours à 390 px de large : aucune page ne doit défiler horizontalement ni afficher de valeur cassée.
import { test, expect } from '@playwright/test';
import { ouvrirImmobilier, pasDeDefilementHorizontal, pasDeValeurCassee } from './aide';

const PAGES: { nom: string; chemin: string; titre: RegExp }[] = [
  { nom: 'Tableau de bord', chemin: '/dashboard', titre: /Tableau de bord|Bonjour|Vue d/i },
  { nom: 'Immobilier', chemin: '/immobilier', titre: /Immobilier/i },
  { nom: 'Bourse', chemin: '/bourse', titre: /Bourse/i },
  { nom: 'Crypto', chemin: '/crypto', titre: /Crypto/i },
  { nom: 'Banque', chemin: '/banque', titre: /Banque/i },
  { nom: 'Éducation', chemin: '/education', titre: /Éducation|Education|parcours/i },
  { nom: 'Glossaire', chemin: '/glossaire', titre: /Glossaire/i },
  { nom: 'Classements', chemin: '/classements', titre: /Classement/i },
];

test.describe('390 px : pages connectées', () => {
  for (const p of PAGES) {
    test(`${p.nom} : pas de défilement horizontal`, async ({ page }) => {
      await page.goto(p.chemin);
      await expect(page.locator('h1, h2').first()).toBeVisible();
      await expect(page.locator('body')).toContainText(p.titre);
      await page.waitForLoadState('networkidle').catch(() => undefined);
      await pasDeDefilementHorizontal(page, p.nom);
      await pasDeValeurCassee(page, p.nom);
    });
  }
});

test.describe('390 px : pages publiques (sans session)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  for (const [nom, chemin] of [['Connexion', '/login'], ['Inscription', '/signup']] as const) {
    test(`${nom} : pas de défilement horizontal`, async ({ page }) => {
      await page.goto(chemin);
      await expect(page.locator('form')).toBeVisible();
      await pasDeDefilementHorizontal(page, nom);
    });
  }
});

test.describe('390 px : le contrôle lui-même', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test('détecte un vrai défilement horizontal (le test n\'est pas vide)', async ({ page }) => {
    await page.setContent('<meta name="viewport" content="width=device-width, initial-scale=1"><body style="margin:0"><div style="width:900px;height:20px;background:#ccc">trop large</div></body>');
    await expect(pasDeDefilementHorizontal(page, 'page factice')).rejects.toThrow(/dépasse l'écran/);
  });
});

test.describe('390 px : connexion réelle', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test('se connecter depuis un téléphone mène au tableau de bord, sans défilement horizontal', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Adresse e-mail').fill(process.env.E2E_EMAIL!);
    await page.getByLabel('Mot de passe', { exact: true }).fill(process.env.E2E_PASSWORD!);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await page.waitForURL('**/dashboard', { timeout: 30_000 });
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await pasDeDefilementHorizontal(page, 'Tableau de bord après connexion');
  });
});

test('390 px : Immobilier, de l\'écran de départ aux annonces', async ({ page }) => {
  await ouvrirImmobilier(page);
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await pasDeDefilementHorizontal(page, 'Immobilier (annonces)');
  await pasDeValeurCassee(page, 'Immobilier (annonces)');
});

test('390 px : le graphique en aires empilées tient dans l\'écran et se lit au clavier', async ({ page }) => {
  await page.goto('/design-system');
  const graphique = page.getByTestId('stacked-area-demo');
  await graphique.scrollIntoViewIfNeeded();
  await expect(graphique.locator('svg[role="img"]')).toBeVisible();
  await pasDeDefilementHorizontal(page, 'Design system (aires empilées)');
  await graphique.locator('svg[role="img"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(graphique.getByRole('status')).toBeVisible();
  await pasDeDefilementHorizontal(page, 'Design system (infobulle ouverte)');
});
