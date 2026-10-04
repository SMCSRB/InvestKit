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
  // La visite guidée est déjà marquée « terminée » pour ce compte par le script de préparation (e2e-seed.ts) : elle ne gêne aucun autre parcours (elle a son test : guide.spec.ts).
  await page.context().storageState({ path: 'e2e/.etat/session.json' });
});
