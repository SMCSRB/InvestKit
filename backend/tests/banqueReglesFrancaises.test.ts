// Banque aux règles françaises : apport = notaire + 10 % du prix, refus net (plus de « caution »), réserve de 4 mensualités, messages chiffrés.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { hasDb, setupDb, teardownDb, createUser, balanceOf, minDownCoins } from './helpers';
import { query } from '../src/utils/db';
import { realEstateService as svc, RealEstateError } from '../src/services/realEstateService';
import { bankPersonalService as personal } from '../src/services/bankPersonalService';
import { fictiveDataSource as src } from '../src/data/realEstate/fictiveCatalog';
import { BANK_RULES } from '../src/config/immoRules';

const YEAR = 2010;
const player = async (balance: number, profile = 'executive') => {
  const uid = await createUser({ balance, freeDomain: 'real_estate' });
  await svc.startGame(uid, profile as any);
  return uid;
};
const listing = async () => {
  for (const l of await src.listListings(YEAR)) {
    if (l.age === 'old' && l.advertisedWorks === 0 && l.price > 60000 && l.price < 90000 && (await src.getExpertise(l.id, YEAR))!.hiddenDefects.length === 0) return l;
  }
  throw new Error('bien introuvable');
};
const reasonsOf = (p: any): { code: string; message: string }[] => p.bank.reasons;

describe.skipIf(!hasDb)('banque aux règles françaises', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);

  it('les valeurs de jeu sont marquées dans la configuration', () => {
    expect(BANK_RULES.minDownPaymentPctOfPrice).toBe(10);
    expect(BANK_RULES.reserveMonthlyPayments).toBe(4);
  });

  it('apport = frais de notaire + 10 % du prix : les frais de notaire seuls sont refusés, avec le montant manquant', async () => {
    const uid = await player(200000);
    const l = await listing();
    const notary = Math.ceil(l.price * 0.075);
    const p: any = await svc.previewPurchase(uid, { listingId: l.id, downPaymentCoins: notary, months: 240 });
    expect(p.bank.approved).toBe(false);
    const r = reasonsOf(p).find((x) => x.code === 'DOWN_PAYMENT_TOO_LOW')!;
    expect(r.message).toContain('10 % du prix');
    expect(r.message).toContain(String(Math.ceil(l.price * 0.1)).slice(0, 2));
    const err = await svc.purchase(uid, { listingId: l.id, downPaymentCoins: notary, months: 240 }).catch((e) => e as RealEstateError);
    expect((err as RealEstateError).code).toBe('BANK_REFUSED');
    expect(await balanceOf(uid)).toBe(200000);   // aucun mouvement de pièces
  });

  it('accord avec apport suffisant et réserve ; plus de décision « caution »', async () => {
    const uid = await player(200000);
    const l = await listing();
    const p: any = await svc.previewPurchase(uid, { listingId: l.id, downPaymentCoins: minDownCoins(l), months: 240 });
    expect(p.bank.approved).toBe(true);
    expect(p.bank.decision).toBe('approved');
  });

  it('réserve de sécurité : après l\'achat il faut garder 4 mensualités ; refus chiffré, rien n\'est débité', async () => {
    const l = await listing();
    const down = minDownCoins(l);
    // juste de quoi payer l'apport et les frais de dossier, mais pas de réserve
    const uid = await player(down + 400);
    const p: any = await svc.previewPurchase(uid, { listingId: l.id, downPaymentCoins: down, months: 240 });
    const r = reasonsOf(p).find((x) => x.code === 'RESERVE_TOO_LOW')!;
    expect(r, 'refus pour réserve').toBeDefined();
    expect(r.message).toContain('4 mensualités');
    expect(r.message).toMatch(/Il te manque \d/);
    expect(p.bank.approved).toBe(false);
    const err = await svc.purchase(uid, { listingId: l.id, downPaymentCoins: down, months: 240 }).catch((e) => e as RealEstateError);
    expect((err as RealEstateError).code).toBe('BANK_REFUSED');
    expect(await balanceOf(uid)).toBe(down + 400);
  });

  it('solde insuffisant : c\'est « solde insuffisant » qui s\'affiche, pas un faux refus de réserve', async () => {
    const uid = await player(50);
    const l = await listing();
    const err = await svc.purchase(uid, { listingId: l.id, downPaymentCoins: minDownCoins(l), months: 240 }).catch((e) => e as RealEstateError);
    expect((err as RealEstateError).code).toBe('INSUFFICIENT_FUNDS');
  });

  it('RÉSERVE = PIÈCES PROPRES : un prêt personnel de 500 ne permet pas d\'atteindre la réserve exigée pour un achat', async () => {
    const l = await listing();
    const down = minDownCoins(l);
    const uid = await player(down + 400);                       // l'apport et les frais passent, mais pas la réserve
    const before: any = await svc.previewPurchase(uid, { listingId: l.id, downPaymentCoins: down, months: 240 });
    const r0 = reasonsOf(before).find((x) => x.code === 'RESERVE_TOO_LOW')!;
    expect(r0, 'réserve insuffisante au départ').toBeDefined();
    // le joueur emprunte 500 (prêt personnel) : son solde monte, mais la réserve ne change pas
    const loan: any = await personal.borrow(uid, { amountCoins: 500, months: 24 });
    expect(loan.loanId).toBeDefined();
    expect(await balanceOf(uid)).toBe(down + 900);
    const after: any = await svc.previewPurchase(uid, { listingId: l.id, downPaymentCoins: down, months: 240 });
    const r1 = reasonsOf(after).find((x) => x.code === 'RESERVE_TOO_LOW')!;
    expect(r1, 'toujours refusé malgré le prêt').toBeDefined();
    expect(after.bank.approved).toBe(false);
    expect(r1.message).toContain('prêt personnel non remboursé');
    expect(r1.message).toContain('500');
    expect(r1.message).toMatch(/Il te manque \d/);
    // les pièces propres restantes sont identiques avec ou sans le prêt (hors mensualité du prêt personnel dans la réserve exigée)
    const own = (m: string) => Number(/il te resterait (\d+) InvestCoins à toi/.exec(m)![1]);
    expect(own(r1.message)).toBe(own(r0.message));
    // même en payant l'achat avec l'argent du prêt : toujours refusé
    const err = await svc.purchase(uid, { listingId: l.id, downPaymentCoins: down, months: 240 }).catch((e) => e as RealEstateError);
    expect((err as RealEstateError).code).toBe('BANK_REFUSED');
    expect(await balanceOf(uid)).toBe(down + 900);
  });

  it('le remboursement du prêt personnel redonne ses pièces propres : la réserve compte alors l\'épargne réelle', async () => {
    const l = await listing();
    const down = minDownCoins(l);
    const uid = await player(down + 400);
    await personal.borrow(uid, { amountCoins: 500, months: 24 });
    await query(`UPDATE bank_loans SET status = 'repaid', balance_h = 0 WHERE user_id = $1`, [uid]);   // prêt soldé (simulation)
    const p: any = await svc.previewPurchase(uid, { listingId: l.id, downPaymentCoins: down, months: 240 });
    const r = reasonsOf(p).find((x) => x.code === 'RESERVE_TOO_LOW')!;
    expect(r.message).not.toContain('prêt personnel non remboursé');
  });

  it('prêt personnel : réserve de 4 mensualités exigée sur les pièces propres, message chiffré', async () => {
    const uid = await player(100, 'employee');
    const q: any = await personal.quote(uid, { amountCoins: 5000, months: 36 });
    expect(q.approved).toBe(false);
    const r = q.reasons.find((x: any) => x.code === 'RESERVE_LOW');
    expect(r.message).toContain('4 mensualités');
    expect(r.message).toMatch(/Il te manque \d/);
    expect(r.message).not.toContain('€');
  });

  it('prêt personnel : accepté quand la réserve est là', async () => {
    const uid = await player(20000, 'employee');
    const q: any = await personal.quote(uid, { amountCoins: 5000, months: 36 });
    expect(q.reasons.find((x: any) => x.code === 'RESERVE_LOW')).toBeUndefined();
  });
});
