import { getClient, query } from '../../utils/db';
import { investcoinsRepository, InsufficientFundsError, Queryable } from '../../repositories/investcoinsRepository';
import { userRepository } from '../../repositories/userRepository';
import { getBuyAccess } from '../../utils/entitlements';
import { auditLog } from '../auditService';
import { notify } from '../notificationService';
import { CRYPTO_DOMAIN, CRYPTO_ECONOMY as E } from '../../config/cryptoMarketRules';
import { BASE_MS } from '../../engine/crypto/candles';
import { executeAt, evaluateResting, floorQty8, parseQuantity, OrderType, Side, Execution } from '../../engine/crypto/execution';
import { emptyTaxState, readTaxState, saleTax } from '../../engine/trading/costs';
import { liquidityTierFor, CryptoDataError } from './dataService';
import { clockService, CryptoAccount } from './clockService';

const DAY = 86_400_000;
const CLIENT_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const ORDER_TYPES: OrderType[] = ['market', 'limit', 'stop_loss', 'take_profit'];
const num = (v: any): number => Number(v);

export interface OrderInput { symbol: unknown; side: unknown; type: unknown; quantity?: unknown; amountCoins?: unknown; price?: unknown; clientOrderId: unknown }
interface Market { assetId: number; symbol: string; stable: boolean; price: number; priceAt: number; stale: boolean; tier: number; adv: number }

const bad = (m: string) => new CryptoDataError('INVALID_INPUT', m);

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

const fmtQty = (q: string | number): string => { const t = String(q); return t.includes('.') ? t.replace(/0+$/, '').replace(/\.$/, '') : t; };

// Applique une exécution (achat ou vente) dans la transaction en cours : registre des pièces, position, ligne d'exécution.
const applyFill = async (
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
  } else {
    // Retrait atomique de la quantité (refusé si elle n'est plus disponible) et prix de revient proportionnel.
    const r = await db.query(
      `WITH old AS (SELECT quantity, cost_basis_coins FROM crypto_positions WHERE user_id = $1 AND asset_id = $2 FOR UPDATE)
       UPDATE crypto_positions p SET quantity = p.quantity - $3::numeric,
              cost_basis_coins = CASE WHEN p.quantity - $3::numeric = 0 THEN 0 ELSE p.cost_basis_coins - ROUND(old.cost_basis_coins * $3::numeric / old.quantity) END,
              updated_at = NOW()
         FROM old WHERE p.user_id = $1 AND p.asset_id = $2 AND p.quantity >= $3::numeric
       RETURNING ROUND(old.cost_basis_coins * $3::numeric / old.quantity)::bigint AS basis_part`, [userId, m.assetId, qty]);
    if (!r.rows.length) throw new CryptoDataError('INVALID_INPUT', 'Quantité insuffisante');
    basis = num(r.rows[0].basis_part);
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

const availableQty = async (db: Queryable, userId: string, assetId: number): Promise<number> => {
  const r = (await db.query(
    `SELECT COALESCE((SELECT quantity FROM crypto_positions WHERE user_id = $1 AND asset_id = $2), 0)
          - COALESCE((SELECT SUM(quantity) FROM crypto_orders WHERE user_id = $1 AND asset_id = $2 AND status = 'open' AND side = 'sell'), 0) AS a`, [userId, assetId])).rows[0];
  return num(r.a);
};

// Chiffre un ordre AU MARCHÉ sans l'exécuter (aperçu des coûts affiché avant de valider).
const planMarket = (m: Market, side: Side, qty: number): Execution => executeAt({ side, refPrice: m.price, quantity: qty, tier: m.tier, avgDailyVolumeUsd: m.adv, maker: false });

const quantityForBudget = (m: Market, budget: number): string => {
  let q = Number(floorQty8((budget * E.usdPerCoin) / m.price));   // départ : budget entier sans frais ; on réduit jusqu'à ce que prix + frais tiennent dans le budget
  for (let i = 0; i < 40 && q > 0; i++) {
    const ex = planMarket(m, 'buy', q);
    const total = ex.notionalCoins + ex.feeCoins;
    if (total <= budget) break;
    q = Number(floorQty8(q * (budget / total) * 0.9999));
  }
  return floorQty8(q);
};

export const cryptoTradingService = {
  // ── Aperçu : coûts d'un ordre au marché à la date simulée du joueur.
  async quote(userId: string, symbol: string, sideRaw: unknown, quantityRaw: unknown, amountRaw: unknown) {
    const acc = await requireAccount(userId);
    const side = sideOf(sideRaw);
    const m = await marketFor({ query }, symbol, acc.simulatedAt);
    if (!m) throw new CryptoDataError('NOT_FOUND', 'Actif introuvable ou pas encore coté à cette date');
    let qty = parseQuantity(quantityRaw);
    if (qty === null && side === 'buy' && amountRaw !== undefined) { const a = Number(amountRaw); if (!Number.isInteger(a) || a < 1) throw bad('Montant invalide'); qty = quantityForBudget(m, a); }
    if (qty === null || Number(qty) <= 0) throw bad('Quantité invalide (8 décimales maximum)');
    const ex = planMarket(m, side, Number(qty));
    return { symbol, side, quantity: qty, refPrice: m.price, tier: m.tier, stale: m.stale, execution: { price: ex.price, spreadPct: ex.spreadPct, slippagePct: ex.slippagePct, notionalCoins: ex.notionalCoins, feeCoins: ex.feeCoins, totalCoins: side === 'buy' ? ex.notionalCoins + ex.feeCoins : ex.notionalCoins - ex.feeCoins },
      note: 'Estimation : le prix réel est celui de la date simulée ; l\'écart achat/vente et le glissement dépendent de la liquidité de l\'actif.' };
  },

  async placeOrder(userId: string, input: OrderInput, ip?: string | null) {
    const symbol = typeof input.symbol === 'string' ? input.symbol.toUpperCase() : '';
    if (!/^[A-Z0-9]{2,20}$/.test(symbol)) throw bad('Symbole invalide');
    const side = sideOf(input.side);
    if (!ORDER_TYPES.includes(input.type as OrderType)) throw bad('Type d\'ordre invalide (market, limit, stop_loss, take_profit)');
    const type = input.type as OrderType;
    if (typeof input.clientOrderId !== 'string' || !CLIENT_ID_RE.test(input.clientOrderId)) throw bad('Identifiant d\'ordre invalide (8 à 64 caractères : lettres, chiffres, - et _)');
    if ((type === 'stop_loss' || type === 'take_profit') && side !== 'sell') throw bad('Un stop-loss ou un take-profit ne concerne qu\'une vente');
    let trigger: number | null = null;
    if (type !== 'market') {
      trigger = Number(input.price);
      if (!Number.isFinite(trigger) || trigger <= 0 || trigger > 1e12) throw bad('Prix invalide');
    } else if (input.price !== undefined && input.price !== null) throw bad('Un ordre au marché n\'a pas de prix : il est décidé par le serveur');
    if (input.amountCoins !== undefined && !(type === 'market' && side === 'buy')) throw bad('Le montant en pièces ne s\'utilise que pour un achat au marché');

    const user = await userRepository.findById(userId);
    if (!user) throw new CryptoDataError('NOT_FOUND', 'Utilisateur introuvable');
    if (side === 'buy') {
      const access = getBuyAccess(user, CRYPTO_DOMAIN);
      if (!access.allowed) throw new CryptoDataError('INVALID_INPUT', access.reason === 'FREE_DOMAIN_NOT_CHOSEN' ? 'Choisis ton domaine gratuit (ou passe Pro) pour acheter.' : 'Domaine Crypto verrouillé : passe Pro pour y acheter.');
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');
      const accRow = (await client.query('SELECT * FROM crypto_accounts WHERE user_id = $1 FOR UPDATE', [userId])).rows[0];
      if (!accRow) throw new CryptoDataError('NOT_FOUND', 'Compte Crypto non créé : choisis d\'abord ta date de départ.');
      const account = toAccount(accRow);

      // Idempotence : un même identifiant renvoie l'ordre déjà enregistré, sans rien exécuter deux fois.
      const existing = (await client.query('SELECT * FROM crypto_orders WHERE user_id = $1 AND client_order_id = $2', [userId, input.clientOrderId])).rows[0];
      if (existing) { await client.query('COMMIT'); return { idempotent: true, order: await orderView(existing.id, userId) }; }

      const m = await marketFor(client, symbol, account.simulatedAt);
      if (!m) throw new CryptoDataError('NOT_FOUND', 'Actif introuvable ou pas encore coté à cette date');
      if (side === 'buy' && m.stale) throw bad('Cet actif n\'est plus coté : les achats sont fermés (la vente reste possible au dernier prix connu).');

      let qty = parseQuantity(input.quantity);
      if (type === 'market' && side === 'buy' && input.amountCoins !== undefined) {
        const a = Number(input.amountCoins);
        if (!Number.isInteger(a) || a < 1 || a > 1e9) throw bad('Montant invalide');
        if (input.quantity !== undefined) throw bad('Indique soit la quantité, soit le montant');
        if (m.price <= 0) throw bad('Prix nul : achat impossible');
        qty = quantityForBudget(m, a);
      }
      if (qty === null) throw bad('Quantité invalide (8 décimales maximum, strictement positive)');
      if (Number(qty) <= 0) throw bad('Montant trop faible pour acheter la moindre quantité');
      if (side === 'buy' && m.price <= 0) throw bad('Prix nul : achat impossible');

      let avail = 0;
      if (side === 'sell') {
        avail = await availableQty(client, userId, m.assetId);
        if (Number(qty) > avail + 1e-9) throw new CryptoDataError('INVALID_INPUT', 'Quantité disponible insuffisante (une partie est peut-être déjà engagée dans un autre ordre en attente).');
      }
      if (type === 'stop_loss' && trigger! >= m.price) throw bad('Un stop-loss doit être placé sous le prix actuel.');
      if (type === 'take_profit' && trigger! <= m.price) throw bad('Un take-profit doit être placé au-dessus du prix actuel.');
      if (type !== 'market') {
        const open = Number((await client.query(`SELECT COUNT(*)::int AS n FROM crypto_orders WHERE user_id = $1 AND status = 'open'`, [userId])).rows[0].n);
        if (open >= E.maxOpenOrders) throw bad(`Trop d'ordres en attente (${E.maxOpenOrders} maximum).`);
      }

      const ins = (await client.query(
        `INSERT INTO crypto_orders (user_id, client_order_id, asset_id, side, type, quantity, trigger_price, status, created_sim_at)
         VALUES ($1,$2,$3,$4,$5,$6::numeric,$7,'open',to_timestamp($8::float8 / 1000.0)) RETURNING id`,
        [userId, input.clientOrderId, m.assetId, side, type, qty, trigger, account.simulatedAt])).rows[0];

      if (type === 'market') {
        const ex = planMarket(m, side, Number(qty));
        const isFullExit = side === 'sell' && Math.abs(Number(qty) - avail) < 1e-9;
        if (ex.notionalCoins < E.minNotionalCoins && !isFullExit) throw bad(`Ordre trop petit : minimum ${E.minNotionalCoins} 🪙 (la sortie complète d'une position reste permise).`);
        try {
          await applyFill(client, userId, ins.id, m, side, qty, ex, m.price, false, account.simulatedAt, account);
        } catch (e) {
          if (e instanceof InsufficientFundsError) throw bad('Solde InvestCoins insuffisant pour cet achat (prix + frais).');
          throw e;
        }
      }
      await auditLog({ userId, action: 'crypto.order.create', entityType: 'crypto_order', entityId: ins.id, ip, metadata: { symbol, side, type, quantity: qty, price: trigger, simAt: new Date(account.simulatedAt).toISOString() } }, client);
      await client.query('COMMIT');
      return { idempotent: false, order: await orderView(ins.id, userId) };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async cancelOrder(userId: string, orderId: string, ip?: string | null) {
    if (!/^[0-9a-f-]{36}$/i.test(orderId)) throw bad('Identifiant invalide');
    const r = await query(
      `UPDATE crypto_orders SET status = 'cancelled', closed_sim_at = (SELECT simulated_at FROM crypto_accounts WHERE user_id = $1)
        WHERE id = $2 AND user_id = $1 AND status = 'open' RETURNING id`, [userId, orderId]);
    if (!r.rows.length) throw new CryptoDataError('NOT_FOUND', 'Ordre introuvable ou déjà clos');
    await auditLog({ userId, action: 'crypto.order.cancel', entityType: 'crypto_order', entityId: orderId, ip });
    return orderView(orderId, userId);
  },

  async listOrders(userId: string, status?: unknown, limit = 100) {
    const st = typeof status === 'string' && ['open', 'filled', 'cancelled'].includes(status) ? status : null;
    const rows = (await query(
      `SELECT o.id FROM crypto_orders o WHERE o.user_id = $1 ${st ? 'AND o.status = $3' : ''} ORDER BY o.created_at DESC, o.id LIMIT $2`, st ? [userId, limit, st] : [userId, limit])).rows;
    return Promise.all(rows.map((r: any) => orderView(r.id, userId)));
  },

  // ── Portefeuille : positions, prix de revient moyen, plus-values latentes et réalisées, répartition.
  async portfolio(userId: string) {
    const acc = await requireAccount(userId);
    const pos = (await query(
      `SELECT p.asset_id, a.symbol, a.name, p.quantity::text AS quantity, p.cost_basis_coins, p.realized_gain_coins FROM crypto_positions p JOIN crypto_assets a ON a.id = p.asset_id
        WHERE p.user_id = $1 AND (p.quantity > 0 OR p.realized_gain_coins <> 0) ORDER BY a.symbol`, [userId])).rows;
    const positions = [];
    let invested = 0, value = 0, realized = 0;
    for (const p of pos) {
      realized += num(p.realized_gain_coins);
      if (num(p.quantity) <= 0) continue;
      const m = await marketFor({ query }, p.symbol, acc.simulatedAt);
      const price = m?.price ?? 0;
      const v = Math.floor((price * num(p.quantity)) / E.usdPerCoin);
      const basis = Math.round(num(p.cost_basis_coins));
      invested += basis; value += v;
      positions.push({ symbol: p.symbol, name: p.name, quantity: fmtQty(p.quantity), avgCost: num(p.quantity) > 0 ? (basis * E.usdPerCoin) / num(p.quantity) : 0, price, stale: m?.stale ?? true,
        valueCoins: v, costBasisCoins: basis, unrealizedCoins: v - basis, unrealizedPct: basis > 0 ? Math.round(((v / basis) - 1) * 10000) / 100 : null, realizedCoins: num(p.realized_gain_coins) });
    }
    const balance = await investcoinsRepository.getBalance(userId);
    const ts = readTaxState(acc.taxState);
    const fills = (await query(`SELECT COALESCE(SUM(fee_coins),0)::bigint AS f, COALESCE(SUM(tax_coins),0)::bigint AS t FROM crypto_fills WHERE user_id = $1`, [userId])).rows[0];
    return {
      simulatedAt: acc.simulatedAt, balanceCoins: balance, holdingsValueCoins: value, wealthCoins: balance + value, investedCoins: invested,
      unrealizedCoins: value - invested, realizedCoins: realized, feesPaidCoins: num(fills.f), taxPaidCoins: num(fills.t),
      cryptoSalesThisYear: ts.cryptoSales[String(new Date(acc.simulatedAt).getUTCFullYear())] ?? 0,
      positions: positions.map((p) => ({ ...p, allocationPct: value > 0 ? Math.round((p.valueCoins / value) * 10000) / 100 : 0 })),
      openOrders: await cryptoTradingService.listOrders(userId, 'open', 50),
      economy: { usdPerCoin: E.usdPerCoin, minNotionalCoins: E.minNotionalCoins, note: 'Valeurs de jeu non sourcées, à reconfirmer.' },
    };
  },

  // ── Avance du temps : exécute les ordres en attente sur les bougies de la période, puis déplace l'horloge, le tout dans UNE transaction.
  async advance(userId: string, step: unknown) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const row = (await client.query('SELECT * FROM crypto_accounts WHERE user_id = $1 FOR UPDATE', [userId])).rows[0];
      if (!row) throw new CryptoDataError('NOT_FOUND', 'Compte Crypto non créé');
      const account = toAccount(row);
      const target = await clockService.nextDate(account, step);
      const events = await processResting(client, account, account.simulatedAt, target);
      await client.query('UPDATE crypto_accounts SET simulated_at = to_timestamp($2::float8 / 1000.0), updated_at = NOW() WHERE user_id = $1', [userId, target]);
      await client.query('COMMIT');
      return { from: account.simulatedAt, simulatedAt: target, events };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },
};

const toAccount = (r: any): CryptoAccount => ({ userId: r.user_id, startAt: new Date(r.start_at).getTime(), simulatedAt: new Date(r.simulated_at).getTime(), taxState: r.tax_state });

const requireAccount = async (userId: string): Promise<CryptoAccount> => {
  const acc = await clockService.get(userId);
  if (!acc) throw new CryptoDataError('NOT_FOUND', 'Compte Crypto non créé : choisis d\'abord ta date de départ.');
  return acc;
};

const sideOf = (v: unknown): Side => {
  if (v !== 'buy' && v !== 'sell') throw bad('Sens invalide (buy ou sell)');
  return v;
};

export const orderView = async (id: string, userId: string) => {
  const o = (await query(
    `SELECT o.id, o.client_order_id, a.symbol, o.side, o.type, o.quantity::text AS quantity, o.trigger_price, o.status, o.reject_reason, o.created_sim_at, o.closed_sim_at FROM crypto_orders o JOIN crypto_assets a ON a.id = o.asset_id WHERE o.id = $1 AND o.user_id = $2`, [id, userId])).rows[0];
  if (!o) return null;
  const f = (await query(`SELECT quantity::text AS quantity, ref_price, price, spread_pct, slippage_pct, liquidity_tier, maker, notional_coins, fee_coins, tax_coins, basis_coins, gain_coins, sim_at FROM crypto_fills WHERE order_id = $1 ORDER BY id LIMIT 1`, [id])).rows[0];
  return {
    id: o.id, clientOrderId: o.client_order_id, symbol: o.symbol, side: o.side, type: o.type, quantity: fmtQty(o.quantity), price: o.trigger_price, status: o.status, rejectReason: o.reject_reason,
    createdSimAt: new Date(o.created_sim_at).getTime(), closedSimAt: o.closed_sim_at ? new Date(o.closed_sim_at).getTime() : null,
    fill: f ? { quantity: fmtQty(f.quantity), refPrice: f.ref_price, price: f.price, spreadPct: f.spread_pct, slippagePct: f.slippage_pct, liquidityTier: f.liquidity_tier, maker: f.maker, notionalCoins: f.notional_coins, feeCoins: f.fee_coins, taxCoins: f.tax_coins, basisCoins: f.basis_coins, gainCoins: f.gain_coins, simAt: new Date(f.sim_at).getTime() } : null,
  };
};

// Exécution des ordres en attente sur (fromMs, toMs] : bougies horaires si disponibles, sinon journalières, strictement postérieures à la création de l'ordre
// et TERMINÉES à toMs. Les exécutions sont appliquées dans l'ordre chronologique. Un ordre qui ne peut pas être honoré (solde, quantité) est annulé avec un motif.
const processResting = async (db: Queryable, account: CryptoAccount, fromMs: number, toMs: number) => {
  const orders = (await db.query(
    `SELECT o.id, o.asset_id, a.symbol, o.side, o.type, o.quantity::text AS quantity, o.trigger_price, o.created_sim_at FROM crypto_orders o JOIN crypto_assets a ON a.id = o.asset_id
      WHERE o.user_id = $1 AND o.status = 'open' ORDER BY o.created_at FOR UPDATE OF o`, [account.userId])).rows;
  const cands: { order: any; ts: number; refPrice: number; maker: boolean; end: number }[] = [];
  for (const o of orders) {
    const startMs = Math.max(fromMs, new Date(o.created_sim_at).getTime());
    let tf: '1h' | '1d' = '1h';
    const query1 = (t: string) => db.query(
      `SELECT ts, o, h, l, c, volume FROM crypto_candles WHERE asset_id = $1 AND tf = $4 AND ts >= to_timestamp($2::float8 / 1000.0) AND ts <= to_timestamp(($3::float8 - ${BASE_MS[t as '1h' | '1d']}) / 1000.0) ORDER BY ts`,
      [o.asset_id, startMs, toMs, t]);
    let rows = (await query1('1h')).rows;
    if (!rows.length) { tf = '1d'; rows = (await query1('1d')).rows; }
    const candles = rows.map((r: any) => ({ ts: new Date(r.ts).getTime(), o: num(r.o), h: num(r.h), l: num(r.l), c: num(r.c), volume: num(r.volume) }));
    const hit = evaluateResting({ side: o.side, type: o.type, triggerPrice: num(o.trigger_price) }, candles);
    if (hit) cands.push({ order: o, ts: hit.ts, refPrice: hit.refPrice, maker: hit.maker, end: hit.ts + BASE_MS[tf] });
  }
  cands.sort((a, b) => a.end - b.end);
  const events: { orderId: string; symbol: string; status: 'filled' | 'cancelled'; note?: string }[] = [];
  for (const c of cands) {
    const o = c.order;
    const m = await marketFor(db, o.symbol, c.end);
    if (!m) continue;
    const ex = executeAt({ side: o.side, refPrice: c.refPrice, quantity: Number(o.quantity), tier: m.tier, avgDailyVolumeUsd: m.adv, maker: c.maker });
    await db.query('SAVEPOINT fill');
    try {
      const res = await applyFill(db, account.userId, o.id, m, o.side, o.quantity, ex, c.refPrice, c.maker, c.end, account);
      await db.query('RELEASE SAVEPOINT fill');
      events.push({ orderId: o.id, symbol: o.symbol, status: 'filled' });
      const verb = o.side === 'buy' ? 'Achat' : 'Vente';
      await notify(db, account.userId, { kind: 'crypto_order_filled', title: `${verb} exécuté : ${o.symbol}`, body: `Ton ordre ${o.type} (${o.quantity} ${o.symbol}) a été exécuté à ${ex.price.toPrecision(6)} $. Frais : ${ex.feeCoins} 🪙${res.taxCoins ? `, impôt : ${res.taxCoins} 🪙` : ''}.`, link: '/crypto' });
    } catch (e) {
      await db.query('ROLLBACK TO SAVEPOINT fill');
      const reason = e instanceof InsufficientFundsError ? 'Solde insuffisant au moment de l\'exécution' : 'Quantité plus disponible au moment de l\'exécution';
      await db.query(`UPDATE crypto_orders SET status = 'cancelled', reject_reason = $2, closed_sim_at = to_timestamp($3::float8 / 1000.0) WHERE id = $1`, [o.id, reason, c.end]);
      events.push({ orderId: o.id, symbol: o.symbol, status: 'cancelled', note: reason });
      await notify(db, account.userId, { kind: 'crypto_order_cancelled', title: `Ordre annulé : ${o.symbol}`, body: `${reason}. Aucun montant n'a été débité.`, link: '/crypto' });
    }
  }
  return events;
};
