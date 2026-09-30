import type { Queryable } from '../../repositories/investcoinsRepository';
import { query } from '../../utils/db';
import { leaderboardRepository } from '../../repositories/leaderboardRepository';
import { computeNetPerformance } from '../../engine/immo/valuation';
import { computePerformancePct } from '../../utils/performance';
import { portfolioDebtInfo } from '../bankPortfolioService';
import { CRYPTO_DOMAIN, CRYPTO_MODE, CRYPTO_ECONOMY as E } from '../../config/cryptoMarketRules';
import { LEADERBOARD_SIZE, MIN_RANKED_CAPITAL } from '../../config/game';
import { CryptoDataError } from './dataService';
import { marketFor, num, toAccount } from './core';
import type { CryptoAccount } from './clockService';

// Classement Crypto : en % de performance, par mode, PAR PÉRIODE SIMULÉE (un mois), sur la valeur nette de dettes, levier affiché.
// Performance = (valeur des cryptos + produit net des ventes − montants investis − intérêts payés) ÷ capital propre (investi − part financée par emprunt, plancher 10 %).
export const periodOf = (ms: number): string => { const d = new Date(ms); return `M${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };

export const snapshotLeaderboard = async (db: Queryable, account: CryptoAccount, atMs = account.simulatedAt): Promise<void> => {
  const userId = account.userId;
  const pos = (await db.query(`SELECT a.symbol, p.quantity::text AS q FROM crypto_positions p JOIN crypto_assets a ON a.id = p.asset_id WHERE p.user_id = $1 AND p.quantity > 0`, [userId])).rows;
  let equity = 0;
  for (const p of pos) { const m = await marketFor(db, p.symbol, atMs); equity += Math.floor(((m?.price ?? 0) * num(p.q)) / E.usdPerCoin); }
  const f = (await db.query(
    `SELECT COALESCE(SUM(notional_coins + fee_coins) FILTER (WHERE side = 'buy' AND NOT swap), 0)::bigint AS bought,
            COALESCE(SUM(notional_coins - fee_coins - tax_coins) FILTER (WHERE side = 'sell' AND NOT swap), 0)::bigint AS proceeds,
            COALESCE(SUM(fee_coins) FILTER (WHERE swap), 0)::bigint AS swap_fees
       FROM crypto_fills WHERE user_id = $1`, [userId])).rows[0];
  const invested = num(f.bought), proceeds = num(f.proceeds) - num(f.swap_fees);
  if (invested <= 0) return;
  const debt = await portfolioDebtInfo(db as any, userId, CRYPTO_DOMAIN);
  const borrowed = debt.debt > 0 || debt.interestPaid > 0;
  const net = borrowed ? computeNetPerformance({ equity, cumulativeCashFlow: proceeds, invested, interestPaid: debt.interestPaid, borrowedInvested: Math.min(invested, Math.max(0, debt.debt - debt.reserve)) }) : null;
  await leaderboardRepository.upsertSnapshot(db, {
    userId, mode: CRYPTO_MODE, domain: CRYPTO_DOMAIN, year: new Date(atMs).getUTCFullYear(), period: periodOf(atMs),
    performancePct: net ? net.performancePct : computePerformancePct({ marketValue: equity, totalBought: invested, totalProceeds: proceeds }),
    capitalCommitted: invested, leverage: net ? net.leverage : null,
  });
};

export const rankingService = {
  async board(userId: string, periodRaw: unknown) {
    const r = (await query('SELECT * FROM crypto_accounts WHERE user_id = $1', [userId])).rows[0];
    if (!r) throw new CryptoDataError('NOT_FOUND', 'Compte Crypto non créé');
    const acc = toAccount(r);
    const raw = periodRaw === undefined || periodRaw === '' ? periodOf(acc.simulatedAt).slice(1) : String(periodRaw);
    const period = `M${raw}`;
    if (!/^M\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new CryptoDataError('INVALID_INPUT', 'Période invalide (AAAA-MM)');
    // Pas de regard vers le futur : on ne consulte pas un classement d'une période que le joueur n'a pas encore atteinte.
    if (period > periodOf(acc.simulatedAt)) throw new CryptoDataError('INVALID_INPUT', 'Cette période est dans ton futur simulé.');
    const board = await leaderboardRepository.getBoard({ mode: CRYPTO_MODE, domain: CRYPTO_DOMAIN, year: 0, period, minCapital: MIN_RANKED_CAPITAL, limit: LEADERBOARD_SIZE, callerId: userId });
    return { domain: CRYPTO_DOMAIN, mode: CRYPTO_MODE, period: period.slice(1), minCapital: MIN_RANKED_CAPITAL, ...board };
  },
};
