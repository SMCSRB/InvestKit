// Une seule connexion par exécution (l'API limite les tentatives de connexion) : la session est réutilisée par les autres parcours.
import { test as setup, expect } from '@playwright/test';
import { mkdirSync } from 'fs';

setup('connexion du compte de test', async ({ page }) => {
  mkdirSync('e2e/.etat', { recursive: true });
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(process.env.E2E_EMAIL!);
  await page.getByLabel('Mot de passe', { exact: true }).fill(process.env.E2E_PASSWORD!);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('**/dashboard', { timeout: 30_000 });
  await expect(page.locator('main, [role="main"]').first()).toBeVisible();
  // Le parcours de bienvenue s'ouvre au premier lancement : on le passe ici, pour que les autres parcours ne soient jamais gênés (il a son propre test : guide.spec.ts).
  await page.getByTestId('guide-skip').click({ timeout: 10_000 }).catch(() => undefined);
  await page.context().storageState({ path: 'e2e/.etat/session.json' });
});
