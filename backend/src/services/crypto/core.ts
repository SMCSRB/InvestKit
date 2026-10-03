import type { Queryable } from '../../repositories/investcoinsRepository';
import { investcoinsRepository } from '../../repositories/investcoinsRepository';
import { CRYPTO_DOMAIN, CRYPTO_ECONOMY as E } from '../../config/cryptoMarketRules';
import { Execution, Side } from '../../engine/crypto/execution';
import { emptyTaxState, readTaxState, saleTax } from '../../engine/trading/costs';
import { liquidityTierFor, CryptoDataError } from './dataService';
import { grantFirstInvestment } from '../firstStepsService';
import type { CryptoAccount } from './clockService';

// Noyau commun du trading Crypto : contexte de marché, exécution d'un achat/vente dans la transaction en cours, retrait de position.
export const DAY = 86_400_000;
export const num = (v: any): number => Number(v);

export interface Market { assetId: number; symbol: string; stable: boolean; price: number; priceAt: number; stale: boolean; tier: number; adv: number }

// Contexte de marché d'un actif À LA DATE SIMULÉE : dernier prix connu (clôture de la dernière bougie journalière terminée),
// volume quotidien moyen sur 30 jours (glissement) et palier de liquidité (volume moyen sur 90 jours).
export const marketFor = async (db: Queryable, symbol: string, nowMs: number): Promise<Market | null> => {
  const a = (await db.query('SELECT id, symbol, stable FROM crypto_assets WHERE symbol = $1', [symbol])).rows[0];
  if (!a) return null;
  const last = (await db.query(
    `SELECT ts, c FROM crypto_candles WHERE asset_id = $1 AND tf = '1d' AND ts <= to_timestamp(($2::float8 - 86400000) / 1000.0) ORDER BY ts DESC LIMIT 1`, [a.id, nowMs])).rows[0];
  if (!last) return null;
  const vol = (await db.query(
    `SELECT COALESCE(AVG(volume) FILTER (WHERE ts > to_timestamp(($2::float8 - 31 * 86400000.0) / 1000.0)), 0) AS v30,
            COALESCE(AVG(volume), 0) AS v90
       FROM crypto_candles WHERE asset_id = $1 AND tf = '1d' AND ts <= to_timestamp(($2::float8 - 86400000) / 1000.0) AND ts > to_timestamp(($2::float8 - 91 * 86400000.0) / 1000.0)`, [a.id, nowMs])).rows[0];
  const lastTs = new Date(last.ts).getTime();
  return {
    assetId: a.id, symbol: a.symbol, stable: a.stable, price: num(last.c), priceAt: lastTs + DAY, stale: nowMs - lastTs > E.staleDays * DAY,
    tier: liquidityTierFor(num(vol.v90), a.stable), adv: num(vol.v30),
  };
};

export const fmtQty = (q: string | number): string => { const t = String(q); return t.includes('.') ? t.replace(/0+$/, '').replace(/\.$/, '') : t; };

// Retrait atomique d'une quantité d'une position (refusé si elle n'est plus disponible) ; renvoie le prix de revient proportionnel de la part retirée.
export const takeFromPosition = async (db: Queryable, userId: string, assetId: number, qty: string): Promise<number> => {
  const r = await db.query(
    `WITH old AS (SELECT quantity, cost_basis_coins FROM crypto_positions WHERE user_id = $1 AND asset_id = $2 FOR UPDATE)
     UPDATE crypto_positions p SET quantity = p.quantity - $3::numeric,
            cost_basis_coins = CASE WHEN p.quantity - $3::numeric = 0 THEN 0 ELSE p.cost_basis_coins - ROUND(old.cost_basis_coins * $3::numeric / old.quantity) END,
            updated_at = NOW()
       FROM old WHERE p.user_id = $1 AND p.asset_id = $2 AND p.quantity >= $3::numeric
     RETURNING ROUND(old.cost_basis_coins * $3::numeric / old.quantity)::bigint AS basis_part`, [userId, assetId, qty]);
  if (!r.rows.length) throw new CryptoDataError('INVALID_INPUT', 'Quantité insuffisante');
  return num(r.rows[0].basis_part);
};

// Applique une exécution (achat ou vente) dans la transaction en cours : registre des pièces, position, ligne d'exécution.
export const applyFill = async (
  db: Queryable, userId: string, orderId: string, m: Market, side: Side, qty: string, ex: Execution, refPrice: number, maker: boolean, simAtMs: number, account: CryptoAccount
): Promise<{ fillId: number; taxCoins: number; gainCoins: number | null }> => {
  const meta = { domain: CRYPTO_DOMAIN, symbol: m.symbol, side, orderId };
  let taxCoins = 0;
  let basis: number | null = null;
  let gain: number | null = null;
  if (side === 'buy') {
    if (ex.notionalCoins > 0) await investcoinsRepository.applyTransaction(userId, -ex.notionalCoins, 'trade_buy', meta, db);
    if (ex.feeCoins > 0) await investcoinsRepository.applyTransaction(userId, -ex.feeCoins, 'fee_brokerage', meta, db);
    await db.query(
      `INSERT INTO crypto_positions (user_id, asset_id, quantity, cost_basis_coins) VALUES ($1,$2,$3::numeric,$4)
       ON CONFLICT (user_id, asset_id) DO UPDATE SET quantity = crypto_positions.quantity + EXCLUDED.quantity, cost_basis_coins = crypto_positions.cost_basis_coins + EXCLUDED.cost_basis_coins, updated_at = NOW()`,
      [userId, m.assetId, qty, ex.notionalCoins]);
    await grantFirstInvestment(userId, ex.notionalCoins, db);   // bonus unique « premier investissement » (dans la même transaction)
  } else {
    basis = await takeFromPosition(db, userId, m.assetId, qty);

    gain = ex.notionalCoins - basis;
    const year = new Date(simAtMs).getUTCFullYear();
    const ts = readTaxState(account.taxState);
    // Fiscalité : uniquement à la sortie vers l'euro (vente contre pièces). Barème repris du moteur Bourse/Crypto (valeurs à reconfirmer).
    const tax = saleTax({ account: 'crypto', year, proceeds: ex.notionalCoins, basis, taxState: ts });
    taxCoins = tax.total;
    if (ex.notionalCoins > 0) await investcoinsRepository.applyTransaction(userId, ex.notionalCoins, 'trade_sell', meta, db);
    if (ex.feeCoins > 0) await investcoinsRepository.applyTransaction(userId, -ex.feeCoins, 'fee_brokerage', meta, db);
    if (taxCoins > 0) await investcoinsRepository.applyTransaction(userId, -taxCoins, 'tax_capital_gains', { ...meta, year, note: tax.note }, db);
    ts.cryptoSales[String(year)] = (ts.cryptoSales[String(year)] ?? 0) + ex.notionalCoins;
    ts.feesPaid += ex.feeCoins; ts.taxPaid += taxCoins;
    account.taxState = ts;
    await db.query('UPDATE crypto_positions SET realized_gain_coins = realized_gain_coins + $3 WHERE user_id = $1 AND asset_id = $2', [userId, m.assetId, gain]);
  }
  if (side === 'buy') {
    const ts = readTaxState(account.taxState); ts.feesPaid += ex.feeCoins; account.taxState = ts;
  }
  await db.query('UPDATE crypto_accounts SET tax_state = $2::jsonb, updated_at = NOW() WHERE user_id = $1', [userId, JSON.stringify(account.taxState ?? emptyTaxState())]);
  const f = await db.query(
    `INSERT INTO crypto_fills (order_id, user_id, asset_id, side, quantity, ref_price, price, spread_pct, slippage_pct, liquidity_tier, maker, notional_coins, fee_coins, tax_coins, basis_coins, gain_coins, sim_at)
     VALUES ($1,$2,$3,$4,$5::numeric,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,to_timestamp($17::float8 / 1000.0)) RETURNING id`,
    [orderId, userId, m.assetId, side, qty, refPrice, ex.price, ex.spreadPct, ex.slippagePct, m.tier, maker, ex.notionalCoins, ex.feeCoins, taxCoins, basis, gain, simAtMs]);
  await db.query(`UPDATE crypto_orders SET status = 'filled', closed_sim_at = to_timestamp($2::float8 / 1000.0) WHERE id = $1`, [orderId, simAtMs]);
  return { fillId: Number(f.rows[0].id), taxCoins, gainCoins: gain };
};

export const availableQty = async (db: Queryable, userId: string, assetId: number): Promise<number> => {
  const r = (await db.query(
    `SELECT COALESCE((SELECT quantity FROM crypto_positions WHERE user_id = $1 AND asset_id = $2), 0)
          - COALESCE((SELECT SUM(quantity) FROM crypto_orders WHERE user_id = $1 AND asset_id = $2 AND status = 'open' AND side = 'sell'), 0) AS a`, [userId, assetId])).rows[0];
  return num(r.a);
};

export const toAccount = (r: any): CryptoAccount => ({ userId: r.user_id, startAt: new Date(r.start_at).getTime(), simulatedAt: new Date(r.simulated_at).getTime(), taxState: r.tax_state });
