import { query } from '../utils/db';
import { investcoinsRepository } from '../repositories/investcoinsRepository';
import { virtualPortfolioRepository, Position, VirtualPortfolio } from '../repositories/virtualPortfolioRepository';
import { userRepository } from '../repositories/userRepository';
import { getBuyAccess } from '../utils/entitlements';
import { DomainConfig, getDomain } from '../data/marketData';
import { collateralLimits, marginState, ltvPct, liquidationFraction, CollateralItem } from '../engine/bank';
import { convertEurosToCoins } from '../engine/immo/rent';
import { creditForSell } from '../utils/performance';
import { BANK_LIMITS, LOMBARD, LOMBARD_LTV_PCT, LOMBARD_SIMPLIFICATION, CollateralClass, bankProductRatePct } from '../config/bankRules';
import { BankError, originateLoan, assertCanBorrow, logBankEvent, ensureAccount } from './bankService';

// ─────────────────────────────────────────────────────────────────────────
// PRÊT SUR PORTEFEUILLE (Lombard) : garanti par les titres d'un domaine (Bourse ou Crypto), taux variable, intérêts seuls.
// Les pièces empruntées sont fléchées vers ce domaine. Un seul prêt à la fois par domaine, calculé à l'ouverture (pas de boucle de levier).
// Horloge du prêt = celle du domaine (l'année de jeu du portefeuille). Simplification : cours de clôture annuels (LOMBARD_SIMPLIFICATION).
// ─────────────────────────────────────────────────────────────────────────
const MODE = 'accelerated';
type Db = { query: any };
const q = (db: Db, sql: string, params: any[] = []) => db.query(sql, params);
const fr = (n: number): string => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
const uuidOk = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const domainOrThrow = (id: unknown): DomainConfig => {
  const d = typeof id === 'string' && LOMBARD.domains.includes(id) ? getDomain(id) : null;
  if (!d) throw new BankError('INVALID_INPUT', `Le prêt sur portefeuille existe pour : ${LOMBARD.domains.join(', ')}`);
  return d;
};

const classOf = (domain: DomainConfig, symbol: string): CollateralClass => {
  const t = domain.assets.find((a) => a.symbol === symbol)?.type;
  return t === 'crypto' ? 'crypto' : t === 'etf' ? 'etf' : 'stock';
};

const valued = (domain: DomainConfig, positions: Position[], year: number) => {
  const items: (CollateralItem & { symbol: string; price: number; quantity: number })[] = [];
  for (const p of positions) {
    const price = domain.getPrice(p.symbol, year) ?? 0;
    items.push({ symbol: p.symbol, price, quantity: p.quantity, value: price * p.quantity, ltv: LOMBARD_LTV_PCT[classOf(domain, p.symbol)] });
  }
  return items;
};

const activeLoan = async (db: Db, userId: string, domain: string, lock = false) =>
  (await q(db, `SELECT * FROM bank_loans WHERE user_id = $1 AND domain = $2 AND product = 'portfolio' AND status IN ('active','defaulted') ORDER BY created_at DESC LIMIT 1${lock ? ' FOR UPDATE' : ''}`, [userId, domain])).rows[0];
const debtCoins = (loan: any): number => (Number(loan.balance_h) + Number(loan.due_interest_h)) / 100;

const setMargin = async (db: Db, loanId: string, marginCall: object | null) => {
  await q(db, `UPDATE bank_loans SET meta = CASE WHEN $2::jsonb IS NULL THEN meta - 'marginCall' ELSE jsonb_set(meta, '{marginCall}', $2::jsonb) END WHERE id = $1`, [loanId, marginCall ? JSON.stringify(marginCall) : null]);
};

// Vue du prêt d'un portefeuille (pour l'écran Bourse/Crypto et la page Banque).
export const portfolioLoanView = async (db: Db, userId: string, domain: DomainConfig, positions: Position[], year: number) => {
  const items = valued(domain, positions, year);
  const limits = collateralLimits(items);
  const loan = await activeLoan(db, userId, domain.id);
  const capacityCoins = Math.floor(limits.maxLimit);
  if (!loan) return { loan: null, limits, capacityCoins, simplification: LOMBARD_SIMPLIFICATION };
  const debt = debtCoins(loan);
  return {
    loan: {
      id: loan.id, status: loan.status, debtCoins: debt, principalCoins: loan.principal_coins, annualRatePct: Number(loan.annual_rate_pct),
      ltvPct: ltvPct(debt, limits.value), state: marginState(debt, limits), marginCall: loan.meta?.marginCall ?? null,
      overdueInterestCoins: Number(loan.due_interest_h) / 100,
    },
    limits, capacityCoins, simplification: LOMBARD_SIMPLIFICATION,
  };
};

// Aide au calcul du classement : dette, intérêts payés, pièces empruntées non dépensées du domaine (en pièces).
export const portfolioDebtInfo = async (db: Db, userId: string, domain: string) => {
  const r = (await q(db, `SELECT COALESCE(SUM(balance_h + due_interest_h) FILTER (WHERE status IN ('active','defaulted')), 0) AS debt_h, COALESCE(SUM(interest_paid_h), 0) AS interest_h
                          FROM bank_loans WHERE user_id = $1 AND domain = $2 AND product = 'portfolio'`, [userId, domain])).rows[0];
  const reserve = Number((await q(db, 'SELECT COALESCE(SUM(coins), 0) AS s FROM bank_credit_balances WHERE user_id = $1 AND domain = $2', [userId, domain])).rows[0].s);
  return { debt: Number(r.debt_h) / 100, interestPaid: Number(r.interest_h) / 100, reserve };
};

// Paie `coins` pièces entières sur un prêt à intérêts seuls : intérêts échus d'abord, puis capital. Le prêt est soldé si plus rien n'est dû.
const applyPayment = async (db: Db, userId: string, loan: any, coins: number, extra: object = {}) => {
  let payH = coins * 100;
  const interestPart = Math.min(Number(loan.due_interest_h), payH);
  payH -= interestPart;
  const principalPart = Math.min(Number(loan.balance_h), payH);
  await investcoinsRepository.applyTransaction(userId, -coins, 'bank_repayment', { domain: loan.domain, loanId: loan.id, principalH: principalPart, interestH: interestPart, ...extra }, db);
  const balance = Number(loan.balance_h) - principalPart, due = Number(loan.due_interest_h) - interestPart;
  const repaid = balance === 0 && due === 0;
  await q(db, `UPDATE bank_loans SET balance_h = $2::bigint, due_interest_h = $3::bigint, principal_paid_h = principal_paid_h + $4::bigint, interest_paid_h = interest_paid_h + $5::bigint,
                 missed_instalments = CASE WHEN $3::bigint = 0 THEN 0 ELSE missed_instalments END, status = CASE WHEN $6::boolean THEN 'repaid' ELSE status END,
                 closed_at = CASE WHEN $6::boolean THEN NOW() ELSE closed_at END WHERE id = $1`, [loan.id, balance, due, principalPart, interestPart, repaid]);
  if (repaid) {
    await logBankEvent(db, userId, loan.id, 'loan_repaid', 'Prêt sur portefeuille entièrement remboursé.', {});
    await unblockIfClean(db, userId);
  }
  return { balanceH: balance, dueH: due, repaid };
};

const unblockIfClean = async (db: Db, userId: string) => {
  const n = Number((await q(db, `SELECT COUNT(*) AS n FROM bank_loans WHERE user_id = $1 AND status = 'defaulted'`, [userId])).rows[0].n);
  if (n === 0) await q(db, `UPDATE bank_accounts SET credit_blocked = FALSE, blocked_reason = NULL WHERE user_id = $1 AND blocked_reason = 'default'`, [userId]);
};

const evaluateBorrow = async (db: Db, userId: string, domainId: unknown, amountRaw: unknown) => {
  const domain = domainOrThrow(domainId);
  if (typeof amountRaw !== 'number' || !Number.isInteger(amountRaw) || amountRaw < 1 || amountRaw > 10_000_000) throw new BankError('INVALID_INPUT', 'amountCoins : nombre entier de pièces attendu');
  const user = await userRepository.findById(userId);
  const access = user ? getBuyAccess(user, domain.id) : { allowed: false as const, reason: 'DOMAIN_LOCKED' as const };
  if (!access.allowed) throw new BankError('NOT_ALLOWED', 'Le prêt sur portefeuille suit tes droits sur le domaine : choisis-le comme domaine gratuit ou prends l\'abonnement Pro.');
  const portfolio: VirtualPortfolio = await virtualPortfolioRepository.getOrCreate(userId, MODE, domain.id, domain.minYear);
  const year = portfolio.simulated_year;
  const items = valued(domain, portfolio.positions, year);
  const limits = collateralLimits(items);
  const capacity = Math.floor(limits.maxLimit);
  const ratePct = bankProductRatePct('portfolio', year);
  const reasons: { code: string; message: string }[] = [];
  if (limits.value <= 0) reasons.push({ code: 'NO_COLLATERAL', message: 'Ton portefeuille est vide : il faut des titres à mettre en garantie.' });
  if (amountRaw < LOMBARD.minPrincipalCoins) reasons.push({ code: 'TOO_SMALL', message: `Montant minimum : ${LOMBARD.minPrincipalCoins} 🪙.` });
  if (amountRaw > capacity) reasons.push({ code: 'OVER_CAPACITY', message: `Tu peux emprunter au plus ${fr(capacity)} 🪙 sur ce portefeuille (50 % des actions, 30 % de la crypto).` });
  if (await activeLoan(db, userId, domain.id)) reasons.push({ code: 'ALREADY_HAVE_ONE', message: 'Tu as déjà un prêt sur portefeuille dans ce domaine : rembourse-le d\'abord (un seul à la fois, pour éviter les boucles de levier).' });
  const sameYear = Number((await q(db, `SELECT COUNT(*) AS n FROM bank_loans WHERE user_id = $1 AND domain = $2 AND product = 'portfolio' AND opened_clock_total = $3`, [userId, domain.id, year])).rows[0].n);
  if (sameYear > 0) reasons.push({ code: 'ONE_PER_YEAR', message: 'Un seul prêt sur portefeuille par année de jeu : avance d\'une année.' });
  const acc = (await q(db, 'SELECT credit_blocked FROM bank_accounts WHERE user_id = $1', [userId])).rows[0];
  if (acc?.credit_blocked) reasons.push({ code: 'CREDIT_BLOCKED', message: 'Un de tes prêts est en défaut : aucun nouveau crédit tant qu\'il n\'est pas soldé.' });
  return { domain, portfolio, year, limits, capacity, ratePct, reasons, amount: amountRaw };
};

export const bankPortfolioService = {
  async quote(userId: string, body: any) {
    const e = await evaluateBorrow({ query }, userId, body?.domain, body?.amountCoins);
    const newValue = e.limits.value + e.amount;   // les pièces empruntées serviront à acheter des titres du domaine
    return {
      approved: e.reasons.length === 0, reasons: e.reasons,
      loan: { domain: e.domain.id, amountCoins: e.amount, annualRatePct: e.ratePct, yearlyInterestCoins: Math.round(e.amount * e.ratePct) / 100, year: e.year, rateKind: 'variable' },
      collateral: { valueCoins: e.limits.value, capacityCoins: e.capacity, maxLtvPct: 50, callLtvPct: 65, liquidationLtvPct: 80 },
      afterPurchase: { leverage: e.limits.value > 0 ? Math.round((newValue / e.limits.value) * 100) / 100 : null },
      margin: 'Appel de marge à 65 % de la valeur des actions (39 % pour la crypto) ; vente forcée à 80 % (48 % pour la crypto), avec une décote de ' + LOMBARD.haircutPct + ' %.',
      earmark: `Ces pièces ne pourront être dépensées que dans ${e.domain.label}.`,
      simplification: LOMBARD_SIMPLIFICATION,
    };
  },

  async borrow(userId: string, body: any) {
    const domain = domainOrThrow(body?.domain);
    return virtualPortfolioRepository.withLock(userId, MODE, domain.id, domain.minYear, async (_portfolio, tx) => {
      await ensureAccount(tx as any, userId);
      const e = await evaluateBorrow(tx as any, userId, body?.domain, body?.amountCoins);
      if (e.reasons.length > 0) throw new BankError('NOT_ALLOWED', e.reasons[0].message, { reasons: e.reasons });
      await assertCanBorrow(tx as any, userId, e.amount);
      const { loanId } = await originateLoan(tx as any, {
        userId, product: 'portfolio', domain: domain.id, principalCoins: e.amount, annualRatePct: e.ratePct, months: 1, clockTotal: e.year,
        repaymentType: 'interest_only', meta: { year: e.year, rateKind: 'variable' },
      });
      return {
        loanId, amountCoins: e.amount, annualRatePct: e.ratePct,
        message: `Prêt sur portefeuille accordé : ${fr(e.amount)} 🪙 à ${fr(e.ratePct)} % (taux variable, intérêts payés à chaque passage d'année). Ces pièces ne servent que dans ${domain.label}. Tes titres sont mis en garantie.`,
      };
    });
  },

  // Remboursement partiel ou total (sans indemnité : prêt à intérêts seuls, remboursable à tout moment).
  async repay(userId: string, loanIdRaw: unknown, coinsRaw: unknown) {
    if (!uuidOk(loanIdRaw)) throw new BankError('INVALID_INPUT', 'Identifiant de prêt invalide');
    if (typeof coinsRaw !== 'number' || !Number.isInteger(coinsRaw) || coinsRaw < 1) throw new BankError('INVALID_INPUT', 'Montant : nombre entier de pièces attendu');
    const head = (await query(`SELECT domain FROM bank_loans WHERE id = $1 AND user_id = $2 AND product = 'portfolio'`, [loanIdRaw, userId])).rows[0];
    if (!head) throw new BankError('NOT_FOUND', 'Prêt introuvable');
    const domain = domainOrThrow(head.domain);
    return virtualPortfolioRepository.withLock(userId, MODE, domain.id, domain.minYear, async (portfolio, tx) => {
      const loan = (await q(tx as any, `SELECT * FROM bank_loans WHERE id = $1 AND user_id = $2 FOR UPDATE`, [loanIdRaw, userId])).rows[0];
      if (!loan || (loan.status !== 'active' && loan.status !== 'defaulted')) throw new BankError('INVALID_INPUT', 'Ce prêt est déjà clos');
      const owedH = Number(loan.balance_h) + Number(loan.due_interest_h);
      const maxCoins = Math.ceil(owedH / 100);
      if (coinsRaw > maxCoins) throw new BankError('INVALID_INPUT', `Il ne reste que ${maxCoins} 🪙 à rembourser`, { maxCoins });
      const balance = await investcoinsRepository.getBalance(userId, tx);
      if (balance < coinsRaw) throw new BankError('INSUFFICIENT_FUNDS', `Solde insuffisant : ${coinsRaw} 🪙 nécessaires.`);
      const r = await applyPayment(tx as any, userId, loan, coinsRaw);
      const view = await portfolioLoanView(tx as any, userId, domain, portfolio.positions, portfolio.simulated_year);
      if (!r.repaid && view.loan && view.loan.state === 'ok') await setMargin(tx as any, loan.id, null);
      await logBankEvent(tx as any, userId, loan.id, 'loan_repayment', `Remboursement de ${coinsRaw} 🪙 sur le prêt sur portefeuille.`, { coins: coinsRaw });
      return { loanId: loan.id, coinsPaid: coinsRaw, repaid: r.repaid, remainingCoins: (r.balanceH + r.dueH) / 100, marginState: view.loan?.state ?? 'ok',
        message: r.repaid ? 'Prêt sur portefeuille soldé : tes titres ne sont plus en garantie.' : `Remboursement effectué : il reste ${fr((r.balanceH + r.dueH) / 100)} 🪙 à rembourser.` };
    });
  },

  // Une vente de titres en garantie ne doit pas laisser le prêt sans garantie suffisante : ce qui manque est remboursé sur le produit
  // de la vente (comme un courtier), sinon la vente est refusée. Renvoie le remboursement automatique en pièces.
  async releaseCollateral(tx: Db, userId: string, domain: DomainConfig, remaining: Position[], year: number, proceedsCoins: number) {
    const loan = await activeLoan(tx, userId, domain.id, true);
    if (!loan) return { autoRepaid: 0, message: null as string | null };
    const limits = collateralLimits(valued(domain, remaining, year));
    const debt = debtCoins(loan);
    const need = Math.ceil(Math.max(0, debt - limits.maxLimit) * 100) / 100;
    if (need <= 0) return { autoRepaid: 0, message: null };
    const pay = Math.ceil(need);
    if (pay > proceedsCoins) {
      throw new BankError('NOT_ALLOWED', `Cette vente laisserait ton prêt sans garantie suffisante : il faudrait en rembourser ${fr(pay)} 🪙, mais la vente ne rapporte que ${fr(proceedsCoins)} 🪙. Rembourse d'abord une partie du prêt, ou vends moins.`, { needCoins: pay, proceedsCoins });
    }
    await applyPayment(tx, userId, loan, Math.min(pay, Math.ceil(debt)), { autoRepay: true });
    const message = `Une partie du produit de la vente (${fr(pay)} 🪙) a servi à rembourser ton prêt sur portefeuille, car les titres vendus étaient en garantie.`;
    await logBankEvent(tx, userId, loan.id, 'auto_repay', message, { coins: pay });
    return { autoRepaid: pay, message };
  },

  // Passage d'une année dans le domaine : intérêts de l'année écoulée, nouveau taux variable, évaluation de la garantie
  // aux cours de clôture de la nouvelle année, appel de marge ou vente forcée. Renvoie le portefeuille éventuellement modifié.
  async processYearStep(tx: Db, userId: string, domain: DomainConfig, portfolio: VirtualPortfolio, newYear: number) {
    const events: { kind: string; message: string }[] = [];
    const loan = await activeLoan(tx, userId, domain.id, true);
    let positions = portfolio.positions.map((p) => ({ ...p }));
    let proceedsTotal = 0;
    if (!loan) return { positions, proceedsCoins: 0, events, changed: false };
    const emit = async (kind: string, message: string, details: object = {}) => { events.push({ kind, message }); await logBankEvent(tx, userId, loan.id, kind, message, details); };

    // 1. Intérêts de l'année écoulée (taux en vigueur), payés si le solde le permet, sinon ils s'accumulent.
    let balanceH = Number(loan.balance_h), dueH = Number(loan.due_interest_h) + Math.round((balanceH * Number(loan.annual_rate_pct)) / 100);
    let remainder: number = loan.remainder_h, missed: number = loan.missed_instalments, paidI = Number(loan.interest_paid_h);
    const conv = convertEurosToCoins(remainder, -dueH, 1);
    const debit = -conv.coins;
    const wallet = await investcoinsRepository.getBalance(userId, tx);
    if (dueH > 0 && wallet >= debit) {
      if (debit > 0) await investcoinsRepository.applyTransaction(userId, -debit, 'bank_repayment', { domain: domain.id, loanId: loan.id, interestH: dueH, yearStep: newYear }, tx);
      paidI += dueH; remainder = conv.remainderCents; dueH = 0; missed = 0;
    } else if (dueH > 0) {
      missed += 1;
      await emit('interest_unpaid', `Intérêts de l'année impayés (${fr(dueH / 100)} 🪙) : solde insuffisant. Ils s'ajoutent à ta dette.`, { missed });
    }
    const newRate = bankProductRatePct('portfolio', newYear);
    let status: string = loan.status;
    if (missed >= BANK_LIMITS.missedInstalmentsBeforeDefault) {
      status = 'defaulted';
      await q(tx, `UPDATE bank_accounts SET credit_blocked = TRUE, blocked_reason = 'default', blocked_at = NOW(), defaults = defaults + 1 WHERE user_id = $1`, [userId]);
      await emit('loan_defaulted', 'Défaut de paiement : intérêts impayés plusieurs années de suite. La dette reste due et tu ne peux plus emprunter.');
    }
    await q(tx, `UPDATE bank_loans SET due_interest_h = $2, remainder_h = $3, missed_instalments = $4, interest_paid_h = $5, annual_rate_pct = $6, last_clock_total = $7, status = $8 WHERE id = $1`,
      [loan.id, dueH, remainder, missed, paidI, newRate, newYear, status]);

    // 2. Garantie aux cours de clôture de la nouvelle année.
    const items = valued(domain, positions, newYear);
    const limits = collateralLimits(items);
    const debt = (balanceH + dueH) / 100;
    let state = marginState(debt, limits);
    const pending = loan.meta?.marginCall ?? null;
    if (state === 'call' && pending) state = 'liquidation';       // le délai d'une année pour régulariser est écoulé
    if (state === 'ok') {
      if (pending) { await setMargin(tx, loan.id, null); await emit('margin_cleared', 'Appel de marge levé : ta garantie est de nouveau suffisante.'); }
    } else if (state === 'call') {
      await setMargin(tx, loan.id, { sinceYear: newYear, debtCoins: debt, collateralCoins: limits.value });
      await emit('margin_call', `APPEL DE MARGE : ta dette (${fr(debt)} 🪙) dépasse ${fr(limits.callLimit)} 🪙, le seuil d'appel de ta garantie (valeur ${fr(limits.value)} 🪙). Avant le prochain passage d'année, rembourse une partie du prêt ou achète des titres ; sinon tes titres seront vendus de force. ${LOMBARD_SIMPLIFICATION}`, { debt, callLimit: limits.callLimit });
    } else {
      // Vente forcée, proportionnelle, jusqu'à ramener la dette sous le plafond à l'ouverture.
      const f = liquidationFraction(debt, limits.value, limits.maxLimit, LOMBARD.haircutPct);
      let proceeds = 0;
      positions = positions.map((p) => {
        const it = items.find((x) => x.symbol === p.symbol)!;
        const sold = f >= 1 ? p.quantity : Math.round(p.quantity * f * 1e8) / 1e8;
        proceeds += creditForSell(it.price * (1 - LOMBARD.haircutPct / 100), sold);
        return { ...p, quantity: Math.round((p.quantity - sold) * 1e8) / 1e8 };
      }).filter((p) => p.quantity > 1e-9);
      proceedsTotal = proceeds;
      if (proceeds > 0) await investcoinsRepository.applyTransaction(userId, proceeds, 'trade_sell', { domain: domain.id, forced: true, loanId: loan.id, year: newYear }, tx);
      const fresh = (await q(tx, 'SELECT * FROM bank_loans WHERE id = $1', [loan.id])).rows[0];
      const owedCoins = Math.ceil(debtCoins(fresh));
      const pay = Math.min(proceeds, owedCoins);
      const r = pay > 0 ? await applyPayment(tx, userId, fresh, pay, { forcedLiquidation: true }) : { balanceH: Number(fresh.balance_h), dueH: Number(fresh.due_interest_h), repaid: false };
      await setMargin(tx, loan.id, null);
      const left = (r.balanceH + r.dueH) / 100;
      if (positions.length === 0 && left > 0) {
        await q(tx, `UPDATE bank_loans SET status = 'defaulted' WHERE id = $1`, [loan.id]);
        await q(tx, `UPDATE bank_accounts SET credit_blocked = TRUE, blocked_reason = 'default', blocked_at = NOW(), defaults = defaults + 1 WHERE user_id = $1`, [userId]);
        await emit('liquidation', `VENTE FORCÉE : tous tes titres ont été vendus (${fr(proceeds)} 🪙 après décote de ${LOMBARD.haircutPct} %), mais il reste ${fr(left)} 🪙 de dette. Elle reste due et tu ne peux plus emprunter tant qu'elle n'est pas soldée. ${LOMBARD_SIMPLIFICATION}`, { proceeds, left });
      } else if (r.repaid) {
        await q(tx, `UPDATE bank_loans SET status = 'liquidated' WHERE id = $1`, [loan.id]);
        await emit('liquidation', `VENTE FORCÉE : ${Math.round(f * 100)} % de ton portefeuille a été vendu (${fr(proceeds)} 🪙 après décote de ${LOMBARD.haircutPct} %) et le prêt est soldé. ${LOMBARD_SIMPLIFICATION}`, { proceeds });
      } else {
        await emit('liquidation', `VENTE FORCÉE : ${Math.round(f * 100)} % de ton portefeuille a été vendu (${fr(proceeds)} 🪙 après décote de ${LOMBARD.haircutPct} %) pour ramener ta dette à ${fr(left)} 🪙. ${LOMBARD_SIMPLIFICATION}`, { proceeds, left });
      }
    }
    return { positions, proceedsCoins: proceedsTotal, events, changed: proceedsTotal > 0 };
  },
};

