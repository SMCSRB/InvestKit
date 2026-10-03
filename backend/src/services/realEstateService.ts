import { getClient, query } from '../utils/db';
import type { PoolClient } from 'pg';
import { investcoinsRepository, InsufficientFundsError } from '../repositories/investcoinsRepository';
import { userRepository } from '../repositories/userRepository';
import { getBuyAccess } from '../utils/entitlements';
import { getRealEstateDataSource, Listing } from '../data/realEstate';
import {
  BANK_RULES, NOTARY_RULE, STARTING_PROFILES, LOAN_INSURANCE_RATE_PCT, SUGGESTED_DOWN_PAYMENT_PCT,
  loanApplicationFee, expertiseCostEuros, RENOVATION_RULES,
} from '../config/immoRules';
import { EUROS_PER_COIN } from '../config/economy';
import { evaluatePurchase, PurchaseEvaluation, ProfileId, applyRenovation, parseSearch, searchListings, SearchInputError, pricePerSqm, grossYieldPct, needsWorks, computeIndicators, computeNotaryFees } from '../engine/immo';
import { spendableCoins, monthlyInstalmentCoins } from './bankService';
import { grantFirstInvestment } from './firstStepsService';

export const RE_DOMAIN = 'real_estate';

export type RealEstateErrorCode =
  | 'NO_GAME' | 'GAME_EXISTS' | 'INVALID_INPUT' | 'UNKNOWN_LISTING' | 'DOMAIN_LOCKED'
  | 'FREE_DOMAIN_NOT_CHOSEN' | 'INSUFFICIENT_FUNDS' | 'BANK_REFUSED' | 'ALREADY_OWNED'
  | 'NOT_FOUND' | 'USER_NOT_FOUND';

export class RealEstateError extends Error {
  constructor(public code: RealEstateErrorCode, message: string, public details?: unknown) {
    super(message);
    this.name = 'RealEstateError';
  }
}

const PROFILES = Object.keys(STARTING_PROFILES) as ProfileId[];
const centsPerCoin = EUROS_PER_COIN;
export const coinsFor = (euros: number): number => Math.ceil(Math.round(euros * 100) / (centsPerCoin * 100)); // arrondi contre le joueur

export interface GameRow { id: string; user_id: string; profile: ProfileId; simulated_year: number; simulated_month: number; arrears_eur?: string | number; missed_months?: number; seed: string }

export const source = () => getRealEstateDataSource();

export const requireGame = async (userId: string, db: { query: PoolClient['query'] } | null = null, lock = false): Promise<GameRow> => {
  const sql = `SELECT * FROM re_games WHERE user_id = $1${lock ? ' FOR UPDATE' : ''}`;
  const res = db ? await (db.query as any)(sql, [userId]) : await query(sql, [userId]);
  if (res.rows.length === 0) throw new RealEstateError('NO_GAME', 'Aucune partie immobilière : choisis d\'abord ton profil');
  return res.rows[0];
};

const requireBuyAccess = async (userId: string): Promise<void> => {
  const user = await userRepository.findById(userId);
  if (!user) throw new RealEstateError('USER_NOT_FOUND', 'Utilisateur non trouvé');
  const access = getBuyAccess(user, RE_DOMAIN);
  if (!access.allowed) {
    throw new RealEstateError(
      access.reason,
      access.reason === 'FREE_DOMAIN_NOT_CHOSEN' ? 'Choisis d\'abord ton domaine gratuit' : 'Le domaine Immobilier nécessite l\'abonnement Pro'
    );
  }
};

const checkInt = (v: unknown, name: string, min: number, max: number): number => {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) {
    throw new RealEstateError('INVALID_INPUT', `${name} doit être un entier entre ${min} et ${max}`);
  }
  return v;
};

// Annonce + champs dérivés pour l'affichage (aucun nouveau chiffre : divisions des champs de l'annonce).
export const decorateListing = (l: Listing) => ({
  ...l,
  pricePerSqm: pricePerSqm(l),
  grossYieldPct: grossYieldPct(l),
  priceCoins: Math.round((l.price / EUROS_PER_COIN) * 100) / 100,
  needsWorks: needsWorks(l),
});

// Rendements estimés d'une annonce AVANT crédit (loyer de marché, vacance attendue, charges du catalogue, frais de notaire) :
// uniquement le moteur existant (computeIndicators), aucun nouveau calcul.
export const listingEconomics = (l: Listing) => {
  const notary = computeNotaryFees(l.price, l.age, NOTARY_RULE);
  const annualCharges = l.annualCharges.condoFees + l.annualCharges.propertyTax + l.annualCharges.insurance + l.annualCharges.maintenance;
  const ind = computeIndicators({
    totalInvestment: l.price + notary + l.advertisedWorks, loanPrincipal: 0, monthlyRent: l.marketRentMonthly,
    occupancyPct: Math.min(100, Math.max(0, 100 - l.vacancyPct)), annualCharges, monthlyLoanPayment: 0,
  });
  return { notaryFees: notary, totalInvestment: l.price + notary + l.advertisedWorks, annualCharges, ...ind };
};

const checkListingId = (v: unknown): string => {
  if (typeof v !== 'string' || !/^[a-z0-9-]{1,80}$/.test(v)) throw new RealEstateError('INVALID_INPUT', 'Identifiant de bien invalide');
  return v;
};

const getListingOrThrow = async (listingId: string, year: number): Promise<Listing> => {
  const l = await source().getListing(listingId, year);
  if (!l) throw new RealEstateError('UNKNOWN_LISTING', 'Bien introuvable');
  return l;
};

// Situation financière du joueur, lue en base : crédits en cours et loyers perçus.
export const loadHousehold = async (game: GameRow, db: { query: PoolClient['query'] }) => {
  // Les prêts personnels de la banque comptent dans l'endettement, comme les autres crédits.
  const bankDebtEuros = (await monthlyInstalmentCoins(db, game.user_id, RE_DOMAIN)) * EUROS_PER_COIN;
  const debts = await (db.query as any)(
    `SELECT COALESCE(SUM(monthly_payment), 0) AS s FROM re_loans WHERE game_id = $1 AND status = 'active'`, [game.id]);
  const rents = await (db.query as any)(
    `SELECT COALESCE(SUM(current_rent), 0) AS s FROM re_properties WHERE game_id = $1 AND status = 'let'`, [game.id]);
  const p = STARTING_PROFILES[game.profile];
  return {
    profile: game.profile,
    salary: p.netMonthlyIncome,
    livingCharges: p.livingCharges,
    existingDebtPayments: Number(debts.rows[0].s) + bankDebtEuros,
    existingRentalIncome: Number(rents.rows[0].s),
  };
};

interface PurchaseParams { listingId: string; downPaymentCoins: number; months: number }

const parsePurchaseParams = (raw: any): PurchaseParams => ({
  listingId: checkListingId(raw?.listingId),
  downPaymentCoins: checkInt(raw?.downPaymentCoins, 'downPaymentCoins', 0, 10_000_000),
  months: checkInt(raw?.months, 'months', 12, 480),
});

interface Plan {
  listing: Listing;
  expertised: { realWorks: number; hiddenDefects: string[] } | null;
  worksFinanced: number;
  evaluation: PurchaseEvaluation;
  coins: { total: number; notary: number; loanFees: number; exchange: number };
  rate: number;
}

// Calcule TOUT côté serveur : le client n'envoie que l'identifiant du bien,
// l'apport en pièces et la durée.
const buildPlan = async (game: GameRow, params: PurchaseParams, db: { query: PoolClient['query'] }): Promise<Plan> => {
  const listing = await getListingOrThrow(params.listingId, game.simulated_year);
  const exp = await (db.query as any)(
    'SELECT real_works, hidden_defects FROM re_expertises WHERE game_id = $1 AND listing_id = $2 AND year = $3',
    [game.id, listing.id, game.simulated_year]);
  const expertised = exp.rows[0] ? { realWorks: Number(exp.rows[0].real_works), hiddenDefects: exp.rows[0].hidden_defects as string[] } : null;

  // Avec expertise, la banque finance les travaux RÉELS ; sans, seuls les travaux annoncés.
  const worksFinanced = expertised ? Math.max(expertised.realWorks, listing.advertisedWorks) : listing.advertisedWorks;
  const household = await loadHousehold(game, db);
  const rate = await source().getLoanRatePct(game.simulated_year, params.months);

  const downPaymentEuros = params.downPaymentCoins * EUROS_PER_COIN;
  const totalCostGuess = listing.price + worksFinanced; // borne large pour valider l'apport
  if (downPaymentEuros > totalCostGuess * 1.2 + 1) {
    throw new RealEstateError('INVALID_INPUT', 'Apport nettement supérieur au coût de l\'achat');
  }

  let evaluation: PurchaseEvaluation;
  try {
    evaluation = evaluatePurchase({
      household, price: listing.price, age: listing.age, works: worksFinanced,
      projectedMonthlyRent: listing.marketRentMonthly,
      downPayment: downPaymentEuros, loanMonths: params.months, annualRatePct: rate,
      insuranceRatePct: LOAN_INSURANCE_RATE_PCT, notaryRule: NOTARY_RULE, bankRules: BANK_RULES, loanFees: loanApplicationFee,
    });
  } catch (e: any) {
    throw new RealEstateError('INVALID_INPUT', e.message);
  }

  // Des impayés en cours : la banque ne prête plus.
  if (Number(game.arrears_eur ?? 0) > 0) {
    evaluation.assessment.decision = 'refused';
    evaluation.assessment.reasons.unshift({
      code: 'LOAN_ARREARS' as any,
      message: `Tu as ${Number(game.arrears_eur).toFixed(0)} € d'impayés en cours : la banque ne finance aucun nouvel achat tant qu'ils ne sont pas réglés.`,
      value: Number(game.arrears_eur),
    });
    evaluation.approved = false;
  }

  const notaryCoins = Math.min(params.downPaymentCoins, coinsFor(evaluation.budget.notaryFees));
  const feeCoins = evaluation.upfrontFees > 0 ? coinsFor(evaluation.upfrontFees) : 0;
  return {
    listing, expertised, worksFinanced, evaluation, rate,
    coins: { total: params.downPaymentCoins + feeCoins, notary: notaryCoins, loanFees: feeCoins, exchange: params.downPaymentCoins - notaryCoins },
  };
};

const summarize = (plan: Plan, balance: number) => {
  const e = plan.evaluation;
  return {
    listing: plan.listing,
    expertised: plan.expertised !== null,
    costs: {
      price: e.budget.price, notaryFees: e.budget.notaryFees, works: e.budget.works, totalCost: e.budget.totalCost,
      downPayment: e.downPayment, loanPrincipal: e.principal, loanApplicationFee: e.upfrontFees,
    },
    loan: e.schedule && {
      months: e.schedule.rows.length, annualRatePct: plan.rate, insuranceRatePct: LOAN_INSURANCE_RATE_PCT,
      monthlyPaymentWithInsurance: e.monthlyPaymentWithInsurance, monthlyPaymentWithoutInsurance: e.schedule.monthlyPayment,
      totalInterest: e.schedule.totalInterest, totalInsurance: e.schedule.totalInsurance, taegPct: e.taegPct,
    },
    bank: {
      decision: e.assessment.decision, approved: e.approved, debtRatioPct: e.assessment.debtRatioPct,
      livingRemaining: e.assessment.livingRemaining, countedIncome: e.assessment.countedIncome,
      maxMonthlyPayment: e.assessment.maxMonthlyPayment, reasons: e.assessment.reasons,
    },
    coins: { ...plan.coins, balance, affordable: balance >= plan.coins.total },
  };
};

export const tx = async <T>(fn: (c: PoolClient) => Promise<T>): Promise<T> => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const r = await fn(client);
    await client.query('COMMIT');
    return r;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

export const realEstateService = {
  async getState(userId: string) {
    const res = await query('SELECT * FROM re_games WHERE user_id = $1', [userId]);
    const balance = await investcoinsRepository.getBalance(userId);
    const user = await userRepository.findById(userId);
    const access = user ? getBuyAccess(user, RE_DOMAIN) : { allowed: false as const, reason: 'DOMAIN_LOCKED' as const };
    return {
      game: res.rows[0]
        ? { profile: res.rows[0].profile, year: res.rows[0].simulated_year, month: res.rows[0].simulated_month }
        : null,
      profiles: PROFILES.map((id) => ({ id, ...STARTING_PROFILES[id], minLivingRemaining: BANK_RULES.livingRemainingByProfile[id] })),
      balance,
      eurosPerCoin: EUROS_PER_COIN,
      access: access.allowed ? { canBuy: true, reason: null } : { canBuy: false, reason: access.reason },
      dataSource: source().id,
    };
  },

  // Choix du profil : UNE fois (la partie est créée à ce moment).
  async startGame(userId: string, profile: unknown) {
    if (typeof profile !== 'string' || !PROFILES.includes(profile as ProfileId)) {
      throw new RealEstateError('INVALID_INPUT', 'Profil inconnu');
    }
    const res = await query(
      `INSERT INTO re_games (user_id, profile, data_source, simulated_year, simulated_month)
       VALUES ($1, $2, $3, $4, 1) ON CONFLICT (user_id) DO NOTHING RETURNING id`,
      [userId, profile, source().id, source().minYear]
    );
    if (res.rows.length === 0) throw new RealEstateError('GAME_EXISTS', 'Ton profil immobilier est déjà choisi');
    return this.getState(userId);
  },

  // Recherche d'annonces : filtres et tri validés et appliqués par le moteur pur (engine/immo/listingSearch.ts).
  // Les champs ajoutés (prix au m², rendement brut, prix en pièces) sont de simples divisions des champs de l'annonce.
  async listListings(userId: string, filter: Record<string, unknown>) {
    const game = await requireGame(userId);
    let params;
    try { params = parseSearch(filter); } catch (e) {
      if (e instanceof SearchInputError) throw new RealEstateError('INVALID_INPUT', e.message);
      throw e;
    }
    const all = await source().listListings(game.simulated_year);
    const owned = await query(`SELECT listing_id FROM re_properties WHERE game_id = $1 AND status <> 'sold'`, [game.id]);
    const ownedSet = new Set(owned.rows.map((r: any) => r.listing_id));
    const available = all.filter((l) => !ownedSet.has(l.id));
    const citiesFull = await source().listCities();
    const places = Object.fromEntries(citiesFull.map((c) => [c.id, { cityName: c.name, region: c.region }]));
    const cities = citiesFull.map((c) => ({ id: c.id, name: c.name, region: c.region, tier: c.tier, description: c.description, tenseZone: c.tenseZone }));
    const found = searchListings(available, params, places);
    return { year: game.simulated_year, cities, total: available.length, count: found.length, eurosPerCoin: EUROS_PER_COIN, listings: found.map(decorateListing) };
  },

  async getListingDetail(userId: string, listingId: unknown) {
    const game = await requireGame(userId);
    const id = checkListingId(listingId);
    const listing = await getListingOrThrow(id, game.simulated_year);
    const [city, market, nbhs] = await Promise.all([
      source().getCity(listing.cityId), source().getMarket(listing.cityId, game.simulated_year), source().listNeighborhoods(listing.cityId),
    ]);
    const exp = await query('SELECT real_works, hidden_defects FROM re_expertises WHERE game_id = $1 AND listing_id = $2 AND year = $3', [game.id, id, game.simulated_year]);
    return {
      listing: decorateListing(listing), economics: listingEconomics(listing), city, market, neighborhood: nbhs.find((n) => n.id === listing.neighborhoodId) ?? null,
      suggestedDownPaymentCoins: Math.ceil((listing.price * SUGGESTED_DOWN_PAYMENT_PCT) / 100 / EUROS_PER_COIN),
      expertiseCostCoins: coinsFor(expertiseCostEuros(listing.price)),
      expertise: exp.rows[0] ? { realWorks: Number(exp.rows[0].real_works), hiddenDefects: exp.rows[0].hidden_defects } : null,
    };
  },

  async buyExpertise(userId: string, listingIdRaw: unknown) {
    const id = checkListingId(listingIdRaw);
    await requireBuyAccess(userId);
    try {
      return await tx(async (c) => {
        const game = await requireGame(userId, c, true);
        const listing = await getListingOrThrow(id, game.simulated_year);
        const existing = await c.query('SELECT real_works, hidden_defects FROM re_expertises WHERE game_id = $1 AND listing_id = $2 AND year = $3', [game.id, id, game.simulated_year]);
        if (existing.rows[0]) {
          return { charged: 0, realWorks: Number(existing.rows[0].real_works), hiddenDefects: existing.rows[0].hidden_defects, alreadyDone: true };
        }
        const truth = (await source().getExpertise(id, game.simulated_year))!;
        const cost = coinsFor(expertiseCostEuros(listing.price));
        await investcoinsRepository.applyTransaction(userId, -cost, 're_expertise', { domain: RE_DOMAIN, listingId: id, year: game.simulated_year }, c);
        await c.query(
          `INSERT INTO re_expertises (game_id, listing_id, year, cost_coins, real_works, hidden_defects) VALUES ($1, $2, $3, $4, $5, $6)`,
          [game.id, id, game.simulated_year, cost, truth.realWorks, JSON.stringify(truth.hiddenDefects)]
        );
        return { charged: cost, realWorks: truth.realWorks, advertisedWorks: listing.advertisedWorks, hiddenDefects: truth.hiddenDefects, alreadyDone: false };
      });
    } catch (e) {
      if (e instanceof InsufficientFundsError) throw new RealEstateError('INSUFFICIENT_FUNDS', 'Solde InvestCoins insuffisant pour l\'expertise');
      throw e;
    }
  },

  // Aperçu : AUCUNE écriture. Renvoie le budget, le prêt, le TAEG et la décision de la banque expliquée.
  async previewPurchase(userId: string, raw: unknown) {
    const params = parsePurchaseParams(raw);
    const game = await requireGame(userId);
    const plan = await buildPlan(game, params, { query: query as any });
    return summarize(plan, await spendableCoins({ query } as any, userId, RE_DOMAIN));
  },

  async purchase(userId: string, raw: unknown) {
    const params = parsePurchaseParams(raw);
    await requireBuyAccess(userId);
    try {
      return await tx(async (c) => {
        const game = await requireGame(userId, c, true); // verrou : achats simultanés sérialisés
        // Déjà possédé ? Vérifié AVANT la banque : sinon la réponse serait un faux « refus ».
        const dup = await c.query(`SELECT 1 FROM re_properties WHERE game_id = $1 AND listing_id = $2 AND status <> 'sold'`, [game.id, params.listingId]);
        if (dup.rows.length > 0) throw new RealEstateError('ALREADY_OWNED', 'Tu possèdes déjà ce bien');
        const plan = await buildPlan(game, params, c);
        const balance = await spendableCoins(c, userId, RE_DOMAIN);
        const summary = summarize(plan, balance);

        if (!plan.evaluation.approved) {
          throw new RealEstateError('BANK_REFUSED', 'La banque refuse ce dossier', summary.bank);
        }
        const meta = { domain: RE_DOMAIN, listingId: plan.listing.id, year: game.simulated_year };
        if (plan.coins.notary > 0) await investcoinsRepository.applyTransaction(userId, -plan.coins.notary, 're_notary_fees', meta, c);
        if (plan.coins.loanFees > 0) await investcoinsRepository.applyTransaction(userId, -plan.coins.loanFees, 're_loan_fees', meta, c);
        if (plan.coins.exchange > 0) await investcoinsRepository.applyTransaction(userId, -plan.coins.exchange, 're_exchange_down_payment', meta, c);
        await grantFirstInvestment(userId, params.downPaymentCoins, c);   // bonus unique « premier investissement » (dans la même transaction)

        const e = plan.evaluation;
        let loanId: string | null = null;
        if (e.schedule) {
          const loan = await c.query(
            `INSERT INTO re_loans (game_id, principal, annual_rate_pct, months, insurance_rate_pct, monthly_payment, upfront_fees, taeg_pct, started_year, started_month)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
            [game.id, e.principal, plan.rate, params.months, LOAN_INSURANCE_RATE_PCT, e.monthlyPaymentWithInsurance, e.upfrontFees, e.taegPct, game.simulated_year, game.simulated_month]
          );
          loanId = loan.rows[0].id;
        }

        // Sans expertise, l'écart entre travaux réels et annoncés est une dette de travaux.
        const truth = (await source().getExpertise(plan.listing.id, game.simulated_year))!;
        const pendingWorks = plan.expertised ? 0 : Math.max(0, truth.realWorks - plan.listing.advertisedWorks);

        const l = plan.listing;
        // Travaux entièrement payés à l'achat : la rénovation est faite tout de suite.
        const renovated = pendingWorks === 0 && plan.worksFinanced > 0
          ? applyRenovation(l.condition, l.energyClass, RENOVATION_RULES)
          : { condition: l.condition, energyClass: l.energyClass };
        const prop = await c.query(
          `INSERT INTO re_properties (game_id, listing_id, city_id, neighborhood_id, title, property_type, surface_sqm, age, energy_class, condition,
             purchase_year, purchase_month, purchase_price, notary_fees, works_financed, down_payment, loan_id, pending_works_eur, hidden_defects,
             initial_condition, initial_energy_class)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) RETURNING id`,
          [game.id, l.id, l.cityId, l.neighborhoodId, l.title, l.type, l.surfaceSqm, l.age, renovated.energyClass, renovated.condition,
            game.simulated_year, game.simulated_month, l.price, e.budget.notaryFees, plan.worksFinanced, e.downPayment, loanId, pendingWorks, JSON.stringify(truth.hiddenDefects),
            l.condition, l.energyClass]
        );

        return {
          success: true,
          propertyId: prop.rows[0].id,
          summary: { ...summary, coins: { ...summary.coins, balance: await investcoinsRepository.getBalance(userId, c) } },
          discovered: plan.expertised ? null : {
            hiddenDefects: truth.hiddenDefects,
            pendingWorks,
            message: pendingWorks > 0
              ? `Sans expertise, tu découvres après l'achat ${truth.hiddenDefects.join(', ') || 'des travaux non annoncés'} : ${pendingWorks.toFixed(0)} € de travaux supplémentaires à payer avant de pouvoir louer.`
              : null,
          },
        };
      });
    } catch (e: any) {
      if (e instanceof InsufficientFundsError) throw new RealEstateError('INSUFFICIENT_FUNDS', 'Solde InvestCoins insuffisant pour cet achat');
      if (e?.code === '23505') throw new RealEstateError('ALREADY_OWNED', 'Tu possèdes déjà ce bien');
      throw e;
    }
  },

  async listProperties(userId: string) {
    const game = await requireGame(userId);
    const props = await query(
      `SELECT p.*, l.monthly_payment AS loan_monthly_payment, l.principal AS loan_principal, l.months AS loan_months, l.months_paid AS loan_months_paid
       FROM re_properties p LEFT JOIN re_loans l ON l.id = p.loan_id
       WHERE p.game_id = $1 AND p.status <> 'sold' ORDER BY p.created_at`, [game.id]);
    return { year: game.simulated_year, properties: props.rows };
  },

  // Paiement des travaux découverts après l'achat. Toujours réservé au propriétaire (game_id).
  async payPendingWorks(userId: string, propertyIdRaw: unknown) {
    if (typeof propertyIdRaw !== 'string' || !/^[0-9a-f-]{36}$/i.test(propertyIdRaw)) throw new RealEstateError('INVALID_INPUT', 'Identifiant invalide');
    try {
      return await tx(async (c) => {
        const game = await requireGame(userId, c, true);
        const res = await c.query('SELECT id, pending_works_eur, condition, energy_class FROM re_properties WHERE id = $1 AND game_id = $2 FOR UPDATE', [propertyIdRaw, game.id]);
        if (res.rows.length === 0) throw new RealEstateError('NOT_FOUND', 'Bien introuvable');
        const pending = Number(res.rows[0].pending_works_eur);
        if (pending <= 0) return { charged: 0, pendingWorks: 0 };
        const coins = coinsFor(pending);
        await investcoinsRepository.applyTransaction(userId, -coins, 're_exchange_pay_works', { domain: RE_DOMAIN, propertyId: propertyIdRaw, euros: pending }, c);
        const renovated = applyRenovation(res.rows[0].condition, res.rows[0].energy_class.trim(), RENOVATION_RULES);
        await c.query('UPDATE re_properties SET pending_works_eur = 0, works_financed = works_financed + $4, extra_invested_eur = extra_invested_eur + $4, condition = $2, energy_class = $3 WHERE id = $1', [propertyIdRaw, renovated.condition, renovated.energyClass, pending]);
        return { charged: coins, pendingWorks: 0 };
      });
    } catch (e) {
      if (e instanceof InsufficientFundsError) throw new RealEstateError('INSUFFICIENT_FUNDS', 'Solde InvestCoins insuffisant pour payer les travaux');
      throw e;
    }
  },
};
