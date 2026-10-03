// Script « test:give-coins » : refuse hors base _test, crédite par le registre, compte existant seulement.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync, spawnSync } from 'child_process';
import path from 'path';
import { hasDb, setupDb, teardownDb, createUser, balanceOf, ledgerSum } from './helpers';
import { query } from '../src/utils/db';
import {
  databaseNameOf, isTestDatabaseName, assertTestDatabase, parseArgs, giveCoins, GiveCoinsError, MAX_GIFT, TEST_GIFT_REASON, TEST_GIFT_LABEL,
} from '../scripts/test-give-coins';

const BACKEND = path.resolve(__dirname, '..');
const TSNODE = path.join(BACKEND, 'node_modules', '.bin', 'ts-node');
const run = (env: Record<string, string>, args: string[]) => spawnSync(TSNODE, ['scripts/test-give-coins.ts', ...args], { cwd: BACKEND, env: { ...process.env, ...env }, encoding: 'utf8', timeout: 60_000 });

describe('test:give-coins : refus hors base de test (sans base)', () => {
  it('lit le nom de la base dans l\'adresse de connexion (options et mot de passe ignorés)', () => {
    expect(databaseNameOf('postgresql://u:p@h:5432/investkit_design_test')).toBe('investkit_design_test');
    expect(databaseNameOf('postgresql://u:p@h:5432/investkit_design_test?sslmode=require')).toBe('investkit_design_test');
    expect(databaseNameOf('postgresql://u:p_test@h:5432/investkit')).toBe('investkit');
    expect(databaseNameOf('postgresql://u:p@h:5432/')).toBeNull();
    expect(databaseNameOf('pas une adresse')).toBeNull();
    expect(databaseNameOf(undefined)).toBeNull();
  });
  it('accepte seulement un nom qui FINIT par _test', () => {
    for (const ok of ['investkit_design_test', 'investkit_test', 'x_test']) expect(isTestDatabaseName(ok), ok).toBe(true);
    for (const ko of ['investkit', 'investkit_design', 'investkit_test_backup', 'investkit_testing', 'test', '_test', 'investkit-test', 'INVESTKIT', '']) expect(isTestDatabaseName(ko), ko).toBe(false);
  });
  it('refuse le vrai site, les noms voisins, une adresse absente ou illisible, avec un message clair', () => {
    for (const url of ['postgresql://u:p@h/investkit', 'postgresql://u:p@h/investkit_design', 'postgresql://u:p@h/investkit_test_backup?x=_test']) {
      expect(() => assertTestDatabase(url), url).toThrow(GiveCoinsError);
      expect(() => assertTestDatabase(url)).toThrow(/ne finit pas par « _test »/);
    }
    expect(() => assertTestDatabase(undefined)).toThrow(/DATABASE_URL n'est pas défini/);
    expect(() => assertTestDatabase('')).toThrow(/DATABASE_URL n'est pas défini/);
    expect(() => assertTestDatabase('postgresql://u:p@h:5432/')).toThrow(/impossible de lire/);
    expect(assertTestDatabase('postgresql://u:p@h/investkit_design_test')).toBe('investkit_design_test');
  });
  it('le message de refus n\'affiche jamais le mot de passe ni l\'adresse', () => {
    try { assertTestDatabase('postgresql://admin:MOT_DE_PASSE_SECRET@serveur.exemple:5432/investkit'); } catch (e) {
      expect((e as Error).message).not.toContain('MOT_DE_PASSE_SECRET');
      expect((e as Error).message).not.toContain('serveur.exemple');
    }
  });
  it('arguments : --user et --amount obligatoires, montant entier de 1 à ' + MAX_GIFT, () => {
    expect(parseArgs(['--user', 'TEST', '--amount', '50000'])).toEqual({ user: 'TEST', amount: 50000 });
    for (const bad of [[], ['--user', 'TEST'], ['--amount', '5'], ['--user', 'TEST', '--amount', '0'], ['--user', 'TEST', '--amount', '-5'], ['--user', 'TEST', '--amount', '1.5'],
      ['--user', 'TEST', '--amount', 'abc'], ['--user', 'TEST', '--amount', String(MAX_GIFT + 1)], ['--user', ' ', '--amount', '5'], ['--user', 'TEST', '--amount', '5', '--force']]) {
      expect(() => parseArgs(bad as string[]), JSON.stringify(bad)).toThrow(GiveCoinsError);
    }
  });
  it('LANCÉ EN VRAI sur une base dont le nom ne finit pas par _test : refus, code 1, aucune connexion, aucun secret affiché', () => {
    const r = run({ DATABASE_URL: 'postgresql://admin:MOT_DE_PASSE_SECRET@127.0.0.1:1/investkit' }, ['--user', 'TEST', '--amount', '50000']);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('Refusé');
    expect(r.stderr).toContain('ne finit pas par « _test »');
    expect(r.stdout + r.stderr).not.toContain('MOT_DE_PASSE_SECRET');
    expect(r.stdout).not.toContain('Solde');
  });
  it('LANCÉ EN VRAI sans DATABASE_URL : refus, code 1', () => {
    const r = run({ DATABASE_URL: '' }, ['--user', 'TEST', '--amount', '50000']);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('Refusé');
  });
});

describe.skipIf(!hasDb)('test:give-coins : crédit par le registre (base de test)', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);
  const url = process.env.TEST_DATABASE_URL;

  it('crédite un compte existant : solde avant/après, ligne du registre « don de test », journal d\'audit, solde = registre', async () => {
    const u = await createUser({ balance: 387 });
    await query(`UPDATE users SET username = $2 WHERE id = $1`, [u, `Testeur${u.slice(0, 6)}`]);
    const r = await giveCoins({ user: `testeur${u.slice(0, 6)}`, amount: 50000 }, url);   // insensible à la casse
    expect(r).toMatchObject({ before: 387, after: 50387, amount: 50000, userId: u });
    expect(await balanceOf(u)).toBe(50387);
    const led = (await query(`SELECT amount, reason, nature, domain, metadata FROM investcoins_transactions WHERE user_id = $1 AND reason = $2`, [u, TEST_GIFT_REASON])).rows;
    expect(led).toHaveLength(1);
    expect(Number(led[0].amount)).toBe(50000);
    expect(led[0].nature).toBe('creation');
    expect(led[0].metadata.label).toBe(TEST_GIFT_LABEL);
    expect(await ledgerSum(u)).toBe(50000);
    const aud = (await query(`SELECT metadata FROM audit_logs WHERE user_id = $1 AND action = 'test_give_coins'`, [u])).rows;
    expect(aud).toHaveLength(1);
    expect(aud[0].metadata).toMatchObject({ amount: 50000, label: TEST_GIFT_LABEL });
  });

  it('accepte aussi l\'e-mail du compte, et un compte sans solde (créé à 0)', async () => {
    const u = await createUser();
    const r = await giveCoins({ user: `${u}@test.local`, amount: 100 }, url);
    expect(r).toMatchObject({ before: 0, after: 100 });
  });

  it('compte inconnu : erreur claire, rien n\'est créé ni modifié', async () => {
    const before = Number((await query(`SELECT COUNT(*)::int AS n FROM investcoins_transactions WHERE reason = $1`, [TEST_GIFT_REASON])).rows[0].n);
    const users = Number((await query('SELECT COUNT(*)::int AS n FROM users')).rows[0].n);
    await expect(giveCoins({ user: 'compte-inexistant-xyz', amount: 500 }, url)).rejects.toThrow(/Aucun compte/);
    expect(Number((await query(`SELECT COUNT(*)::int AS n FROM investcoins_transactions WHERE reason = $1`, [TEST_GIFT_REASON])).rows[0].n)).toBe(before);
    expect(Number((await query('SELECT COUNT(*)::int AS n FROM users')).rows[0].n)).toBe(users);
  });

  it('REFUS sur une base dont le nom ne finit pas par _test : rien n\'est modifié, même avec un compte existant', async () => {
    const u = await createUser({ balance: 1000 });
    await query(`UPDATE users SET username = $2 WHERE id = $1`, [u, `Refus${u.slice(0, 6)}`]);
    for (const bad of ['postgresql://u:p@h:5432/investkit', 'postgresql://u:p@h:5432/investkit_design', undefined]) {
      await expect(giveCoins({ user: `Refus${u.slice(0, 6)}`, amount: 50000 }, bad)).rejects.toThrow(/Refusé/);
    }
    expect(await balanceOf(u)).toBe(1000);
    expect((await query(`SELECT COUNT(*)::int AS n FROM investcoins_transactions WHERE user_id = $1 AND reason = $2`, [u, TEST_GIFT_REASON])).rows[0].n).toBe(0);
  });

  it('LANCÉ EN VRAI sur la base de test : affiche base, solde avant et solde après', async () => {
    const u = await createUser({ balance: 10 });
    await query(`UPDATE users SET username = $2 WHERE id = $1`, [u, `Cli${u.slice(0, 6)}`]);
    const out = execFileSync(TSNODE, ['scripts/test-give-coins.ts', '--user', `Cli${u.slice(0, 6)}`, '--amount', '500'], { cwd: BACKEND, env: { ...process.env, DATABASE_URL: url }, encoding: 'utf8', timeout: 60_000 });
    expect(out).toMatch(/Base : \w+_test/);
    expect(out).toContain('Solde avant : 10 InvestCoins');
    expect(out).toContain('Solde après : 510 InvestCoins');
    expect(await balanceOf(u)).toBe(510);
  });
});
