import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { hasDb, setupDb, teardownDb, createUser, balanceOf } from './helpers';
import { activateAccount, grantProStartingCapitalTx } from '../src/services/verificationService';
import { proStartingBonus, PRO_STARTING_CAPITAL_MULTIPLIER } from '../src/config/game';
import { userRepository } from '../src/repositories/userRepository';

describe('capital de départ Pro', () => {
  it('le complément Pro double le capital de départ par défaut', () => {
    expect(PRO_STARTING_CAPITAL_MULTIPLIER).toBe(2);
    expect(proStartingBonus()).toBe(500);
  });
});

describe.skipIf(!hasDb)('capital de départ Pro (base réelle)', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);

  it('compte gratuit : 500 🪙 ; compte Pro à l\'activation : 1 000 🪙', async () => {
    const free = await createUser({ verified: false, code: '111111', balance: 0 });
    await activateAccount((await userRepository.findById(free))!, '111111');
    expect(await balanceOf(free)).toBe(500);

    const pro = await createUser({ verified: false, code: '222222', balance: 0, tier: 'pro' });
    await activateAccount((await userRepository.findById(pro))!, '222222');
    expect(await balanceOf(pro)).toBe(1000);
  });

  it('passage en Pro : complément versé une seule fois, même avec 5 webhooks simultanés puis un réabonnement', async () => {
    const uid = await createUser({ balance: 500 });
    const r = await Promise.all(Array.from({ length: 5 }, () => grantProStartingCapitalTx(uid)));
    expect(r.filter((x) => x > 0)).toEqual([500]);
    expect(await balanceOf(uid)).toBe(1000);
    expect(await grantProStartingCapitalTx(uid)).toBe(0); // résiliation puis réabonnement : rien de plus
    expect(await balanceOf(uid)).toBe(1000);
  });
});
