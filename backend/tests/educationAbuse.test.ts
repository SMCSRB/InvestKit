import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { hasDb, setupDb, teardownDb, createUser, balanceOf } from './helpers';
import { query } from '../src/utils/db';
import { investcoinsRepository } from '../src/repositories/investcoinsRepository';
import { educationAbuseService as svc } from '../src/services/educationAbuseService';
import { EDUCATION_CATALOG } from '../src/data/educationCatalog';

const addRow = (u: string, domain: string, chapter: string, coins: number, xp: number) =>
  query('INSERT INTO education_progress (user_id, domain_id, chapter_id, score, xp_earned, coins_earned) VALUES ($1, $2, $3, 100, $4, $5)', [u, domain, chapter, xp, coins]);

describe.skipIf(!hasDb)('faille éducation : détection et correction des comptes qui en ont profité', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);
  const realDomain = Object.keys(EDUCATION_CATALOG)[0];
  const realChapter = EDUCATION_CATALOG[realDomain][0];

  // Un abuseur : 1 vrai chapitre (légitime) + 5 chapitres inventés (20  InvestCoins chacun) + 1 domaine inventé (100  InvestCoins).
  const abuser = async (balanceAfter?: number) => {
    const u = await createUser({ balance: 0 });
    await addRow(u, realDomain, realChapter, 20, 100); await investcoinsRepository.applyTransaction(u, 20, 'quiz_chapter', { domainId: realDomain });
    for (let i = 0; i < 5; i++) { await addRow(u, realDomain, `fake-${i}`, 20, 2000000000); await investcoinsRepository.applyTransaction(u, 20, 'quiz_chapter', { domainId: realDomain }); }
    await addRow(u, 'inventé', '__domain_complete__', 100, 500); await investcoinsRepository.applyTransaction(u, 100, 'quiz_domain_complete', { domainId: 'inventé' });
    if (balanceAfter !== undefined) await query('UPDATE investcoins_balance SET balance = $2 WHERE user_id = $1', [u, balanceAfter]);
    return u;
  };

  it('un joueur honnête n\'est pas signalé (vrai chapitre, fin d\'un vrai domaine)', async () => {
    const u = await createUser({ balance: 0 });
    await addRow(u, realDomain, realChapter, 20, 100); await addRow(u, realDomain, '__domain_complete__', 100, 500);
    expect((await svc.detect()).find((r) => r.userId === u)).toBeUndefined();
  });

  it('détecte l\'abuseur : lignes invalides, pièces obtenues ; ne compte PAS le vrai chapitre ; lecture seule', async () => {
    const u = await abuser();
    const before = await balanceOf(u);
    const r = (await svc.detect()).find((x) => x.userId === u)!;
    expect(r.invalidRows).toBe(6);
    expect(r.coinsGranted).toBe(5 * 20 + 100);
    expect(await balanceOf(u)).toBe(before);                                  // aucun effet de bord
  });

  it('correction : retire exactement les pièces indues, garde les vraies, journalise, est idempotente', async () => {
    const u = await abuser();
    expect(await balanceOf(u)).toBe(220);
    const res = await svc.correct(u);
    expect(res).toMatchObject({ removed: 200, unrecovered: 0, rows: 6 });
    expect(await balanceOf(u)).toBe(20);                                       // il reste la récompense du vrai chapitre
    const valid = (await query('SELECT coins_earned, xp_earned FROM education_progress WHERE user_id = $1 AND chapter_id = $2', [u, realChapter])).rows[0];
    expect(valid).toMatchObject({ coins_earned: 20, xp_earned: 100 });
    const bad = (await query(`SELECT SUM(coins_earned)::int AS c, SUM(xp_earned)::bigint AS x FROM education_progress WHERE user_id = $1 AND chapter_id <> $2`, [u, realChapter])).rows[0];
    expect(bad.c).toBe(0); expect(Number(bad.x)).toBe(0);
    expect((await query(`SELECT 1 FROM audit_logs WHERE action = 'education_abuse_corrected' AND entity_id = $1`, [u])).rowCount).toBe(1);
    expect((await query(`SELECT 1 FROM investcoins_transactions WHERE user_id = $1 AND reason = 'admin_adjustment' AND amount = -200`, [u])).rowCount).toBe(1);
    expect(await svc.correct(u)).toMatchObject({ removed: 0, rows: 0 });       // second passage : rien
    expect((await svc.detect()).find((x) => x.userId === u)).toBeUndefined();
  });

  it('pièces déjà dépensées : on retire ce qui reste, jamais de solde négatif, le reste est signalé « non récupérable »', async () => {
    const u = await abuser(50);                                                // il a dépensé presque tout
    const res = await svc.correct(u);
    expect(res).toMatchObject({ removed: 50, unrecovered: 150 });
    expect(await balanceOf(u)).toBe(0);
    expect(await balanceOf(u)).toBeGreaterThanOrEqual(0);
  });

  it('filet par le registre : plus de récompenses que de chapitres existants = signalé, même sans ligne d\'avancement', async () => {
    const u = await createUser({ balance: 0 });
    const total = Object.values(EDUCATION_CATALOG).reduce((n, c) => n + c.length, 0);
    for (let i = 0; i < total + 1; i++) await investcoinsRepository.applyTransaction(u, 1, 'quiz_chapter', { domainId: realDomain });
    expect((await svc.detectByLedger()).some((x) => x.userId === u)).toBe(true);
    const honest = await createUser({ balance: 0 });
    await investcoinsRepository.applyTransaction(honest, 20, 'quiz_chapter', { domainId: realDomain });
    expect((await svc.detectByLedger()).some((x) => x.userId === honest)).toBe(false);
  });
});

import { readFileSync } from 'fs';
import { join } from 'path';
describe('requête SQL de détection (ops/sql/detecter-abus-education.sql)', () => {
  it('liste exactement les chapitres du catalogue et les bonnes limites', () => {
    const sql = readFileSync(join(__dirname, '../../ops/sql/detecter-abus-education.sql'), 'utf8');
    const pairs = [...sql.matchAll(/\('([a-z_]+)', '(\d+)'\)/g)].map((m) => `${m[1]}:${m[2]}`).sort();
    const expected = Object.entries(EDUCATION_CATALOG).flatMap(([d, cs]) => cs.map((c) => `${d}:${c}`)).sort();
    expect(pairs).toEqual(expected);
    const total = expected.length;
    expect(sql).toContain(`> ${total}`);
    expect(sql).toContain(`> ${Object.keys(EDUCATION_CATALOG).length}`);
  });
});
