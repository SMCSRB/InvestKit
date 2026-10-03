import { getClient, query } from '../../utils/db';
import { investcoinsRepository } from '../../repositories/investcoinsRepository';
import type { Queryable } from '../../repositories/investcoinsRepository';
import { userRepository } from '../../repositories/userRepository';
import { getBuyAccess } from '../../utils/entitlements';
import { collateralLimits, marginState, ltvPct, liquidationFraction } from '../../engine/bank';
import { convertEurosToCoins } from '../../engine/immo/rent';
import { LOMBARD, bankProductRatePct } from '../../config/bankRules';
import { BankError, originateLoan, assertCanBorrow, logBankEvent, ensureAccount } from '../bankService';
import { applyPayment } from '../bankPortfolioService';
import { notify } from '../notificationService';
import { CRYPTO_DOMAIN, CRYPTO_ECONOMY as E, CRYPTO_LOAN } from '../../config/cryptoMarketRules';
import { BASE_MS } from '../../engine/crypto/candles';
import { CryptoDataError } from './dataService';
import { DAY, marketFor, applyFill, num, toAccount } from './core';
import type { CryptoAccount } from './clockService';
import type { Execution } from '../../engine/crypto/execution';

const fr = (n: number): string => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
const uuidOk = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);
const bankErr = (e: unknown): never => { if (e instanceof BankError) throw new CryptoDataError('INVALID_INPUT', e.message); throw e; };

const activeLoan = async (db: Queryable, userId: string, lock = false) =>
  (await db.query(`SELECT * FROM bank_loans WHERE user_id = $1 AND domain = $2 AND product = 'portfolio' AND status IN ('active','defaulted') ORDER BY created_at DESC LIMIT 1${lock ? ' FOR UPDATE' : ''}`, [userId, CRYPTO_DOMAIN])).rows[0];
const debtCoins = (loan: any): number => (Number(loan.balance_h) + Number(loan.due_interest_h)) / 100;

// Garantie à un instant : positions valorisées à la clôture (ou au plus bas de la période si `lows` est fourni).
export const collateralAt = async (db: Queryable, userId: string, nowMs: number, lows?: Map<string, number>) => {
  const pos = (await db.query(`SELECT a.symbol, p.quantity::text AS q FROM crypto_positions p JOIN crypto_assets a ON a.id = p.asset_id WHERE p.user_id = $1 AND p.quantity > 0`, [userId])).rows;
  const items = [];
  for (const p of pos) {
    const m = await marketFor(db, p.symbol, nowMs);
    const close = m?.price ?? 0;
    const price = lows && lows.has(p.symbol) ? Math.min(close, lows.get(p.symbol)!) : close;
    items.push({ symbol: p.symbol, quantity: p.q, close, price, assetId: m?.assetId, value: (price * num(p.q)) / E.usdPerCoin, ltv: CRYPTO_LOAN.ltv });
  }
  return { items, limits: collateralLimits(items) };
};

// Plus bas de chaque actif détenu sur (fromMs, toMs] : bougies horaires si disponibles, sinon journalières.
const periodLows = async (db: Queryable, userId: string, fromMs: number, toMs: number): Promise<Map<string, number>> => {
  const out = new Map<string, number>();
  const assets = (await db.query(`SELECT a.id, a.symbol FROM crypto_positions p JOIN crypto_assets a ON a.id = p.asset_id WHERE p.user_id = $1 AND p.quantity > 0`, [userId])).rows;
  for (const a of assets) {
    for (const tf of ['1h', '1d'] as const) {
      const r = (await db.query(
        `SELECT MIN(l) AS lo FROM crypto_candles WHERE asset_id = $1 AND tf = $4 AND ts >= to_timestamp($2::float8 / 1000.0) AND ts <= to_timestamp(($3::float8 - ${BASE_MS[tf]}) / 1000.0)`, [a.id, fromMs, toMs, tf])).rows[0];
      if (r.lo !== null) { out.set(a.symbol, num(r.lo)); break; }
    }
  }
  return out;
};

const view = async (db: Queryable, userId: string, nowMs: number) => {
  const { items, limits } = await collateralAt(db, userId, nowMs);
  const loan = await activeLoan(db, userId);
  const base = { collateral: items.map((i) => ({ symbol: i.symbol, quantity: i.quantity, valueCoins: Math.floor(i.value) })), limits, capacityCoins: Math.floor(limits.maxLimit), ltv: CRYPTO_LOAN.ltv, simplification: CRYPTO_LOAN.simplification };
  if (!loan) return { loan: null, ...base };
  const debt = debtCoins(loan);
  return { ...base, loan: { id: loan.id, status: loan.status, debtCoins: debt, principalCoins: loan.principal_coins, annualRatePct: Number(loan.annual_rate_pct), ltvPct: ltvPct(debt, limits.value), state: marginState(debt, limits), marginCall: loan.meta?.marginCall ?? null, overdueInterestCoins: Number(loan.due_interest_h) / 100 } };
};

const evaluate = async (db: Queryable, userId: string, amountRaw: unknown, account: CryptoAccount) => {
  if (typeof amountRaw !== 'number' || !Number.isInteger(amountRaw) || amountRaw < 1 || amountRaw > 10_000_000) throw new CryptoDataError('INVALID_INPUT', 'amountCoins : nombre entier de pièces attendu');
  const user = await userRepository.findById(userId);
  if (!user || !getBuyAccess(user, CRYPTO_DOMAIN).allowed) throw new CryptoDataError('INVALID_INPUT', 'Le prêt suit tes droits sur le domaine Crypto : choisis-le comme domaine gratuit ou prends l\'abonnement Pro.');
  const { limits } = await collateralAt(db, userId, account.simulatedAt);
  const capacity = Math.floor(limits.maxLimit);
  const year = new Date(account.simulatedAt).getUTCFullYear();
  const ratePct = bankProductRatePct('portfolio', year);
  const reasons: { code: string; message: string }[] = [];
  if (limits.value <= 0) reasons.push({ code: 'NO_COLLATERAL', message: 'Tu ne détiens aucune crypto : il faut des actifs à mettre en garantie.' });
  if (amountRaw < LOMBARD.minPrincipalCoins) reasons.push({ code: 'TOO_SMALL', message: `Montant minimum : ${LOMBARD.minPrincipalCoins} InvestCoins.` });
  if (amountRaw > capacity) reasons.push({ code: 'OVER_CAPACITY', message: `Tu peux emprunter au plus ${fr(capacity)} InvestCoins (${CRYPTO_LOAN.ltv.max} % de la valeur de tes cryptos).` });
  if (await activeLoan(db, userId)) reasons.push({ code: 'ALREADY_HAVE_ONE', message: 'Tu as déjà un prêt sur ton portefeuille Crypto : rembourse-le d\'abord (un seul à la fois).' });
  const acc = (await db.query('SELECT credit_blocked FROM bank_accounts WHERE user_id = $1', [userId])).rows[0];
  if (acc?.credit_blocked) reasons.push({ code: 'CREDIT_BLOCKED', message: 'Un de tes prêts est en défaut : aucun nouveau crédit tant qu\'il n\'est pas soldé.' });
  return { limits, capacity, ratePct, reasons, year, amount: amountRaw };
};

const requireAcc = async (db: Queryable, userId: string, lock = false): Promise<CryptoAccount> => {
  const r = (await db.query(`SELECT * FROM crypto_accounts WHERE user_id = $1${lock ? ' FOR UPDATE' : ''}`, [userId])).rows[0];
  if (!r) throw new CryptoDataError('NOT_FOUND', 'Compte Crypto non créé : choisis d\'abord ta date de départ.');
  return toAccount(r);
};

export const cryptoLoanService = {
  async view(userId: string) { return view({ query }, userId, (await requireAcc({ query }, userId)).simulatedAt); },

  async quote(userId: string, amountRaw: unknown) {
    const db = { query }; const account = await requireAcc(db, userId);
    const e = await evaluate(db, userId, amountRaw, account);
    return {
      approved: e.reasons.length === 0, reasons: e.reasons,
      loan: { amountCoins: e.amount, annualRatePct: e.ratePct, yearlyInterestCoins: Math.round(e.amount * e.ratePct) / 100, rateKind: 'variable', interest: 'Les intérêts courent chaque jour simulé et sont prélevés quand tu avances dans le temps (s\'ils ne peuvent pas être payés, ils s\'ajoutent à ta dette).' },
      collateral: { valueCoins: Math.floor(e.limits.value), capacityCoins: e.capacity, maxLtvPct: CRYPTO_LOAN.ltv.max, callLtvPct: CRYPTO_LOAN.ltv.call, liquidationLtvPct: CRYPTO_LOAN.ltv.liquidation },
      margin: `Appel de marge quand la dette dépasse ${CRYPTO_LOAN.ltv.call} % de la valeur de tes cryptos ; vente forcée au-delà de ${CRYPTO_LOAN.ltv.liquidation} % (décote de ${LOMBARD.haircutPct} %). Tu as jusqu'à ta prochaine avance dans le temps pour régulariser un appel de marge.`,
      earmark: 'Ces pièces ne pourront être dépensées que dans le domaine Crypto.', simplification: CRYPTO_LOAN.simplification,
    };
  },

  async borrow(userId: string, amountRaw: unknown) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const account = await requireAcc(client, userId, true);
      await ensureAccount(client as any, userId);
      const e = await evaluate(client, userId, amountRaw, account);
      if (e.reasons.length) throw new CryptoDataError('INVALID_INPUT', e.reasons[0].message);
      try { await assertCanBorrow(client as any, userId, e.amount); } catch (x) { bankErr(x); }
      const day = Math.floor(account.simulatedAt / DAY);
      const { loanId } = await originateLoan(client as any, { userId, product: 'portfolio', domain: CRYPTO_DOMAIN, principalCoins: e.amount, annualRatePct: e.ratePct, months: 1, clockTotal: day, repaymentType: 'interest_only', meta: { rateKind: 'variable', lastAccrualMs: account.simulatedAt, crypto: true } });
      await client.query('COMMIT');
      return { loanId, amountCoins: e.amount, annualRatePct: e.ratePct, message: `Prêt accordé : ${fr(e.amount)} InvestCoins à ${fr(e.ratePct)} % (taux variable). Ces pièces ne servent que dans le domaine Crypto ; tes cryptos sont mises en garantie.` };
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  },

  async repay(userId: string, loanIdRaw: unknown, coinsRaw: unknown) {
    if (!uuidOk(loanIdRaw)) throw new CryptoDataError('INVALID_INPUT', 'Identifiant de prêt invalide');
    if (typeof coinsRaw !== 'number' || !Number.isInteger(coinsRaw) || coinsRaw < 1) throw new CryptoDataError('INVALID_INPUT', 'Montant : nombre entier de pièces attendu');
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const account = await requireAcc(client, userId, true);
      const loan = (await client.query(`SELECT * FROM bank_loans WHERE id = $1 AND user_id = $2 AND domain = $3 AND product = 'portfolio' FOR UPDATE`, [loanIdRaw, userId, CRYPTO_DOMAIN])).rows[0];
      if (!loan) throw new CryptoDataError('NOT_FOUND', 'Prêt introuvable');
      if (loan.status !== 'active' && loan.status !== 'defaulted') throw new CryptoDataError('INVALID_INPUT', 'Ce prêt est déjà clos');
      const maxCoins = Math.ceil((Number(loan.balance_h) + Number(loan.due_interest_h)) / 100);
      if (coinsRaw > maxCoins) throw new CryptoDataError('INVALID_INPUT', `Il ne reste que ${maxCoins} InvestCoins à rembourser`);
      if ((await investcoinsRepository.getBalance(userId, client)) < coinsRaw) throw new CryptoDataError('INVALID_INPUT', `Solde insuffisant : ${coinsRaw} InvestCoins nécessaires.`);
      const r = await applyPayment(client as any, userId, loan, coinsRaw);
      if (!r.repaid) { const v = await view(client, userId, account.simulatedAt); if (v.loan && v.loan.state === 'ok') await client.query(`UPDATE bank_loans SET meta = meta - 'marginCall' WHERE id = $1`, [loan.id]); }
      await logBankEvent(client as any, userId, loan.id, 'loan_repayment', `Remboursement de ${coinsRaw} InvestCoins sur le prêt Crypto.`, { coins: coinsRaw });
      await client.query('COMMIT');
      return { loanId: loan.id, coinsPaid: coinsRaw, repaid: r.repaid, remainingCoins: (r.balanceH + r.dueH) / 100 };
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  },
};

// Une vente de cryptos en garantie ne doit pas laisser le prêt sans garantie suffisante : ce qui manque est remboursé sur le produit de la vente, sinon la vente est refusée.
// Appelée AVANT l'exécution ; renvoie les pièces à rembourser après l'exécution (repayFromSale).
export const collateralRelease = async (db: Queryable, userId: string, nowMs: number, assetSymbol: string, qty: string, netProceeds: number): Promise<number> => {
  const loan = await activeLoan(db, userId, true);
  if (!loan) return 0;
  const { items } = await collateralAt(db, userId, nowMs);
  const rest = items.map((i) => ({ ...i, value: i.symbol === assetSymbol ? Math.max(0, ((num(i.quantity) - num(qty)) * i.price) / E.usdPerCoin) : i.value }));
  const limits = collateralLimits(rest);
  const need = Math.ceil(Math.max(0, debtCoins(loan) - limits.maxLimit));
  if (need <= 0) return 0;
  if (need > netProceeds) throw new CryptoDataError('INVALID_INPUT', `Cette vente laisserait ton prêt sans garantie suffisante : il faudrait en rembourser ${fr(need)} InvestCoins, mais la vente ne rapporte que ${fr(netProceeds)} InvestCoins. Rembourse d'abord une partie du prêt, ou vends moins.`);
  return need;
};

export const repayFromSale = async (db: Queryable, userId: string, coins: number): Promise<void> => {
  if (coins <= 0) return;
  const loan = await activeLoan(db, userId, true);
  if (!loan) return;
  const pay = Math.min(coins, Math.ceil(debtCoins(loan)));
  await applyPayment(db as any, userId, loan, pay, { autoRepay: true });
  await logBankEvent(db as any, userId, loan.id, 'auto_repay', `Une partie du produit de la vente (${fr(pay)} InvestCoins) a servi à rembourser ton prêt Crypto, car les cryptos vendues étaient en garantie.`, { coins: pay });
};

// Passage du temps (fromMs → toMs) : intérêts jour par jour, puis évaluation de la garantie au plus bas de la période (appel de marge, vente forcée).
export const processLoan = async (db: Queryable, account: CryptoAccount, fromMs: number, toMs: number) => {
  const userId = account.userId;
  const events: { kind: string; message: string }[] = [];
  const loan = await activeLoan(db, userId, true);
  if (!loan) return events;
  const emit = async (kind: string, message: string, details: object = {}) => { events.push({ kind, message }); await logBankEvent(db as any, userId, loan.id, kind, message, details); };

  // 1. Intérêts : capital × taux × jours / 365 (taux variable de l'année simulée d'arrivée), prélevés si le solde le permet.
  const days = Math.max(0, (toMs - fromMs) / DAY);
  const rate = bankProductRatePct('portfolio', new Date(toMs).getUTCFullYear());
  const balanceH = Number(loan.balance_h);
  let dueH = Number(loan.due_interest_h) + Math.round((balanceH * rate * days) / 36500);
  let remainder: number = loan.remainder_h, paidI = Number(loan.interest_paid_h), missed: number = loan.missed_instalments;
  if (dueH > 0) {
    const conv = convertEurosToCoins(remainder, -dueH, 1);
    const debit = -conv.coins;
    if (debit === 0 || (await investcoinsRepository.getBalance(userId, db)) >= debit) {
      if (debit > 0) await investcoinsRepository.applyTransaction(userId, -debit, 'bank_repayment', { domain: CRYPTO_DOMAIN, loanId: loan.id, interestH: dueH, advanceTo: toMs }, db);
      paidI += dueH; remainder = conv.remainderCents; dueH = 0; missed = 0;
    } else {
      missed += 1;
      await emit('interest_unpaid', `Intérêts impayés (${fr(dueH / 100)} InvestCoins) : solde insuffisant. Ils s'ajoutent à ta dette.`, { missed });
    }
  }
  await db.query(`UPDATE bank_loans SET due_interest_h = $2, remainder_h = $3, missed_instalments = $4, interest_paid_h = $5, annual_rate_pct = $6, last_clock_total = $7 WHERE id = $1`,
    [loan.id, dueH, remainder, missed, paidI, rate, Math.floor(toMs / DAY)]);

  // 2. Garantie au plus bas de la période (sinon clôture).
  const lows = await periodLows(db, userId, fromMs, toMs);
  const low = await collateralAt(db, userId, toMs, lows);
  const close = await collateralAt(db, userId, toMs);
  const debt = (balanceH + dueH) / 100;
  let state = marginState(debt, low.limits);
  const pending = loan.meta?.marginCall ?? null;
  if (state === 'call' && pending) state = 'liquidation';             // le délai (jusqu'à cette avance) pour régulariser est écoulé
  const setMargin = (v: object | null) => db.query(`UPDATE bank_loans SET meta = CASE WHEN $2::jsonb IS NULL THEN meta - 'marginCall' ELSE jsonb_set(meta, '{marginCall}', $2::jsonb) END WHERE id = $1`, [loan.id, v ? JSON.stringify(v) : null]);
  if (state === 'ok') {
    if (pending) { await setMargin(null); await emit('margin_cleared', 'Appel de marge levé : ta garantie est de nouveau suffisante.'); }
  } else if (state === 'call') {
    await setMargin({ sinceMs: toMs, debtCoins: debt, collateralCoins: low.limits.value });
    await emit('margin_call', `APPEL DE MARGE : ta dette (${fr(debt)} InvestCoins) dépasse ${CRYPTO_LOAN.ltv.call} % de la valeur de tes cryptos au plus bas de la période (${fr(low.limits.value)} InvestCoins). Avant ta prochaine avance dans le temps, rembourse une partie du prêt ou achète des cryptos ; sinon elles seront vendues de force. ${CRYPTO_LOAN.simplification}`, { debt, callLimit: low.limits.callLimit });
    await notify(db, userId, { kind: 'crypto_margin_call', title: 'Appel de marge sur ton prêt Crypto', body: `Ta dette dépasse ${CRYPTO_LOAN.ltv.call} % de la valeur de tes cryptos. Régularise avant d'avancer dans le temps.`, link: '/crypto' });
  } else {
    // Vente forcée proportionnelle à la clôture moins la décote, jusqu'à ramener la dette sous 30 % de ce qui reste.
    const fraction = Math.max(0.01, liquidationFraction(debt, low.limits.value, low.limits.maxLimit, LOMBARD.haircutPct));   // fraction calculée sur la valeur au plus bas, appliquée à chaque position, vendue au cours de clôture moins la décote
    let proceedsTotal = 0;
    for (const it of close.items) {
      if (!it.assetId) continue;
      const sold = fraction >= 1 ? it.quantity : String(Math.floor(num(it.quantity) * fraction * 1e8) / 1e8);
      if (num(sold) <= 0) continue;
      const price = it.close * (1 - LOMBARD.haircutPct / 100);
      const notional = Math.floor((price * num(sold)) / E.usdPerCoin + 1e-9);
      const ex: Execution = { price, spreadPct: LOMBARD.haircutPct, slippagePct: 0, notionalCoins: notional, feeCoins: 0 };
      const ord = (await db.query(`INSERT INTO crypto_orders (user_id, client_order_id, asset_id, side, type, quantity, status, created_sim_at) VALUES ($1,$2,$3,'sell','market',$4::numeric,'open',to_timestamp($5::float8 / 1000.0)) RETURNING id`,
        [userId, `forced-${loan.id}-${toMs}-${it.symbol}`.slice(0, 64), it.assetId, sold, toMs])).rows[0];
      const m = await marketFor(db, it.symbol, toMs);
      if (!m) continue;
      await applyFill(db, userId, ord.id, m, 'sell', String(sold), ex, it.close, false, toMs, account);
      proceedsTotal += notional;
    }
    const fresh = (await db.query('SELECT * FROM bank_loans WHERE id = $1', [loan.id])).rows[0];
    const owed = Math.ceil(debtCoins(fresh));
    const pay = Math.min(proceedsTotal, owed);
    const r = pay > 0 ? await applyPayment(db as any, userId, fresh, pay, { forcedLiquidation: true }) : { balanceH: Number(fresh.balance_h), dueH: Number(fresh.due_interest_h), repaid: false };
    await setMargin(null);
    const left = (r.balanceH + r.dueH) / 100;
    const remaining = Number((await db.query(`SELECT COUNT(*)::int AS n FROM crypto_positions WHERE user_id = $1 AND quantity > 0`, [userId])).rows[0].n);
    let msg: string;
    if (remaining === 0 && left > 0) {
      await db.query(`UPDATE bank_loans SET status = 'defaulted' WHERE id = $1`, [loan.id]);
      await db.query(`UPDATE bank_accounts SET credit_blocked = TRUE, blocked_reason = 'default', blocked_at = NOW(), defaults = defaults + 1 WHERE user_id = $1`, [userId]);
      msg = `VENTE FORCÉE : toutes tes cryptos ont été vendues (${fr(proceedsTotal)} InvestCoins après décote de ${LOMBARD.haircutPct} %), mais il reste ${fr(left)} InvestCoins de dette. Elle reste due et tu ne peux plus emprunter tant qu'elle n'est pas soldée. ${CRYPTO_LOAN.simplification}`;
    } else if (r.repaid) {
      await db.query(`UPDATE bank_loans SET status = 'liquidated' WHERE id = $1`, [loan.id]);
      msg = `VENTE FORCÉE : ${Math.round(Math.min(1, fraction) * 100)} % de tes cryptos ont été vendues (${fr(proceedsTotal)} InvestCoins après décote de ${LOMBARD.haircutPct} %) et le prêt est soldé. ${CRYPTO_LOAN.simplification}`;
    } else {
      msg = `VENTE FORCÉE : ${Math.round(Math.min(1, fraction) * 100)} % de tes cryptos ont été vendues (${fr(proceedsTotal)} InvestCoins après décote de ${LOMBARD.haircutPct} %) pour ramener ta dette à ${fr(left)} InvestCoins. ${CRYPTO_LOAN.simplification}`;
    }
    await emit('liquidation', msg, { proceeds: proceedsTotal, left });
    await notify(db, userId, { kind: 'crypto_liquidation', title: 'Vente forcée sur ton prêt Crypto', body: msg, link: '/crypto' });
  }
  return events;
};

