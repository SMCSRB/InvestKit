// Parcours navigateur : le script de préparation ne touche JAMAIS une base qui n'est pas une base de test, et la configuration ne contient aucun secret.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { seedE2e } from '../scripts/e2e-seed';

const root = join(__dirname, '../..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('préparation de la base des parcours navigateur', () => {
  it('refuse une base dont le nom ne finit pas par _test, sans rien modifier ni afficher le mot de passe', async () => {
    for (const url of ['postgresql://u:SECRET@h:5432/investkit', 'postgresql://u:SECRET@h:5432/investkit_design', 'postgresql://u:SECRET@h:5432/test_prod', undefined, '', 'pas une adresse']) {
      const err = await seedE2e(url as any, 'testeur@exemple.test', 'un-mot-de-passe-long').catch((e) => e as Error);
      expect(err).toBeInstanceOf(Error);
      expect(String((err as Error).message)).toMatch(/Refusé/);
      expect(String((err as Error).message)).not.toContain('SECRET');
    }
  });
  it('exige une adresse e-mail et un mot de passe d\'au moins 12 caractères', async () => {
    const url = 'postgresql://u:p@h:5432/investkit_e2e_test';
    // Le contrôle du nom passe ; l'échec vient du contrôle des identifiants, avant toute écriture.
    await expect(seedE2e(url, 'pas-un-email', 'un-mot-de-passe-long')).rejects.toThrow(/E2E_EMAIL/);
    await expect(seedE2e(url, 'a@b.test', 'court')).rejects.toThrow(/E2E_PASSWORD/);
  });
  it('la configuration n\'a aucun secret en dur et n\'utilise pas les ports d\'un vrai site', () => {
    const cfg = read('e2e/playwright.config.ts');
    expect(cfg).toContain("randomBytes(18).toString('hex')");   // mot de passe tiré au hasard
    expect(cfg).toContain("randomBytes(32).toString('hex')");   // JWT et clé de chiffrement
    expect(cfg).toContain('API_PORT = 5100');
    expect(cfg).toContain('WEB_PORT = 3100');
    expect(cfg).not.toMatch(/JWT_SECRET:\s*'[^']+'/);
    expect(cfg).not.toMatch(/PASSWORD\s*=\s*'[^']{6,}'/);
    expect(read('backend/scripts/e2e-seed.ts')).toContain('assertTestDatabase(url);');
  });
  it('le job e2e existe dans la CI, avec une base de test', () => {
    const ci = read('.github/workflows/ci.yml');
    expect(ci).toMatch(/\n  e2e:/);
    expect(ci).toContain('npm run e2e');
    expect(ci).toContain('E2E_DATABASE_URL: postgresql://investkit_test:');
  });
});
