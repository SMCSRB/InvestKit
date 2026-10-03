import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { hasDb, setupDb, teardownDb, createUser, balanceOf } from './helpers';
import { activateAccount, grantProStartingCapitalTx } from '../src/services/verificationService';
import { proStartingBonus, PRO_STARTING_BONUS, STARTING_CAPITAL } from '../src/config/economy';
import { userRepository } from '../src/repositories/userRepository';

describe('capital de départ Pro', () => {
  it('le complément Pro double le capital de départ par défaut', () => {
    expect(PRO_STARTING_BONUS).toBe(10_000);
    expect(proStartingBonus()).toBe(PRO_STARTING_BONUS);
    expect(STARTING_CAPITAL + proStartingBonus()).toBe(2 * STARTING_CAPITAL);
  });
});

describe.skipIf(!hasDb)('capital de départ Pro (base réelle)', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);

  it('compte gratuit : capital de départ ; compte Pro à l\'activation : le double', async () => {
    const free = await createUser({ verified: false, code: '111111', balance: 0 });
    await activateAccount((await userRepository.findById(free))!, '111111');
    expect(await balanceOf(free)).toBe(STARTING_CAPITAL);

    const pro = await createUser({ verified: false, code: '222222', balance: 0, tier: 'pro' });
    await activateAccount((await userRepository.findById(pro))!, '222222');
    expect(await balanceOf(pro)).toBe(2 * STARTING_CAPITAL);
  });

  it('passage en Pro : complément versé une seule fois, même avec 5 webhooks simultanés puis un réabonnement', async () => {
    const uid = await createUser({ balance: STARTING_CAPITAL });
    const r = await Promise.all(Array.from({ length: 5 }, () => grantProStartingCapitalTx(uid)));
    expect(r.filter((x) => x > 0)).toEqual([PRO_STARTING_BONUS]);
    expect(await balanceOf(uid)).toBe(2 * STARTING_CAPITAL);
    expect(await grantProStartingCapitalTx(uid)).toBe(0); // résiliation puis réabonnement : rien de plus
    expect(await balanceOf(uid)).toBe(2 * STARTING_CAPITAL);
  });
});
