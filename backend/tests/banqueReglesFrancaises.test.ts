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
    expect(BANK_RULES.lowSavingsWarningMonths).toBe(3);                        // avertissement seulement (jamais un refus)
    expect((BANK_RULES as any).reserveMonthlyPayments).toBeUndefined();       // l'ancienne règle de réserve n'existe plus
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

  it('accord avec apport suffisant ; plus de décision « caution »', async () => {
    const uid = await player(200000);
    const l = await listing();
    const p: any = await svc.previewPurchase(uid, { listingId: l.id, downPaymentCoins: minDownCoins(l), months: 240 });
    expect(p.bank.approved).toBe(true);
    expect(p.bank.decision).toBe('approved');
  });

  it('peu de pièces restantes : achat ACCEPTÉ avec un avertissement chiffré (jamais refusé pour la réserve), et il va jusqu\'au bout', async () => {
    const l = await listing();
    const down = minDownCoins(l);
    // juste de quoi payer l'apport et les frais de dossier : presque aucune épargne restante
    const uid = await player(down + 400);
    const p: any = await svc.previewPurchase(uid, { listingId: l.id, downPaymentCoins: down, months: 240 });
    expect(p.bank.approved).toBe(true);                                             // pas de refus
    expect(reasonsOf(p).map((x) => x.code)).not.toContain('RESERVE_TOO_LOW');
    expect(p.bank.warnings).toHaveLength(1);
    const w = p.bank.warnings[0];
    expect(w.code).toBe('LOW_SAVINGS');
    expect(w.message).toMatch(/Après cet achat, il te restera [\d\s\u202f]* pièces, soit \d+,\d mensualité \(.* pièces ÷ .* de mensualités par mois/);
    expect(w.message).toContain('Moins de 3 mensualités expose à un impayé.');
    expect(w.months).toBeLessThan(3);
    // le joueur peut acheter quand même
    const res: any = await svc.purchase(uid, { listingId: l.id, downPaymentCoins: down, months: 240 });
    expect(res.success).toBe(true);
    expect(res.summary.bank.warnings).toHaveLength(1);
    expect(await balanceOf(uid)).toBeLessThan(down + 400);
  });

  it('beaucoup de pièces restantes : aucun avertissement', async () => {
    const l = await listing();
    const uid = await player(minDownCoins(l) + 500_000);
    const p: any = await svc.previewPurchase(uid, { listingId: l.id, downPaymentCoins: minDownCoins(l), months: 240 });
    expect(p.bank.approved).toBe(true);
    expect(p.bank.warnings).toEqual([]);
  });

  it('endettement au-dessus de 35 % : refus chiffré avec la mensualité maximale (règle HCSF)', async () => {
    const uid = await player(500_000, 'student');
    let l: any;
    for (const x of await src.listListings(YEAR)) { if (x.price > 150000 && (await src.getExpertise(x.id, YEAR))!.hiddenDefects.length === 0) { l = x; break; } }
    const p: any = await svc.previewPurchase(uid, { listingId: l.id, downPaymentCoins: minDownCoins(l), months: 240 });
    const r = reasonsOf(p).find((x) => x.code === 'DEBT_RATIO_TOO_HIGH');
    expect(r, 'endettement trop élevé pour un étudiant').toBeDefined();
    expect(r!.message).toContain('plafond de 35 %');
    expect(r!.message).toContain('Mensualité maximale acceptable');
    expect(p.bank.approved).toBe(false);
    const err = await svc.purchase(uid, { listingId: l.id, downPaymentCoins: minDownCoins(l), months: 240 }).catch((e) => e as RealEstateError);
    expect((err as RealEstateError).code).toBe('BANK_REFUSED');
  });

  it('solde insuffisant : c\'est « solde insuffisant » qui s\'affiche (pas un refus de la banque)', async () => {
    const uid = await player(50);
    const l = await listing();
    const err = await svc.purchase(uid, { listingId: l.id, downPaymentCoins: minDownCoins(l), months: 240 }).catch((e) => e as RealEstateError);
    expect((err as RealEstateError).code).toBe('INSUFFICIENT_FUNDS');
  });

  it('les pièces d\'un prêt personnel non remboursé ne comptent PAS comme de l\'épargne dans l\'avertissement', async () => {
    const l = await listing();
    const down = minDownCoins(l);
    const uid = await player(down + 400);
    const before: any = await svc.previewPurchase(uid, { listingId: l.id, downPaymentCoins: down, months: 240 });
    const w0 = before.bank.warnings[0];
    const loan: any = await personal.borrow(uid, { amountCoins: 500, months: 24 });
    expect(loan.loanId).toBeDefined();
    expect(await balanceOf(uid)).toBe(down + 900);                                  // le solde monte de 500 …
    const after: any = await svc.previewPurchase(uid, { listingId: l.id, downPaymentCoins: down, months: 240 });
    expect(after.bank.approved).toBe(true);                                         // … l'achat reste accepté …
    const w1 = after.bank.warnings[0];
    expect(w1.savings).toBe(w0.savings);                                            // … mais l'épargne comptée ne bouge pas
    expect(w1.message).toContain('prêt personnel non remboursé');
    expect(w1.message).toContain('500');
    expect(w0.message).not.toContain('prêt personnel');
  });

  it('le remboursement du prêt personnel : le message n\'en parle plus', async () => {
    const l = await listing();
    const down = minDownCoins(l);
    const uid = await player(down + 400);
    await personal.borrow(uid, { amountCoins: 500, months: 24 });
    await query(`UPDATE bank_loans SET status = 'repaid', balance_h = 0 WHERE user_id = $1`, [uid]);   // prêt soldé (simulation)
    const p: any = await svc.previewPurchase(uid, { listingId: l.id, downPaymentCoins: down, months: 240 });
    expect(p.bank.warnings[0].message).not.toContain('prêt personnel non remboursé');
  });

  it('prêt personnel : peu d\'épargne = AVERTISSEMENT chiffré, jamais un refus pour la réserve', async () => {
    const uid = await player(100, 'employee');
    const q: any = await personal.quote(uid, { amountCoins: 5000, months: 36 });
    expect(q.reasons.map((x: any) => x.code)).not.toContain('RESERVE_LOW');
    expect(q.warnings).toHaveLength(1);
    expect(q.warnings[0].message).toContain('Après ce prêt, il te restera 100 pièces');
    expect(q.warnings[0].message).toContain('Moins de 3 mensualités expose à un impayé.');
    expect(q.warnings[0].message).not.toContain('€');
    // la banque accepte si les règles françaises sont respectées : le prêt peut être pris
    if (q.approved) { const r: any = await personal.borrow(uid, { amountCoins: 5000, months: 36 }); expect(r.loanId).toBeDefined(); }
  });

  it('prêt personnel : assez d\'épargne, aucun avertissement', async () => {
    const uid = await player(200_000, 'employee');
    const q: any = await personal.quote(uid, { amountCoins: 5000, months: 36 });
    expect(q.warnings).toEqual([]);
  });
});
