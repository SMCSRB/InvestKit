// Parcours navigateur (Playwright). Tout tourne en LOCAL / en CI, sur une base de test :
//   - l'API et le site sont lancés par cette configuration (ports 5100 et 3100, jamais ceux d'un vrai site) ;
//   - la base visée doit se terminer par « _test » (le script de préparation refuse sinon) ;
//   - aucun secret dans le dépôt : JWT_SECRET, FIELD_ENCRYPTION_KEY et le mot de passe du compte de test sont tirés au hasard à chaque exécution.
// Lancer :  E2E_DATABASE_URL=postgresql://…/une_base_test npm run e2e   (voir docs/tests-navigateur.md)
import { defineConfig, devices } from '@playwright/test';
import { randomBytes } from 'crypto';
import path from 'path';

const RACINE = path.resolve(__dirname, '..');   // les commandes des serveurs s'exécutent à la racine du dépôt

const API_PORT = 5100;
const WEB_PORT = 3100;
const DB = process.env.E2E_DATABASE_URL ?? 'postgresql://investkit_test:test@localhost:5432/investkit_test';

// `??=` : les processus de test héritent des valeurs tirées par le processus principal.
process.env.E2E_EMAIL ??= 'testeur-e2e@exemple.test';
process.env.E2E_PASSWORD ??= randomBytes(18).toString('hex');
process.env.E2E_BASE_URL = `http://localhost:${WEB_PORT}`;
process.env.E2E_JWT ??= randomBytes(32).toString('hex');
process.env.E2E_FIELD_KEY ??= randomBytes(32).toString('hex');

const apiEnv = {
  NODE_ENV: 'development',
  PORT: String(API_PORT),
  DATABASE_URL: DB,
  JWT_SECRET: process.env.E2E_JWT,
  FIELD_ENCRYPTION_KEY: process.env.E2E_FIELD_KEY,
  CORS_ORIGIN: `http://localhost:${WEB_PORT}`,
  FRONTEND_URL: `http://localhost:${WEB_PORT}`,
  EMAIL_PROVIDER: 'ethereal',
  INVITE_ONLY: 'true',
  E2E_EMAIL: process.env.E2E_EMAIL,
  E2E_PASSWORD: process.env.E2E_PASSWORD,
};

export default defineConfig({
  testDir: '.',
  testMatch: /.*\.(spec|setup)\.ts/,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: 'rapport' }]] : [['list']],
  outputDir: 'resultats',
  use: { baseURL: process.env.E2E_BASE_URL, trace: 'retain-on-failure', screenshot: 'only-on-failure', locale: 'fr-FR' },
  webServer: [
    {
      // Préparation de la base de test PUIS API (migrations jouées une seule fois, par le script de préparation).
      command: 'npm --prefix backend run e2e:seed && node backend/dist/index.js',
      url: `http://localhost:${API_PORT}/health`,
      cwd: RACINE,
      env: apiEnv,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'npm run start',
      url: `http://localhost:${WEB_PORT}/login`,
      cwd: RACINE,
      env: { PORT: String(WEB_PORT), NODE_ENV: 'production' },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
  projects: [
    { name: 'connexion', testMatch: /auth\.setup\.ts/ },
    { name: 'mobile-390', testMatch: /mobile\.spec\.ts/, use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 }, storageState: 'e2e/.etat/session.json' }, dependencies: ['connexion'] },
    { name: 'crypto', testMatch: /crypto\.spec\.ts/, use: { viewport: { width: 1280, height: 800 }, storageState: 'e2e/.etat/session.json' }, dependencies: ['connexion'] },
    { name: 'bureau', testMatch: /bureau\.spec\.ts/, use: { viewport: { width: 1280, height: 800 }, storageState: 'e2e/.etat/session.json' }, dependencies: ['connexion'] },
  ],
});
