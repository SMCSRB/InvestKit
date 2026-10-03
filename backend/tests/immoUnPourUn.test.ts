import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { hasDb, setupDb, teardownDb, createUser, balanceOf, ledgerSum } from './helpers';
import { query } from '../src/utils/db';
import { realEstateService as svc } from '../src/services/realEstateService';
import { bankPersonalService as personal } from '../src/services/bankPersonalService';
import { fictiveDataSource as src } from '../src/data/realEstate/fictiveCatalog';
import { EUROS_PER_COIN, STARTING_CAPITAL } from '../src/config/economy';
import { PERSONAL_LOAN } from '../src/config/bankRules';
import { STARTING_PROFILES } from '../src/config/immoRules';

// Immobilier à 1 InvestCoin = 1 € : le capital de départ achète un petit bien, au centime près.
describe.skipIf(!hasDb)('Immobilier : 1 InvestCoin = 1 €', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);

  const listing = async () => {
    for (const l of await src.listListings(2010)) {
      if (l.age === 'old' && l.advertisedWorks === 0 && l.price > 30000 && l.price < 36000 && (await src.getExpertise(l.id, 2010))!.hiddenDefects.length === 0) return l;
    }
    throw new Error('bien introuvable');
  };

  it('les pièces de l\'apport valent des euros 1 pour 1 ; le débit est exact et sans création de pièces', async () => {
    const uid = await createUser({ balance: STARTING_CAPITAL, freeDomain: 'real_estate' });
    await svc.startGame(uid, 'employee');
    const l = await listing();
    const coins = Math.ceil(l.price * 0.25);   // notaire (7,5 %) + 10 % du prix = 17,5 % minimum
    const prev: any = await svc.previewPurchase(uid, { listingId: l.id, downPaymentCoins: coins, months: 240 });
    expect(prev.costs.downPayment).toBe(coins * EUROS_PER_COIN);
    expect(prev.coins.total).toBe(coins + prev.coins.loanFees);
    expect(prev.coins.balance).toBe(STARTING_CAPITAL);
    await svc.purchase(uid, { listingId: l.id, downPaymentCoins: coins, months: 240 });
    const debited = coins + prev.coins.loanFees;
    expect(await balanceOf(uid)).toBe(STARTING_CAPITAL - debited);
    expect(await ledgerSum(uid)).toBe(-debited);
    const rows = (await query(`SELECT reason, amount FROM investcoins_transactions WHERE user_id = $1`, [uid])).rows;
    const notary = rows.find((r) => r.reason === 're_notary_fees');
    expect(-notary.amount).toBe(Math.ceil(prev.costs.notaryFees / EUROS_PER_COIN));   // frais de notaire arrondis contre le joueur
    expect(rows.every((r) => r.amount < 0)).toBe(true);                                // un achat ne crée jamais de pièces
  });

  it('prêt personnel : plafond = 6 mois de revenus nets, en pièces égales aux euros', async () => {
    for (const profile of ['student', 'employee', 'executive'] as const) {
      const uid = await createUser({ balance: STARTING_CAPITAL, freeDomain: 'real_estate' });
      await svc.startGame(uid, profile);
      const q: any = await personal.quote(uid, { amountCoins: PERSONAL_LOAN.minPrincipalCoins, months: 24 });
      expect(q.limits.capCoins).toBe(Math.floor((PERSONAL_LOAN.incomeMonthsCap * STARTING_PROFILES[profile].netMonthlyIncome) / EUROS_PER_COIN));
      expect(q.limits.capCoins).toBe(PERSONAL_LOAN.incomeMonthsCap * STARTING_PROFILES[profile].netMonthlyIncome);
    }
  });
});
