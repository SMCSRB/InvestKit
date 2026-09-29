import { userRepository } from '../repositories/userRepository';
import { getBuyAccess } from '../utils/entitlements';
import { buildCoinSchedule } from '../engine/bank';
import { PERSONAL_LOAN, bankProductRatePct } from '../config/bankRules';
import { BANK_RULES, EUROS_PER_COIN, STARTING_PROFILES } from '../config/immoRules';
import { RE_DOMAIN, requireGame, loadHousehold, source } from './realEstateService';
import { monthTotal } from '../engine/immo';
import { BankError, withTx, originateLoan, assertCanBorrow, ensureAccount } from './bankService';

// ─────────────────────────────────────────────────────────────────────────
// PRÊT PERSONNEL : plafonné (6 mois de revenus nets du profil), fléché Immobilier (apport, travaux, rénovation, découvert),
// taux = base + écart (plus cher que l'immobilier : pas de garantie), compté dans l'endettement comme tout crédit.
// L'accès suit celui du domaine Immobilier (domaine gratuit ou Pro). Les échéances suivent l'horloge de l'Immobilier.
// ─────────────────────────────────────────────────────────────────────────
type Db = { query: any };
const q = (db: Db, sql: string, params: any[] = []) => db.query(sql, params);
const fr = (n: number): string => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });

const checkInt = (v: unknown, name: string, min: number, max: number): number => {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) throw new BankError('INVALID_INPUT', `${name} : nombre entier entre ${min} et ${max} attendu`);
  return v;
};

const evaluate = async (db: Db, userId: string, amountRaw: unknown, monthsRaw: unknown) => {
  const user = await userRepository.findById(userId);
  const access = user ? getBuyAccess(user, RE_DOMAIN) : { allowed: false as const, reason: 'DOMAIN_LOCKED' as const };
  if (!access.allowed) throw new BankError('NOT_ALLOWED', 'Le prêt personnel (fléché Immobilier) demande d\'avoir l\'Immobilier comme domaine gratuit ou l\'abonnement Pro.');
  const game = await requireGame(userId, db as any);
  const profile = STARTING_PROFILES[game.profile];
  const capCoins = Math.floor((PERSONAL_LOAN.incomeMonthsCap * profile.netMonthlyIncome) / EUROS_PER_COIN);
  const amount = checkInt(amountRaw, 'amountCoins', 1, 10_000_000);
  const months = checkInt(monthsRaw, 'months', PERSONAL_LOAN.minMonths, PERSONAL_LOAN.maxMonths);
  const ratePct = bankProductRatePct('personal', game.simulated_year);
  const sched = buildCoinSchedule({ principalCoins: Math.max(1, amount), annualRatePct: ratePct, months });
  const instalmentCoins = sched.rows[0].paymentH / 100;
  const instalmentEuros = instalmentCoins * EUROS_PER_COIN;

  const reasons: { code: string; message: string }[] = [];
  if (amount < PERSONAL_LOAN.minPrincipalCoins) reasons.push({ code: 'TOO_SMALL', message: `Montant minimum : ${PERSONAL_LOAN.minPrincipalCoins} 🪙.` });
  if (amount > capCoins) reasons.push({ code: 'OVER_CAP', message: `Plafond du prêt personnel : ${PERSONAL_LOAN.incomeMonthsCap} mois de revenus, soit ${fr(capCoins)} 🪙 pour ton profil (${profile.label}).` });
  const active = Number((await q(db, `SELECT COUNT(*) AS n FROM bank_loans WHERE user_id = $1 AND product = 'personal' AND status IN ('active','defaulted')`, [userId])).rows[0].n);
  if (active >= PERSONAL_LOAN.maxActive) reasons.push({ code: 'ALREADY_HAVE_ONE', message: 'Tu as déjà un prêt personnel en cours : un seul à la fois.' });
  const clock = monthTotal(game.simulated_year, game.simulated_month);
  const sameMonth = Number((await q(db, `SELECT COUNT(*) AS n FROM bank_loans WHERE user_id = $1 AND product = 'personal' AND opened_clock_total = $2`, [userId, clock])).rows[0].n);
  if (sameMonth > 0) reasons.push({ code: 'ONE_PER_MONTH', message: 'Un seul prêt personnel par mois de jeu : passe au mois suivant.' });
  const acc = (await q(db, 'SELECT credit_blocked FROM bank_accounts WHERE user_id = $1', [userId])).rows[0];
  if (acc?.credit_blocked) reasons.push({ code: 'CREDIT_BLOCKED', message: 'Un de tes prêts est en défaut : aucun nouveau crédit tant qu\'il n\'est pas soldé.' });

  // Endettement : l'échéance s'ajoute aux crédits existants (immobiliers et bancaires).
  const household = await loadHousehold(game, db as any);
  const countedIncome = household.salary + BANK_RULES.rentalIncomeWeight * household.existingRentalIncome;
  const totalDebt = household.existingDebtPayments + instalmentEuros;
  const debtRatioPct = countedIncome > 0 ? Math.round((totalDebt / countedIncome) * 10000) / 100 : 100;
  const livingRemaining = Math.round((household.salary + household.existingRentalIncome - household.livingCharges - totalDebt) * 100) / 100;
  const minLiving = BANK_RULES.livingRemainingByProfile[game.profile];
  if (debtRatioPct > BANK_RULES.maxDebtRatioPct) reasons.push({ code: 'DEBT_RATIO', message: `Endettement de ${debtRatioPct} % après ce prêt : la banque refuse au-delà de ${BANK_RULES.maxDebtRatioPct} % de tes revenus.` });
  if (livingRemaining < minLiving) reasons.push({ code: 'LIVING_REMAINING', message: `Il te resterait ${fr(livingRemaining)} € par mois pour vivre : la banque exige au moins ${fr(minLiving)} € pour ton profil.` });

  return {
    game, clock, amount, months, ratePct, sched, instalmentCoins, capCoins, reasons, debtRatioPct, livingRemaining, minLiving, countedIncome,
    existingDebtEuros: household.existingDebtPayments, profileLabel: profile.label,
  };
};

export const bankPersonalService = {
  // Simulation sans effet : mensualité, coût total, décision de la banque expliquée.
  async quote(userId: string, body: any) {
    return withTx(async (c) => {
      const e = await evaluate(c, userId, body?.amountCoins, body?.months);
      return {
        approved: e.reasons.length === 0, reasons: e.reasons,
        loan: {
          amountCoins: e.amount, months: e.months, annualRatePct: e.ratePct, instalmentCoins: e.instalmentCoins,
          totalInterestCoins: e.sched.totalInterestH / 100, totalRepaidCoins: e.sched.totalPaidH / 100,
          euroValue: e.amount * EUROS_PER_COIN, clockYear: e.game.simulated_year,
        },
        limits: { capCoins: e.capCoins, incomeMonthsCap: PERSONAL_LOAN.incomeMonthsCap, minMonths: PERSONAL_LOAN.minMonths, maxMonths: PERSONAL_LOAN.maxMonths, minPrincipalCoins: PERSONAL_LOAN.minPrincipalCoins },
        bank: { debtRatioPct: e.debtRatioPct, maxDebtRatioPct: BANK_RULES.maxDebtRatioPct, livingRemaining: e.livingRemaining, minLivingRemaining: e.minLiving },
        earmark: 'Ces pièces ne pourront être dépensées que dans l\'Immobilier (apport, travaux, rénovation, découvert), pas en Bourse ni en crypto.',
        mortgageRatePct: await source().getLoanRatePct(e.game.simulated_year, 300), // pour comparer : le prêt personnel est plus cher
      };
    });
  },

  async borrow(userId: string, body: any) {
    return withTx(async (c) => {
      const game = await requireGame(userId, c, true);   // verrou : une seule opération à la fois par joueur
      void game;
      await ensureAccount(c, userId);
      const e = await evaluate(c, userId, body?.amountCoins, body?.months);
      if (e.reasons.length > 0) throw new BankError('NOT_ALLOWED', e.reasons[0].message, { reasons: e.reasons });
      await assertCanBorrow(c, userId, e.amount);
      const { loanId } = await originateLoan(c, {
        userId, product: 'personal', domain: RE_DOMAIN, principalCoins: e.amount, annualRatePct: e.ratePct, months: e.months, clockTotal: e.clock,
        meta: { purpose: 'immobilier', year: e.game.simulated_year },
      });
      return {
        loanId, amountCoins: e.amount, months: e.months, annualRatePct: e.ratePct, instalmentCoins: e.instalmentCoins,
        message: `Prêt personnel accordé : ${fr(e.amount)} 🪙 (${fr(e.amount * EUROS_PER_COIN)} €) à ${fr(e.ratePct)} % sur ${e.months} mois, ${fr(e.instalmentCoins)} 🪙 par mois. Ces pièces ne servent que dans l'Immobilier.`,
      };
    });
  },
};

