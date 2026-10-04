import { getClient, query } from '../../utils/db';
import { investcoinsRepository, InsufficientFundsError, Queryable } from '../../repositories/investcoinsRepository';
import { userRepository } from '../../repositories/userRepository';
import { getBuyAccess } from '../../utils/entitlements';
import { auditLog } from '../auditService';
import { notify } from '../notificationService';
import { CRYPTO_DOMAIN, CRYPTO_ECONOMY as E } from '../../config/cryptoMarketRules';
import { BASE_MS } from '../../engine/crypto/candles';
import { executeAt, evaluateResting, feeCoins, floorQty8, parseQuantity, OrderType, Side, Execution } from '../../engine/crypto/execution';
import { readTaxState } from '../../engine/trading/costs';
import { CryptoDataError } from './dataService';
import { num, Market, marketFor, fmtQty, takeFromPosition, applyFill, availableQty, toAccount, fxOf, priceCoinsOf } from './core';
import { fxService } from '../fxService';
import { clockService, CryptoAccount, dataEnd } from './clockService';
import { activeEffects, processEvents } from './eventsService';
import { collateralRelease, repayFromSale, processLoan } from './loanService';
import { snapshotLeaderboard } from './rankingService';
import { spendableCoins } from '../bankService';

const CLIENT_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const ORDER_TYPES: OrderType[] = ['market', 'limit', 'stop_loss', 'take_profit'];

export interface OrderInput { symbol: unknown; side: unknown; type: unknown; quantity?: unknown; amountCoins?: unknown; price?: unknown; clientOrderId: unknown }

const bad = (m: string) => new CryptoDataError('INVALID_INPUT', m);




// Chiffre un ordre AU MARCHÉ sans l'exécuter (aperçu des coûts affiché avant de valider).
const planMarket = (m: Market, side: Side, qty: number, stress = 1): Execution => executeAt({ side, refPrice: m.price, quantity: qty, tier: m.tier, avgDailyVolumeUsd: m.adv, maker: false, stressMultiplier: stress, usdPerCoin: fxOf(m) });

// Plus grande quantité (8 décimales) dont le total (montant arrondi + frais) tient dans le budget. Recherche dichotomique exacte : le total ne baisse jamais
// quand la quantité monte, donc la plus grande quantité valable est unique. (L'ancienne réduction par paliers s'arrêtait à la première quantité valable,
// souvent un peu trop basse : jusqu'à une pièce de budget restait inutilisée.)
const quantityForBudget = (m: Market, budget: number, stress = 1): string => {
  const total = (units: number): number => { const ex = planMarket(m, 'buy', units / 1e8, stress); return ex.notionalCoins + ex.feeCoins; };
  let lo = 0;                                                         // quantité valable (0 = rien)
  let hi = Math.floor(((budget * fxOf(m)) / m.price) * 1e8) + 1;      // borne haute : budget entier sans frais ni écart (toujours trop chère d'une unité)
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (total(mid) <= budget) lo = mid; else hi = mid;
  }
  return floorQty8(lo / 1e8);
};

// Pièces dont le joueur dispose dans la Crypto : son solde moins les pièces EMPRUNTÉES encore réservées à un autre domaine (prêt Immobilier, etc.).
const fundsOf = async (db: Queryable, userId: string) => {
  const balance = await investcoinsRepository.getBalance(userId, db);
  const spendable = await spendableCoins(db as any, userId, CRYPTO_DOMAIN);
  return { balance, spendable, reservedElsewhere: Math.max(0, balance - spendable) };
};
const insufficientMessage = (needed: number, f: { balance: number; spendable: number; reservedElsewhere: number }): string =>
  f.balance >= needed && f.spendable < needed
    ? `Tu as ${f.balance} InvestCoins, mais ${f.reservedElsewhere} sont des pièces empruntées réservées à un autre domaine (elles ne se dépensent que là où le prêt a été pris). ` +
      `Tu peux en dépenser ${f.spendable} ici ; il en faut ${needed} (prix + frais).`
    : `Solde InvestCoins insuffisant : il faut ${needed} (prix + frais), tu as ${f.spendable} à dépenser ici.`;

export const cryptoTradingService = {
  // ── Aperçu : coûts d'un ordre au marché à la date simulée du joueur.
  async quote(userId: string, symbol: string, sideRaw: unknown, quantityRaw: unknown, amountRaw: unknown) {
    const acc = await requireAccount(userId);
    const side = sideOf(sideRaw);
    const m = await marketFor({ query }, symbol, acc.simulatedAt);
    if (!m) throw new CryptoDataError('NOT_FOUND', 'Actif introuvable ou pas encore coté à cette date');
    const stress = activeEffects(userId, acc.simulatedAt, acc.startAt).stress;
    let qty = parseQuantity(quantityRaw);
    if (qty === null && side === 'buy' && amountRaw !== undefined) { const a = Number(amountRaw); if (!Number.isInteger(a) || a < 1) throw bad('Montant invalide'); qty = quantityForBudget(m, a, stress); }
    if (qty === null || Number(qty) <= 0) throw bad('Quantité invalide (8 décimales maximum)');
    const ex = planMarket(m, side, Number(qty), stress);
    const funds = await fundsOf({ query }, userId);
    const totalNeeded = ex.notionalCoins + ex.feeCoins;
    return { symbol, side, quantity: qty, funds: { balanceCoins: funds.balance, spendableCoins: funds.spendable, reservedElsewhereCoins: funds.reservedElsewhere },
      affordable: side === 'sell' ? true : funds.spendable >= totalNeeded, affordableMessage: side === 'buy' && funds.spendable < totalNeeded ? insufficientMessage(totalNeeded, funds) : null, refPrice: m.price, refPriceCoins: priceCoinsOf(m), fxUsdPerCoin: fxOf(m), tier: m.tier, stale: m.stale, execution: { price: ex.price, priceCoins: ex.price / fxOf(m), rawNotionalCoins: ex.rawNotionalCoins, roundingCoins: Math.round((ex.notionalCoins - ex.rawNotionalCoins) * 1e8) / 1e8, spreadPct: ex.spreadPct, slippagePct: ex.slippagePct, notionalCoins: ex.notionalCoins, feeCoins: ex.feeCoins, totalCoins: side === 'buy' ? ex.notionalCoins + ex.feeCoins : ex.notionalCoins - ex.feeCoins },
      note: 'Estimation : le prix de référence est celui de la date simulée ; l\'écart achat/vente et le glissement dépendent de la liquidité de l\'actif.' };
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
      if (!Number.isFinite(trigger) || trigger <= 0 || trigger > 1e12) throw bad('Prix invalide (en InvestCoins par unité)');
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
      const eff = activeEffects(userId, account.simulatedAt, account.startAt);
      if (type === 'market' && eff.outage) throw bad('Plateforme indisponible aujourd\'hui (incident simulé) : pas d\'ordre au marché. Place un ordre en attente ou avance dans le temps.');
      fxOf(m);   // sans taux de change du jour de jeu : aucun ordre (message clair), rien n'est écrit
      if (side === 'buy' && m.stale) throw bad('Cet actif n\'est plus coté : les achats sont fermés (la vente reste possible au dernier prix connu).');

      let qty = parseQuantity(input.quantity);
      if (type === 'market' && side === 'buy' && input.amountCoins !== undefined) {
        const a = Number(input.amountCoins);
        if (!Number.isInteger(a) || a < 1 || a > 1e9) throw bad('Montant invalide');
        if (input.quantity !== undefined) throw bad('Indique soit la quantité, soit le montant');
        if (m.price <= 0) throw bad('Prix nul : achat impossible');
        qty = quantityForBudget(m, a, eff.stress);
      }
      if (qty === null) throw bad('Quantité invalide (8 décimales maximum, strictement positive)');
      if (Number(qty) <= 0) throw bad('Montant trop faible pour acheter la moindre quantité');
      if (side === 'buy' && m.price <= 0) throw bad('Prix nul : achat impossible');

      let avail = 0;
      if (side === 'sell') {
        avail = await availableQty(client, userId, m.assetId);
        if (Number(qty) > avail + 1e-9) throw new CryptoDataError('INVALID_INPUT', 'Quantité disponible insuffisante (une partie est peut-être déjà engagée dans un autre ordre en attente).');
      }
      // Le prix d'un ordre en attente est en InvestCoins par unité (1 InvestCoin = 1 €), comparé au prix actuel converti avec le taux du jour.
      if (type === 'stop_loss' && trigger! >= priceCoinsOf(m)) throw bad('Un stop-loss doit être placé sous le prix actuel.');
      if (type === 'take_profit' && trigger! <= priceCoinsOf(m)) throw bad('Un take-profit doit être placé au-dessus du prix actuel.');
      if (type !== 'market') {
        const open = Number((await client.query(`SELECT COUNT(*)::int AS n FROM crypto_orders WHERE user_id = $1 AND status = 'open'`, [userId])).rows[0].n);
        if (open >= E.maxOpenOrders) throw bad(`Trop d'ordres en attente (${E.maxOpenOrders} maximum).`);
      }

      const ins = (await client.query(
        `INSERT INTO crypto_orders (user_id, client_order_id, asset_id, side, type, quantity, trigger_price, status, created_sim_at)
         VALUES ($1,$2,$3,$4,$5,$6::numeric,$7,'open',to_timestamp($8::float8 / 1000.0)) RETURNING id`,
        [userId, input.clientOrderId, m.assetId, side, type, qty, trigger, account.simulatedAt])).rows[0];

      if (type === 'market') {
        const ex = planMarket(m, side, Number(qty), eff.stress);
        const isFullExit = side === 'sell' && Math.abs(Number(qty) - avail) < 1e-9;
        if (ex.notionalCoins < E.minNotionalCoins && !isFullExit) throw bad(`Ordre trop petit : minimum ${E.minNotionalCoins} InvestCoins (la sortie complète d'une position reste permise).`);
        try {
          const release = side === 'sell' ? await collateralRelease(client, userId, account.simulatedAt, symbol, qty, ex.notionalCoins - ex.feeCoins) : 0;
          await applyFill(client, userId, ins.id, m, side, qty, ex, m.price, false, account.simulatedAt, account, fxOf(m));
          await repayFromSale(client, userId, release);
          await snapshotLeaderboard(client, account);
        } catch (e) {
          if (e instanceof InsufficientFundsError) throw bad(insufficientMessage(ex.notionalCoins + ex.feeCoins, await fundsOf(client, userId)));
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

  // ── Échange crypto contre crypto : AUCUN impôt (pas de sortie vers l'euro), le prix de revient passe à l'actif reçu ; seuls les frais sont payés (détruits).
  async swap(userId: string, input: { from: unknown; to: unknown; quantity: unknown; clientOrderId: unknown }, ip?: string | null) {
    const from = typeof input.from === 'string' ? input.from.toUpperCase() : '', to = typeof input.to === 'string' ? input.to.toUpperCase() : '';
    if (!/^[A-Z0-9]{2,20}$/.test(from) || !/^[A-Z0-9]{2,20}$/.test(to)) throw bad('Symbole invalide');
    if (from === to) throw bad('Choisis deux actifs différents');
    if (typeof input.clientOrderId !== 'string' || !CLIENT_ID_RE.test(input.clientOrderId)) throw bad('Identifiant d\'ordre invalide (8 à 64 caractères : lettres, chiffres, - et _)');
    const qty = parseQuantity(input.quantity);
    if (qty === null) throw bad('Quantité invalide (8 décimales maximum, strictement positive)');
    const user = await userRepository.findById(userId);
    if (!user) throw new CryptoDataError('NOT_FOUND', 'Utilisateur introuvable');
    const access = getBuyAccess(user, CRYPTO_DOMAIN);
    if (!access.allowed) throw new CryptoDataError('INVALID_INPUT', 'Domaine Crypto verrouillé : passe Pro pour y échanger.');
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const accRow = (await client.query('SELECT * FROM crypto_accounts WHERE user_id = $1 FOR UPDATE', [userId])).rows[0];
      if (!accRow) throw new CryptoDataError('NOT_FOUND', 'Compte Crypto non créé : choisis d\'abord ta date de départ.');
      const account = toAccount(accRow);
      const existing = (await client.query('SELECT id FROM crypto_orders WHERE user_id = $1 AND client_order_id = $2', [userId, input.clientOrderId])).rows[0];
      if (existing) { await client.query('COMMIT'); return { idempotent: true, order: await orderView(existing.id, userId) }; }
      const eff = activeEffects(userId, account.simulatedAt, account.startAt);
      if (eff.outage) throw bad('Plateforme indisponible aujourd\'hui (incident simulé) : pas d\'échange. Avance dans le temps.');
      const mf = await marketFor(client, from, account.simulatedAt), mt = await marketFor(client, to, account.simulatedAt);
      if (!mf || !mt) throw new CryptoDataError('NOT_FOUND', 'Actif introuvable ou pas encore coté à cette date');
      fxOf(mf);
      if (mt.stale || mt.price <= 0) throw bad('L\'actif reçu n\'est pas échangeable (plus coté ou prix nul).');
      const avail = await availableQty(client, userId, mf.assetId);
      if (Number(qty) > avail + 1e-9) throw bad('Quantité disponible insuffisante.');
      const sell = planMarket(mf, 'sell', Number(qty), eff.stress);
      const tier = Math.max(mf.tier, mt.tier);
      const fee = feeCoins(sell.notionalCoins, tier, false);
      const net = sell.notionalCoins - fee;
      if (sell.notionalCoins < E.minNotionalCoins) throw bad(`Échange trop petit : minimum ${E.minNotionalCoins} InvestCoins.`);
      let q = Number(floorQty8((net * fxOf(mt)) / mt.price));
      let buy = planMarket(mt, 'buy', q, eff.stress);
      for (let i = 0; i < 40 && q > 0 && buy.notionalCoins > net; i++) { q = Number(floorQty8(q * (net / buy.notionalCoins) * 0.9999)); buy = planMarket(mt, 'buy', q, eff.stress); }
      if (q <= 0) throw bad('Montant trop faible pour recevoir la moindre quantité.');
      const qtyTo = floorQty8(q);
      const ord = (await client.query(
        `INSERT INTO crypto_orders (user_id, client_order_id, asset_id, to_asset_id, side, type, quantity, status, created_sim_at, closed_sim_at)
         VALUES ($1,$2,$3,$4,'sell','swap',$5::numeric,'filled',to_timestamp($6::float8 / 1000.0),to_timestamp($6::float8 / 1000.0)) RETURNING id`,
        [userId, input.clientOrderId, mf.assetId, mt.assetId, qty, account.simulatedAt])).rows[0];
      const basis = await takeFromPosition(client, userId, mf.assetId, qty);
      await client.query(
        `INSERT INTO crypto_positions (user_id, asset_id, quantity, cost_basis_coins) VALUES ($1,$2,$3::numeric,$4)
         ON CONFLICT (user_id, asset_id) DO UPDATE SET quantity = crypto_positions.quantity + EXCLUDED.quantity, cost_basis_coins = crypto_positions.cost_basis_coins + EXCLUDED.cost_basis_coins, updated_at = NOW()`,
        [userId, mt.assetId, qtyTo, basis]);
      if (fee > 0) {
        try { await investcoinsRepository.applyTransaction(userId, -fee, 'fee_brokerage', { domain: CRYPTO_DOMAIN, symbol: from, to, side: 'swap', orderId: ord.id }, client); }
        catch (e) { if (e instanceof InsufficientFundsError) throw bad('Solde InvestCoins insuffisant pour payer les frais de l\'échange.'); throw e; }
      }
      const ts = readTaxState(account.taxState); ts.feesPaid += fee;
      await client.query('UPDATE crypto_accounts SET tax_state = $2::jsonb, updated_at = NOW() WHERE user_id = $1', [userId, JSON.stringify(ts)]);
      const ins = `INSERT INTO crypto_fills (order_id, user_id, asset_id, side, quantity, ref_price, price, spread_pct, slippage_pct, liquidity_tier, maker, notional_coins, fee_coins, tax_coins, basis_coins, gain_coins, sim_at, swap, fx_usd_per_coin)
                   VALUES ($1,$2,$3,$4,$5::numeric,$6,$7,$8,$9,$10,FALSE,$11,$12,0,$13,NULL,to_timestamp($14::float8 / 1000.0),TRUE,$15)`;
      await client.query(ins, [ord.id, userId, mf.assetId, 'sell', qty, mf.price, sell.price, sell.spreadPct, sell.slippagePct, mf.tier, sell.notionalCoins, fee, basis, account.simulatedAt, fxOf(mf)]);
      await client.query(ins, [ord.id, userId, mt.assetId, 'buy', qtyTo, mt.price, buy.price, buy.spreadPct, buy.slippagePct, mt.tier, buy.notionalCoins, 0, null, account.simulatedAt, fxOf(mt)]);
      await snapshotLeaderboard(client, account);
      await auditLog({ userId, action: 'crypto.swap', entityType: 'crypto_order', entityId: ord.id, ip, metadata: { from, to, quantity: qty, received: qtyTo, feeCoins: fee, simAt: new Date(account.simulatedAt).toISOString() } }, client);
      await client.query('COMMIT');
      return { idempotent: false, order: await orderView(ord.id, userId), received: { symbol: to, quantity: qtyTo }, note: 'Échange crypto contre crypto : aucun impôt (pas de sortie vers l\'euro). Le prix de revient est reporté sur l\'actif reçu.' };
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
    let invested = 0, value = 0, realized = 0, fxUnavailable = false;
    for (const p of pos) {
      realized += num(p.realized_gain_coins);
      if (num(p.quantity) <= 0) continue;
      const m = await marketFor({ query }, p.symbol, acc.simulatedAt);
      const price = m?.price ?? 0;                      // cours d'origine, en dollars par unité
      const fx = m?.fx ?? null;                         // dollars pour 1 InvestCoin (taux BCE du jour de jeu)
      const basis = Math.round(num(p.cost_basis_coins));
      const v = fx ? Math.floor((price * num(p.quantity)) / fx) : null;
      if (fx === null) fxUnavailable = true;
      invested += basis; value += v ?? 0;
      positions.push({ symbol: p.symbol, name: p.name, quantity: fmtQty(p.quantity), avgCostCoins: num(p.quantity) > 0 ? basis / num(p.quantity) : 0, price, priceUsd: price, priceCoins: fx ? price / fx : null, valueUsd: price * num(p.quantity), stale: m?.stale ?? true,
        valueCoins: v, costBasisCoins: basis, unrealizedCoins: v === null ? null : v - basis, unrealizedPct: v !== null && basis > 0 ? Math.round(((v / basis) - 1) * 10000) / 100 : null, realizedCoins: num(p.realized_gain_coins) });
    }
    const funds = await fundsOf({ query }, userId);
    const balance = funds.balance;
    const ts = readTaxState(acc.taxState);
    const fills = (await query(`SELECT COALESCE(SUM(fee_coins),0)::bigint AS f, COALESCE(SUM(tax_coins),0)::bigint AS t FROM crypto_fills WHERE user_id = $1`, [userId])).rows[0];
    return {
      simulatedAt: acc.simulatedAt, balanceCoins: balance, spendableCoins: funds.spendable, reservedElsewhereCoins: funds.reservedElsewhere, holdingsValueCoins: value, wealthCoins: balance + value, investedCoins: invested,
      unrealizedCoins: value - invested, realizedCoins: realized, feesPaidCoins: num(fills.f), taxPaidCoins: num(fills.t),
      cryptoSalesThisYear: ts.cryptoSales[String(new Date(acc.simulatedAt).getUTCFullYear())] ?? 0,
      fxUnavailable,                                    // vrai : taux de change indisponible, les valeurs en InvestCoins ne sont pas calculables (affichage en dollars)
      positions: positions.map((p) => ({ ...p, allocationPct: value > 0 && p.valueCoins !== null ? Math.round((p.valueCoins / value) * 10000) / 100 : 0 })),
      openOrders: await cryptoTradingService.listOrders(userId, 'open', 50),
      economy: { minNotionalCoins: E.minNotionalCoins, fxSource: 'Taux de référence EUR/USD de la BCE du jour de jeu', note: 'Valeurs de jeu non sourcées, à reconfirmer.' },
    };
  },

  // ── Avance du temps : exécute les ordres en attente sur les bougies de la période, puis déplace l'horloge, le tout dans UNE transaction.
  async advance(userId: string, step: unknown) {
    const row = (await query('SELECT * FROM crypto_accounts WHERE user_id = $1', [userId])).rows[0];
    if (!row) throw new CryptoDataError('NOT_FOUND', 'Compte Crypto non créé');
    return this.advanceTo(userId, await clockService.nextDate(toAccount(row), step));
  },

  // Avance le compte Crypto jusqu'à une date précise (utilisée par l'horloge unique, qui décide de la date). Jamais en arrière.
  async advanceTo(userId: string, targetMs: number) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const row = (await client.query('SELECT * FROM crypto_accounts WHERE user_id = $1 FOR UPDATE', [userId])).rows[0];
      if (!row) throw new CryptoDataError('NOT_FOUND', 'Compte Crypto non créé');
      const account = toAccount(row);
      const target = targetMs;
      if (!(target > account.simulatedAt)) throw new CryptoDataError('INVALID_INPUT', 'La date cible doit être postérieure à la date actuelle.');
      const end = await dataEnd();
      if (end === null || target > end) throw new CryptoDataError('INVALID_INPUT', 'Fin des données disponibles : tu ne peux pas avancer davantage.');
      const events = await processResting(client, account, account.simulatedAt, target);
      const marketEvents = await processEvents(client, userId, account.simulatedAt, target);
      const loanEvents = await processLoan(client, account, account.simulatedAt, target);
      await snapshotLeaderboard(client, account, target);
      await client.query('UPDATE crypto_accounts SET simulated_at = to_timestamp($2::float8 / 1000.0), updated_at = NOW() WHERE user_id = $1', [userId, target]);
      await client.query('COMMIT');
      return { from: account.simulatedAt, simulatedAt: target, events, marketEvents, loanEvents };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },
};


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
    `SELECT o.id, o.client_order_id, a.symbol, (SELECT symbol FROM crypto_assets WHERE id = o.to_asset_id) AS to_symbol, o.side, o.type, o.quantity::text AS quantity, o.trigger_price, o.status, o.reject_reason, o.created_sim_at, o.closed_sim_at FROM crypto_orders o JOIN crypto_assets a ON a.id = o.asset_id WHERE o.id = $1 AND o.user_id = $2`, [id, userId])).rows[0];
  if (!o) return null;
  const f = (await query(`SELECT quantity::text AS quantity, ref_price, price, spread_pct, slippage_pct, liquidity_tier, maker, notional_coins, fee_coins, tax_coins, basis_coins, gain_coins, sim_at, fx_usd_per_coin FROM crypto_fills WHERE order_id = $1 ORDER BY id LIMIT 1`, [id])).rows[0];
  return {
    id: o.id, clientOrderId: o.client_order_id, symbol: o.symbol, toSymbol: o.to_symbol, side: o.side, type: o.type, quantity: fmtQty(o.quantity), price: o.trigger_price, triggerCoins: o.trigger_price, status: o.status, rejectReason: o.reject_reason,
    createdSimAt: new Date(o.created_sim_at).getTime(), closedSimAt: o.closed_sim_at ? new Date(o.closed_sim_at).getTime() : null,
    fill: f ? { quantity: fmtQty(f.quantity), refPrice: f.ref_price, price: f.price, fxUsdPerCoin: Number(f.fx_usd_per_coin), refPriceCoins: f.ref_price / Number(f.fx_usd_per_coin), priceCoins: f.price / Number(f.fx_usd_per_coin), spreadPct: f.spread_pct, slippagePct: f.slippage_pct, liquidityTier: f.liquidity_tier, maker: f.maker, notionalCoins: f.notional_coins, feeCoins: f.fee_coins, taxCoins: f.tax_coins, basisCoins: f.basis_coins, gainCoins: f.gain_coins, simAt: new Date(f.sim_at).getTime() } : null,
  };
};

// Exécution des ordres en attente sur (fromMs, toMs] : bougies horaires si disponibles, sinon journalières, strictement postérieures à la création de l'ordre
// et TERMINÉES à toMs. Les exécutions sont appliquées dans l'ordre chronologique. Un ordre qui ne peut pas être honoré (solde, quantité) est annulé avec un motif.
const processResting = async (db: Queryable, account: CryptoAccount, fromMs: number, toMs: number) => {
  const orders = (await db.query(
    `SELECT o.id, o.asset_id, a.symbol, o.side, o.type, o.quantity::text AS quantity, o.trigger_price, o.created_sim_at FROM crypto_orders o JOIN crypto_assets a ON a.id = o.asset_id
      WHERE o.user_id = $1 AND o.status = 'open' ORDER BY o.created_at FOR UPDATE OF o`, [account.userId])).rows;
  // Taux de change de chaque jour de la période : les bougies (en dollars) sont converties en InvestCoins jour par jour, car le prix d'un ordre en attente est en InvestCoins.
  const rater = await fxService.dayRater(fromMs, toMs, db);
  const cands: { order: any; ts: number; refPrice: number; fx: number; maker: boolean; end: number }[] = [];
  for (const o of orders) {
    const startMs = Math.max(fromMs, new Date(o.created_sim_at).getTime());
    let tf: '1h' | '1d' = '1h';
    const query1 = (t: string) => db.query(
      `SELECT ts, o, h, l, c, volume FROM crypto_candles WHERE asset_id = $1 AND tf = $4 AND ts >= to_timestamp($2::float8 / 1000.0) AND ts <= to_timestamp(($3::float8 - ${BASE_MS[t as '1h' | '1d']}) / 1000.0) ORDER BY ts`,
      [o.asset_id, startMs, toMs, t]);
    let rows = (await query1('1h')).rows;
    if (!rows.length) { tf = '1d'; rows = (await query1('1d')).rows; }
    // Bougies converties en InvestCoins par unité ; une bougie sans taux de change ce jour-là ne peut pas déclencher d'ordre (elle est ignorée, jamais devinée).
    const candles = [];
    for (const r of rows) {
      const ts = new Date(r.ts).getTime(), rate = rater(ts);
      if (rate) candles.push({ ts, o: num(r.o) / rate, h: num(r.h) / rate, l: num(r.l) / rate, c: num(r.c) / rate, volume: num(r.volume) });
    }
    const hit = evaluateResting({ side: o.side, type: o.type, triggerPrice: num(o.trigger_price) }, candles);
    if (hit) { const fx = rater(hit.ts)!; cands.push({ order: o, ts: hit.ts, refPrice: hit.refPrice * fx, fx, maker: hit.maker, end: hit.ts + BASE_MS[tf] }); }   // refPrice : retour en dollars (cours d'origine)
  }
  cands.sort((a, b) => a.end - b.end);
  const events: { orderId: string; symbol: string; status: 'filled' | 'cancelled'; note?: string }[] = [];
  for (const c of cands) {
    const o = c.order;
    const m = await marketFor(db, o.symbol, c.end);
    if (!m) continue;
    const ex = executeAt({ side: o.side, refPrice: c.refPrice, quantity: Number(o.quantity), tier: m.tier, avgDailyVolumeUsd: m.adv, maker: c.maker, usdPerCoin: c.fx, stressMultiplier: activeEffects(account.userId, c.end, account.startAt).stress });
    await db.query('SAVEPOINT fill');
    try {
      const release = o.side === 'sell' ? await collateralRelease(db, account.userId, c.end, o.symbol, o.quantity, ex.notionalCoins - ex.feeCoins) : 0;
      const res = await applyFill(db, account.userId, o.id, m, o.side, o.quantity, ex, c.refPrice, c.maker, c.end, account, c.fx);
      await repayFromSale(db, account.userId, release);
      await db.query('RELEASE SAVEPOINT fill');
      events.push({ orderId: o.id, symbol: o.symbol, status: 'filled' });
      const verb = o.side === 'buy' ? 'Achat' : 'Vente';
      await notify(db, account.userId, { kind: 'crypto_order_filled', title: `${verb} exécuté : ${o.symbol}`, body: `Ton ordre ${o.type} (${o.quantity} ${o.symbol}) a été exécuté à ${(ex.price / c.fx).toPrecision(6)} InvestCoins par unité. Frais : ${ex.feeCoins} InvestCoins${res.taxCoins ? `, impôt : ${res.taxCoins} InvestCoins` : ''}.`, link: '/crypto' });
    } catch (e) {
      await db.query('ROLLBACK TO SAVEPOINT fill');
      const reason = e instanceof InsufficientFundsError ? 'Solde insuffisant au moment de l\'exécution' : e instanceof CryptoDataError && /garantie/.test(e.message) ? 'Vente refusée : elle laisserait ton prêt Crypto sans garantie suffisante' : 'Quantité plus disponible au moment de l\'exécution';
      await db.query(`UPDATE crypto_orders SET status = 'cancelled', reject_reason = $2, closed_sim_at = to_timestamp($3::float8 / 1000.0) WHERE id = $1`, [o.id, reason, c.end]);
      events.push({ orderId: o.id, symbol: o.symbol, status: 'cancelled', note: reason });
      await notify(db, account.userId, { kind: 'crypto_order_cancelled', title: `Ordre annulé : ${o.symbol}`, body: `${reason}. Aucun montant n'a été débité.`, link: '/crypto' });
    }
  }
  return events;
};
