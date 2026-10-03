import { getBuyAccess } from '../src/utils/entitlements';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { hasDb, setupDb, teardownDb, createUser, balanceOf, ledgerSum } from './helpers';
import { query } from '../src/utils/db';
import { investcoinsRepository, InsufficientFundsError } from '../src/repositories/investcoinsRepository';
import { tradingService, TradingError } from '../src/services/tradingService';
import { claimDailyReward } from '../src/services/dailyRewardService';
import { STARTING_CAPITAL, RANKING_MIN_INVESTED, DAILY_REWARD_COINS } from '../src/config/economy';
import { activateAccount } from '../src/services/verificationService';
import { DOMAINS } from '../src/data/marketData';
import { invitationRepository, normalizeInvitationCode } from '../src/repositories/invitationRepository';
import { getClient } from '../src/utils/db';
import { userRepository } from '../src/repositories/userRepository';

const STOCK = DOMAINS.stocks.assets[0].symbol; // cotée dès la première année
const COIN = DOMAINS.crypto.assets[0].symbol;

describe.skipIf(!hasDb)('base de données (concurrence)', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);

  describe('ledger', () => {
    it('10 débits simultanés de 30 sur 100  InvestCoins : exactement 3 passent, jamais négatif', async () => {
      const uid = await createUser({ balance: 100 });
      const results = await Promise.allSettled(
        Array.from({ length: 10 }, () => investcoinsRepository.applyTransaction(uid, -30, 'test'))
      );
      const ok = results.filter((r) => r.status === 'fulfilled').length;
      const refused = results.filter((r) => r.status === 'rejected' && r.reason instanceof InsufficientFundsError).length;
      expect(ok).toBe(3);
      expect(refused).toBe(7);
      expect(await balanceOf(uid)).toBe(10);
      expect(await ledgerSum(uid)).toBe(-90);
    });

    it('chaque écriture enregistre sa nature et son domaine', async () => {
      const uid = await createUser({ balance: 100 });
      await investcoinsRepository.applyTransaction(uid, 50, 'daily_reward');
      await investcoinsRepository.applyTransaction(uid, -20, 'trade_buy', { domain: 'crypto' });
      await investcoinsRepository.applyTransaction(uid, 5, 'trade_sell', { domain: 'crypto' });
      await investcoinsRepository.applyTransaction(uid, -3, 'immo_fee', { domain: 'real_estate' });
      const r = await query('SELECT reason, nature, domain FROM investcoins_transactions WHERE user_id = $1 ORDER BY created_at', [uid]);
      expect(r.rows).toEqual([
        { reason: 'daily_reward', nature: 'creation', domain: null },
        { reason: 'trade_buy', nature: 'exchange', domain: 'crypto' },
        { reason: 'trade_sell', nature: 'exchange', domain: 'crypto' },
        { reason: 'immo_fee', nature: 'destruction', domain: 'real_estate' },
      ]);
    });

    it('refuse les montants décimaux ou nuls', async () => {
      const uid = await createUser({ balance: 100 });
      await expect(investcoinsRepository.applyTransaction(uid, -0.4, 't')).rejects.toThrow();
      await expect(investcoinsRepository.applyTransaction(uid, 0, 't')).rejects.toThrow();
      expect(await balanceOf(uid)).toBe(100);
    });

    it('la contrainte SQL bloque un solde négatif même en écriture directe', async () => {
      const uid = await createUser({ balance: 10 });
      await expect(query('UPDATE investcoins_balance SET balance = -5 WHERE user_id = $1', [uid])).rejects.toThrow();
    });
  });

  describe('trading', () => {
    it('deux achats simultanés dont un seul est finançable : solde jamais négatif', async () => {
      const uid = await createUser({ balance: 1000, freeDomain: 'stocks' });
      // Prix 2010 du premier actif du domaine
      const view = await tradingService.getPortfolioView(uid, 'stocks');
      const symbol = Object.keys(view.prices).find((s) => view.prices[s] !== null)!;
      const price = view.prices[symbol]!;
      const qty = Math.floor(700 / price) || 1; // ~700  InvestCoins chacun : un seul passe sur 1000
      const results = await Promise.allSettled([
        tradingService.buy(uid, 'stocks', symbol, qty),
        tradingService.buy(uid, 'stocks', symbol, qty),
      ]);
      const ok = results.filter((r) => r.status === 'fulfilled').length;
      expect(ok).toBe(1);
      const failure = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
      expect((failure.reason as TradingError).code).toBe('INSUFFICIENT_FUNDS');
      expect(await balanceOf(uid)).toBeGreaterThanOrEqual(0);
      expect(1000 + (await ledgerSum(uid))).toBe(await balanceOf(uid));
    });

    it('deux achats simultanés finançables du même actif : aucune position perdue', async () => {
      const uid = await createUser({ balance: 100000, freeDomain: 'stocks' });
      const view = await tradingService.getPortfolioView(uid, 'stocks');
      const symbol = Object.keys(view.prices).find((s) => view.prices[s] !== null)!;
      await Promise.all([
        tradingService.buy(uid, 'stocks', symbol, 2),
        tradingService.buy(uid, 'stocks', symbol, 3),
      ]);
      const after = await tradingService.getPortfolioView(uid, 'stocks');
      expect(after.positions.find((p) => p.symbol === symbol)!.quantity).toBe(5);
      // Le ledger colle au solde : 100000 + somme des transactions (crédits initiaux exclus)
      const sum = await ledgerSum(uid);
      expect(100000 + sum).toBe(await balanceOf(uid));
    });

    it('validation stricte des quantités', async () => {
      const uid = await createUser({ balance: 1000, freeDomain: 'stocks' });
      for (const bad of ['5', NaN, Infinity, -1, 0, 1e12, 0.123456789, null, undefined]) {
        await expect(tradingService.buy(uid, 'stocks', STOCK, bad)).rejects.toMatchObject({ code: 'INVALID_INPUT' });
      }
      await expect(tradingService.buy(uid, 'stocks', 42, 1)).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    });

    it('abonnements : verrouillé hors domaine gratuit, vente toujours permise', async () => {
      const free = await createUser({ balance: 1000, freeDomain: 'stocks' });
      await expect(tradingService.buy(free, 'crypto', COIN, 1)).rejects.toMatchObject({ code: 'DOMAIN_LOCKED' });
      const none = await createUser({ balance: 1000 });
      await expect(tradingService.buy(none, 'stocks', STOCK, 1)).rejects.toMatchObject({ code: 'FREE_DOMAIN_NOT_CHOSEN' });
      const pro = await createUser({ balance: 1000, proOverride: true });
      const view = await tradingService.getPortfolioView(pro, 'stocks');
      expect(view.access.canBuy).toBe(true);
    });

    it('classement : achat visible, sous le seuil non classé', async () => {
      const big = await createUser({ balance: 5000, freeDomain: 'stocks', activeDays: 5 });
      const view = await tradingService.getPortfolioView(big, 'stocks');
      const symbol = Object.keys(view.prices).find((s) => view.prices[s] !== null)!;
      const q = Math.ceil(RANKING_MIN_INVESTED / view.prices[symbol]!);
      await tradingService.buy(big, 'stocks', symbol, q);
      const board = await tradingService.getLeaderboard(big, 'stocks', undefined);
      expect(board.me).not.toBeNull();
      expect(board.me!.isMe).toBe(true);

      const tiny = await createUser({ balance: 5000, freeDomain: 'stocks', activeDays: 5 });
      await tradingService.buy(tiny, 'stocks', symbol, 0.01); // < seuil de capital
      const b2 = await tradingService.getLeaderboard(tiny, 'stocks', undefined);
      expect(b2.me).toBeNull();
    });
  });

  describe('récompense quotidienne', () => {
    it('10 réclamations simultanées : une seule est payée', async () => {
      const uid = await createUser({ balance: 0 });
      const results = await Promise.all(Array.from({ length: 10 }, () => claimDailyReward(uid)));
      expect(results.filter((r) => r.claimed).length).toBe(1);
      expect(await balanceOf(uid)).toBe(DAILY_REWARD_COINS);
    });

    it('aucune série : le montant reste le même, jours consécutifs ou jour manqué (horloge injectée)', async () => {
      const uid = await createUser({ balance: 0 });
      const r1 = await claimDailyReward(uid, new Date('2026-03-02T10:00:00Z'));   // lundi
      const r2 = await claimDailyReward(uid, new Date('2026-03-03T09:00:00Z'));   // mardi (jour suivant)
      const r3 = await claimDailyReward(uid, new Date('2026-03-05T09:00:00Z'));   // jeudi (jour manqué)
      expect([r1, r2, r3].map((r) => r.claimed && r.reward)).toEqual([DAILY_REWARD_COINS, DAILY_REWARD_COINS, DAILY_REWARD_COINS]);
    });
  });

  describe('inscription', () => {
    it('vérification email envoyée 5 fois en parallèle : un seul versement', async () => {
      const referrer = await createUser({ balance: 0 });
      const uid = await createUser({ verified: false, code: '123456', referredBy: referrer });
      const user = (await userRepository.findById(uid))!;
      const results = await Promise.allSettled(Array.from({ length: 5 }, () => activateAccount(user, '123456')));
      expect(results.filter((r) => r.status === 'fulfilled' && r.value === true).length).toBe(1);
      expect(await balanceOf(uid)).toBe(STARTING_CAPITAL);
      expect(await balanceOf(referrer)).toBe(100);
    });

    it('changement de domaine gratuit : une seule fois, réservé aux comptes existants', async () => {
      const uid = await createUser({});
      await userRepository.setFreeDomainOnce(uid, 'stocks');
      // Compte créé après la migration : pas de droit de changement
      expect(await userRepository.changeFreeDomainOnce(uid, 'crypto')).toBe(false);
      await query('UPDATE users SET free_domain_change_allowed = TRUE WHERE id = $1', [uid]);
      expect(await userRepository.changeFreeDomainOnce(uid, 'crypto')).toBe(true);
      expect(await userRepository.changeFreeDomainOnce(uid, 'stocks')).toBe(false); // droit consommé
      expect((await userRepository.findById(uid))!.free_domain).toBe('crypto');
    });

    it('domaine gratuit « Immobilier » : choix accepté une seule fois, l\'achat Immobilier devient possible', async () => {
      const uid = await createUser({});
      expect(await userRepository.setFreeDomainOnce(uid, 'real_estate')).toBe(true);
      expect(await userRepository.setFreeDomainOnce(uid, 'stocks')).toBe(false);
      const u = (await userRepository.findById(uid))!;
      expect(u.free_domain).toBe('real_estate');
      expect(getBuyAccess(u, 'real_estate')).toEqual({ allowed: true });
    });

    it('domaine gratuit : choix unique', async () => {
      const uid = await createUser({});
      expect(await userRepository.setFreeDomainOnce(uid, 'stocks')).toBe(true);
      expect(await userRepository.setFreeDomainOnce(uid, 'crypto')).toBe(false);
      expect((await userRepository.findById(uid))!.free_domain).toBe('stocks');
    });
  });

  describe('codes d\'invitation', () => {
    const consumeOnce = async (code: string) => {
      const c = await getClient();
      try {
        await c.query('BEGIN');
        const id = await invitationRepository.consume(code, c);
        await c.query('COMMIT');
        return id;
      } finally { c.release(); }
    };

    it('code à 1 utilisation : 8 inscriptions simultanées, une seule passe', async () => {
      const inv = await invitationRepository.create({});
      const results = await Promise.all(Array.from({ length: 8 }, () => consumeOnce(inv.code)));
      expect(results.filter((r) => r !== null).length).toBe(1);
    });
    it('max_uses = 3 : exactement 3 utilisations', async () => {
      const inv = await invitationRepository.create({ maxUses: 3 });
      const results = await Promise.all(Array.from({ length: 6 }, () => consumeOnce(inv.code)));
      expect(results.filter((r) => r !== null).length).toBe(3);
    });
    it('expiré, révoqué ou inconnu : refusé', async () => {
      const expired = await invitationRepository.create({ expiresAt: new Date(Date.now() - 1000) });
      expect(await consumeOnce(expired.code)).toBeNull();
      const revoked = await invitationRepository.create({});
      expect(await invitationRepository.revoke(revoked.code)).toBe(true);
      expect(await consumeOnce(revoked.code)).toBeNull();
      expect(await consumeOnce('ZZZZZ-ZZZZZ')).toBeNull();
    });
    it('inscription annulée : le code n\'est pas brûlé', async () => {
      const inv = await invitationRepository.create({});
      const c = await getClient();
      await c.query('BEGIN');
      await invitationRepository.consume(inv.code, c);
      await c.query('ROLLBACK');
      c.release();
      expect(await consumeOnce(inv.code)).not.toBeNull();
    });
    it('le compte garde le code utilisé', async () => {
      const inv = await invitationRepository.create({ note: 'test' });
      const id = await consumeOnce(inv.code);
      const uid = await createUser({});
      await query('UPDATE users SET invitation_code_id = $1 WHERE id = $2', [id, uid]);
      const list = await invitationRepository.list();
      expect(list.find((l) => l.code === inv.code)!.users).toHaveLength(1);
    });
    it('format des codes', async () => {
      expect(normalizeInvitationCode(' abcde-fghjk ')).toBe('ABCDE-FGHJK');
      expect(normalizeInvitationCode('x')).toBeNull();
      expect(normalizeInvitationCode("'; DROP TABLE users;--")).toBeNull();
      expect(normalizeInvitationCode(42)).toBeNull();
    });
  });
});
