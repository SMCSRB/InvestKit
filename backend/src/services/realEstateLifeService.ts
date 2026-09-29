import type { PoolClient } from 'pg';
import { query } from '../utils/db';
import { investcoinsRepository } from '../repositories/investcoinsRepository';
import { createRng, hashString } from '../utils/seededRandom';

// Un tirage par (partie, bien, mois) : reproductible, indépendant de l'historique des appels.
// La clé du bien est STABLE (annonce d'origine + date d'achat), pas l'identifiant technique : deux parties
// de même graine qui font les mêmes choses obtiennent exactement les mêmes résultats.
const propertyKey = (p: { listing_id: string; purchase_year: number; purchase_month: number }): string =>
  `${p.listing_id}:${p.purchase_year}:${p.purchase_month}`;
export const monthlyDraw = (seed: string, key: string, monthTotalValue: number): number =>
  createRng(hashString(`${seed}:${key}:search:${monthTotalValue}`))();
import {
  RealEstateError, RE_DOMAIN, GameRow, requireGame, source, tx,
} from './realEstateService';
import {
  estimateMarketRent, expectedVacancyMonths, expectedCappedVacancyMonths, monthlyLetProbability, vacancyCapMonths, isTenantFound, clampAskingRentRatio, reviseRent, buildMonthlyStatement,
  buildSchedule, toCents, convertEurosToCoins, nextMonth, monthTotal, valueFromMarket, interpolateByMonth,
  remainingBalance, round2, MonthlyStatement, LoanSchedule, TenantStatus, Condition, EnergyClass,
  pickTenantType, departureHazard, noticeFor, isLatePayment, startsDefaulting, resolveDefault, rollDamage, reletFees,
  rollUnexpectedWorks, settleDeposit, checkLandlordNotice, capRentAtRelet, TenantType, UnitType,
} from '../engine/immo';
import { RENT_MODEL, VACANCY_MODEL, RENT_TAX_RATE_BY_PROFILE, EUROS_PER_COIN, EVENT_PARAMS } from '../config/immoRules';

// ─────────────────────────────────────────────────────────────────────────
// VIE DU BIEN : mise en location, mois qui passent, relevés, valorisation.
// Le temps de jeu appartient au SERVEUR : le client demande « avance de N
// mois », jamais « nous sommes en telle date ».
// ─────────────────────────────────────────────────────────────────────────
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const MAX_MONTHS_PER_CALL = 12;

const uuidOk = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);

const marketFor = async (p: any, year: number) => {
  const [market, nbhs] = await Promise.all([source().getMarket(p.city_id, year), source().listNeighborhoods(p.city_id)]);
  const nbh = nbhs.find((n) => n.id === p.neighborhood_id);
  if (!market || !nbh) throw new RealEstateError('NOT_FOUND', 'Marché introuvable pour ce bien');
  const rent = estimateMarketRent(
    { surfaceSqm: Number(p.surface_sqm), cityRentPerSqm: market.rentPerSqm, neighborhoodRentMultiplier: nbh.rentMultiplier,
      condition: p.condition as Condition, energyClass: String(p.energy_class).trim() as EnergyClass },
    RENT_MODEL
  );
  return { marketRent: rent.monthlyRent, tension: round2(clamp(market.rentalTension + nbh.tensionOffset, 0, 1)) };
};

const scheduleOf = (loan: any): LoanSchedule =>
  buildSchedule({
    principal: Number(loan.principal), annualRatePct: Number(loan.annual_rate_pct), months: Number(loan.months),
    insurance: { annualRatePct: Number(loan.insurance_rate_pct), basis: 'initial' },
  });

// Informations de recherche renvoyées au joueur (probabilités calculées côté serveur).
const searchInfo = (propertyId: string, marketRent: number, asking: number, ratio: number, tension: number, found: boolean, message: string, elapsed = 0) => ({
  propertyId, marketRent, askingRent: asking, askingRentRatio: ratio, tension,
  expectedVacancyMonths: expectedVacancyMonths(tension, ratio, VACANCY_MODEL),
  expectedVacancyMonthsWithCap: expectedCappedVacancyMonths(tension, ratio, VACANCY_MODEL), // moyenne réelle, plafond compris
  monthlyLetProbabilityPct: Math.round(monthlyLetProbability(tension, ratio, VACANCY_MODEL) * 1000) / 10,
  maxVacantMonths: vacancyCapMonths(tension, ratio, VACANCY_MODEL),
  vacantMonthsSoFar: elapsed,
  tenantFoundImmediately: found,
  message,
});

export const realEstateLifeService = {
  // Met un bien vacant en location. Le loyer demandé se règle en % du loyer de marché
  // (borné) : trop haut, la vacance s'allonge (voir engine/immo/rent.ts).
  async listForRent(userId: string, propertyId: unknown, ratioRaw: unknown) {
    if (!uuidOk(propertyId)) throw new RealEstateError('INVALID_INPUT', 'Identifiant invalide');
    if (typeof ratioRaw !== 'number' || !Number.isFinite(ratioRaw)) throw new RealEstateError('INVALID_INPUT', 'askingRentRatio doit être un nombre');
    if (ratioRaw < VACANCY_MODEL.askingRentRatioMin || ratioRaw > VACANCY_MODEL.askingRentRatioMax) {
      throw new RealEstateError('INVALID_INPUT', `Le loyer demandé doit rester entre ${VACANCY_MODEL.askingRentRatioMin * 100} % et ${VACANCY_MODEL.askingRentRatioMax * 100} % du loyer de marché`);
    }
    const ratio = clampAskingRentRatio(ratioRaw, VACANCY_MODEL);
    return tx(async (c) => {
      const game = await requireGame(userId, c, true);
      const res = await c.query('SELECT * FROM re_properties WHERE id = $1 AND game_id = $2 FOR UPDATE', [propertyId, game.id]);
      const p = res.rows[0];
      if (!p || p.status === 'sold') throw new RealEstateError('NOT_FOUND', 'Bien introuvable');
      if (p.status === 'let') throw new RealEstateError('INVALID_INPUT', 'Ce bien est déjà loué');
      if (p.search_elapsed_months !== null) throw new RealEstateError('INVALID_INPUT', 'Ce bien est déjà proposé à la location : utilise « baisser le loyer » pour le modifier');
      if (Number(p.pending_works_eur) > 0) throw new RealEstateError('INVALID_INPUT', `Travaux à payer avant de pouvoir louer : ${Number(p.pending_works_eur).toFixed(0)} €`);

      const { marketRent, tension } = await marketFor(p, game.simulated_year);
      const asking = round2(marketRent * ratio);
      // Premier tirage : ce mois-ci (0 mois vide écoulé).
      const found = isTenantFound(monthlyDraw(game.seed, propertyKey(p), monthTotal(game.simulated_year, game.simulated_month)), tension, ratio, 0, VACANCY_MODEL);
      if (found) {
        await c.query(`UPDATE re_properties SET status = 'let', current_rent = $2, lease_start_total = $3, asking_rent = NULL, search_elapsed_months = NULL, last_asking_ratio = $4 WHERE id = $1`,
          [p.id, asking, monthTotal(game.simulated_year, game.simulated_month), ratio]);
      } else {
        await c.query(`UPDATE re_properties SET asking_rent = $2, search_elapsed_months = 0, last_asking_ratio = $3 WHERE id = $1`, [p.id, asking, ratio]);
      }
      return searchInfo(p.id, marketRent, asking, ratio, tension, found,
        found
          ? `Locataire trouvé tout de suite : loyer de ${fr(asking)} € par mois dès ce mois-ci.`
          : `Annonce publiée à ${fr(asking)} € (${Math.round(ratio * 100)} % du marché de ${marketRent.toFixed(0)} €).`);
    });
  },

  // Baisser (ou remonter) le loyer demandé PENDANT la vacance. Effet dès le prochain mois : la
  // probabilité de trouver un locataire est recalculée. Le tirage du mois en cours est déjà fait :
  // changer de prix ne permet pas de « rejouer » un mois.
  async repriceListing(userId: string, propertyId: unknown, ratioRaw: unknown) {
    if (!uuidOk(propertyId)) throw new RealEstateError('INVALID_INPUT', 'Identifiant invalide');
    if (typeof ratioRaw !== 'number' || !Number.isFinite(ratioRaw) || ratioRaw < VACANCY_MODEL.askingRentRatioMin || ratioRaw > VACANCY_MODEL.askingRentRatioMax) {
      throw new RealEstateError('INVALID_INPUT', `Le loyer demandé doit rester entre ${VACANCY_MODEL.askingRentRatioMin * 100} % et ${VACANCY_MODEL.askingRentRatioMax * 100} % du loyer de marché`);
    }
    return tx(async (c) => {
      const game = await requireGame(userId, c, true);
      const res = await c.query('SELECT * FROM re_properties WHERE id = $1 AND game_id = $2 FOR UPDATE', [propertyId, game.id]);
      const p = res.rows[0];
      if (!p || p.status === 'sold') throw new RealEstateError('NOT_FOUND', 'Bien introuvable');
      if (p.search_elapsed_months === null) throw new RealEstateError('INVALID_INPUT', 'Ce bien n\'est pas en recherche de locataire');
      const { marketRent, tension } = await marketFor(p, game.simulated_year);
      const asking = round2(marketRent * ratioRaw);
      await c.query('UPDATE re_properties SET asking_rent = $2, last_asking_ratio = $3 WHERE id = $1', [p.id, asking, ratioRaw]);
      return searchInfo(p.id, marketRent, asking, ratioRaw, tension, false,
        `Loyer demandé ramené à ${fr(asking)} € (${Math.round(ratioRaw * 100)} % du marché). Effet dès le mois prochain.`,
        p.search_elapsed_months);
    });
  },

  // Fait avancer le temps de N mois. Chaque mois est réglé bien par bien.
  async advanceTime(userId: string, monthsRaw: unknown) {
    if (typeof monthsRaw !== 'number' || !Number.isInteger(monthsRaw) || monthsRaw < 1 || monthsRaw > MAX_MONTHS_PER_CALL) {
      throw new RealEstateError('INVALID_INPUT', `months doit être un entier entre 1 et ${MAX_MONTHS_PER_CALL}`);
    }
    return tx(async (c) => {
      const game = await requireGame(userId, c, true);
      const settled: Awaited<ReturnType<typeof processMonth>>[] = [];
      for (let i = 0; i < monthsRaw; i++) {
        const nxt = nextMonth(game.simulated_year, game.simulated_month, source().maxYear);
        if (!nxt) {
          if (i === 0) throw new RealEstateError('INVALID_INPUT', `Date maximale atteinte (${source().maxYear})`);
          break;
        }
        settled.push(await processMonth(c, game, userId));
        game.simulated_year = nxt.year;
        game.simulated_month = nxt.month;
      }
      await c.query('UPDATE re_games SET simulated_year = $2, simulated_month = $3, updated_at = NOW() WHERE id = $1',
        [game.id, game.simulated_year, game.simulated_month]);
      return { year: game.simulated_year, month: game.simulated_month, settled };
    });
  },

  // Congé du PROPRIÉTAIRE : uniquement à l'échéance du bail, 6 mois avant, pour un motif précis.
  async landlordNotice(userId: string, propertyId: unknown, reason: unknown) {
    if (!uuidOk(propertyId)) throw new RealEstateError('INVALID_INPUT', 'Identifiant invalide');
    if (typeof reason !== 'string') throw new RealEstateError('INVALID_INPUT', 'Motif requis');
    return tx(async (c) => {
      const game = await requireGame(userId, c, true);
      const res = await c.query('SELECT * FROM re_properties WHERE id = $1 AND game_id = $2 FOR UPDATE', [propertyId, game.id]);
      const p = res.rows[0];
      if (!p || p.status === 'sold') throw new RealEstateError('NOT_FOUND', 'Bien introuvable');
      if (p.status !== 'let') throw new RealEstateError('INVALID_INPUT', 'Ce bien n\'est pas loué : aucun bail à rompre');
      if (p.landlord_notice_reason) throw new RealEstateError('INVALID_INPUT', 'Un congé a déjà été donné pour ce bien');
      if (p.notice_end_total !== null) throw new RealEstateError('INVALID_INPUT', 'Le locataire a déjà donné son préavis : inutile de lui donner congé');
      const now = monthTotal(game.simulated_year, game.simulated_month);
      const check = checkLandlordNotice(reason, now, p.lease_start_total, p.default_months_in_lease, EVENT_PARAMS);
      if (!check.ok) throw new RealEstateError('INVALID_INPUT', check.message, { code: check.code, monthsUntilTermEnd: check.monthsUntilTermEnd });
      await c.query('UPDATE re_properties SET landlord_notice_reason = $2, landlord_notice_effective_total = $3 WHERE id = $1', [p.id, reason, check.effectiveTotal]);
      const ty = Math.floor((check.effectiveTotal - 1) / 12), tm = ((check.effectiveTotal - 1) % 12) + 1;
      const message = `Congé donné au locataire (${reason === 'sale' ? 'pour vendre' : 'motif légitime et sérieux'}) : il prendra effet à l'échéance du bail, fin ${tm}/${ty}, dans ${check.monthsUntilTermEnd} mois.` +
        (reason === 'sale' ? ' Après son départ, le bien sera libre pour la vente.' : '');
      await c.query(`INSERT INTO re_events (game_id, property_id, year, month, kind, message, details) VALUES ($1,$2,$3,$4,'landlord_notice',$5,$6)`,
        [game.id, p.id, game.simulated_year, game.simulated_month, message, JSON.stringify({ reason, effectiveTotal: check.effectiveTotal })]);
      return { propertyId: p.id, reason, endsAt: { year: ty, month: tm }, monthsUntilTermEnd: check.monthsUntilTermEnd, message };
    });
  },

  async listEvents(userId: string, limitRaw: unknown) {
    const game = await requireGame(userId);
    const limit = limitRaw === undefined ? 50 : Number(limitRaw);
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new RealEstateError('INVALID_INPUT', 'limit invalide');
    const rows = (await query(
      `SELECT e.*, p.title FROM re_events e JOIN re_properties p ON p.id = e.property_id
       WHERE e.game_id = $1 ORDER BY e.year DESC, e.month DESC, e.seq DESC LIMIT $2`, [game.id, limit])).rows;
    return { events: rows.map((r) => ({ propertyId: r.property_id, title: r.title, year: r.year, month: r.month, kind: r.kind, message: r.message, details: r.details })) };
  },

  // Bilan du patrimoine : valeur, dette, fonds propres, loyers.
  async getPortfolio(userId: string) {
    const game = await requireGame(userId);
    const props = (await query(
      `SELECT p.*, l.principal AS l_principal, l.annual_rate_pct AS l_rate, l.months AS l_months,
              l.insurance_rate_pct AS l_ins, l.months_paid AS l_paid, l.monthly_payment AS l_payment, l.status AS l_status
       FROM re_properties p LEFT JOIN re_loans l ON l.id = p.loan_id
       WHERE p.game_id = $1 AND p.status <> 'sold' ORDER BY p.created_at`, [game.id])).rows;

    const y = game.simulated_year, m = game.simulated_month;
    const items = [];
    let totalValue = 0, totalDebt = 0, monthlyRent = 0, monthlyLoan = 0;
    for (const p of props) {
      const val = async (year: number) => {
        const now = await source().estimateValue({ cityId: p.city_id, neighborhoodId: p.neighborhood_id, type: p.property_type, surfaceSqm: Number(p.surface_sqm), condition: p.condition }, year);
        const then = await source().estimateValue({ cityId: p.city_id, neighborhoodId: p.neighborhood_id, type: p.property_type, surfaceSqm: Number(p.surface_sqm), condition: p.initial_condition }, p.purchase_year);
        return valueFromMarket(Number(p.purchase_price), now, then);
      };
      const thisYear = await val(y);
      const nextYear = y + 1 <= source().maxYear ? await val(y + 1) : null;
      const value = interpolateByMonth(thisYear, nextYear, m);
      const debt = p.loan_id && p.l_status === 'active'
        ? remainingBalance(scheduleOf({ principal: p.l_principal, annual_rate_pct: p.l_rate, months: p.l_months, insurance_rate_pct: p.l_ins }).rows, Number(p.l_principal), Number(p.l_paid))
        : 0;
      const { marketRent, tension } = await marketFor(p, y);
      totalValue += value; totalDebt += debt;
      if (p.status === 'let') monthlyRent += Number(p.current_rent);
      if (p.loan_id && p.l_status === 'active') monthlyLoan += Number(p.l_payment);
      let search = null;
      if (p.search_elapsed_months !== null && p.asking_rent !== null) {
        const ratio = Number(p.asking_rent) / marketRent;
        search = {
          vacantMonthsSoFar: p.search_elapsed_months, askingRatio: Math.round(ratio * 1000) / 1000,
          monthlyLetProbabilityPct: Math.round(monthlyLetProbability(tension, ratio, VACANCY_MODEL) * 1000) / 10,
          maxVacantMonths: vacancyCapMonths(tension, ratio, VACANCY_MODEL),
        };
      }
      items.push({
        ...p, search, value, remainingLoan: debt, equity: round2(value - debt), marketRent, tension,
        searching: p.search_elapsed_months !== null,
        hint: p.status === 'vacant' && p.search_elapsed_months === null
          ? (Number(p.pending_works_eur) > 0 ? 'PENDING_WORKS' : 'NOT_LISTED') : null,
      });
    }
    return {
      year: y, month: m, arrearsEur: Number(game.arrears_eur ?? 0), missedMonths: game.missed_months ?? 0,
      totals: { value: round2(totalValue), debt: round2(totalDebt), equity: round2(totalValue - totalDebt), monthlyRent: round2(monthlyRent), monthlyLoanPayments: round2(monthlyLoan) },
      properties: items,
    };
  },

  // Récapitulatif d'un mois réglé (tous biens) ou historique d'un bien.
  async getMonthSummary(userId: string, yearRaw: unknown, monthRaw: unknown) {
    const game = await requireGame(userId);
    let year = Number(yearRaw), month = Number(monthRaw);
    if (yearRaw === undefined || monthRaw === undefined) {
      const last = (await query('SELECT year, month FROM re_statements WHERE game_id = $1 ORDER BY year DESC, month DESC LIMIT 1', [game.id])).rows[0];
      if (!last) return { year: null, month: null, properties: [], totals: null };
      year = last.year; month = last.month;
    }
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) throw new RealEstateError('INVALID_INPUT', 'Date invalide');
    const rows = (await query(
      `SELECT s.*, p.title FROM re_statements s JOIN re_properties p ON p.id = s.property_id
       WHERE s.game_id = $1 AND s.year = $2 AND s.month = $3 ORDER BY p.created_at`, [game.id, year, month])).rows;
    const sum = (k: string) => round2(rows.reduce((a, r) => a + Number(r.lines[k] ?? 0), 0));
    return {
      year, month,
      properties: rows.map((r) => ({ propertyId: r.property_id, title: r.title, status: r.status, lines: r.lines, explanations: r.explanations, netCashFlow: Number(r.net_cash_flow), coinsDelta: r.coins_delta })),
      totals: rows.length === 0 ? null : {
        rentCollected: sum('rentCollected'), recoverableChargesPaid: sum('recoverableChargesPaid'), recoverableChargesCollected: sum('recoverableChargesCollected'),
        nonRecoverableCharges: sum('nonRecoverableCharges'), loanPayment: sum('loanPayment'),
        loanInterest: sum('loanInterest'), loanPrincipal: sum('loanPrincipal'), loanInsurance: sum('loanInsurance'), rentTax: sum('rentTax'), netCashFlow: sum('netCashFlow'),
      },
    };
  },

  async getStatements(userId: string, propertyId: unknown, limitRaw: unknown) {
    if (!uuidOk(propertyId)) throw new RealEstateError('INVALID_INPUT', 'Identifiant invalide');
    const game = await requireGame(userId);
    const limit = limitRaw === undefined ? 12 : Number(limitRaw);
    if (!Number.isInteger(limit) || limit < 1 || limit > 120) throw new RealEstateError('INVALID_INPUT', 'limit invalide');
    const own = await query('SELECT id FROM re_properties WHERE id = $1 AND game_id = $2', [propertyId, game.id]);
    if (own.rows.length === 0) throw new RealEstateError('NOT_FOUND', 'Bien introuvable');
    const rows = (await query('SELECT * FROM re_statements WHERE property_id = $1 ORDER BY year DESC, month DESC LIMIT $2', [propertyId, limit])).rows;
    return { statements: rows.map((r) => ({ year: r.year, month: r.month, status: r.status, lines: r.lines, explanations: r.explanations, netCashFlow: Number(r.net_cash_flow), coinsDelta: r.coins_delta })) };
  },
};


// ── Règlement d'UN mois pour toute la partie (dans la transaction déjà ouverte) ──
const fr = (x: number): string => x.toFixed(2).replace('.', ',');
const monthLabel = (total: number): string => `${((total - 1) % 12) + 1}/${Math.floor((total - 1) / 12)}`;

async function processMonth(c: PoolClient, game: GameRow, userId: string) {
  const y = game.simulated_year, m = game.simulated_month, total = monthTotal(y, m);
  const meta = (extra: object = {}) => ({ domain: RE_DOMAIN, year: y, month: m, ...extra });
  let arrears = Number(game.arrears_eur ?? 0);
  let missed = game.missed_months ?? 0;
  const warnings: { code: string; message: string }[] = [];
  const inflation = Math.pow(1.015, y - source().minYear);
  const EP = EVENT_PARAMS;

  // 1. Impayés du joueur (dette en euros) réglés en premier, autant que le solde le permet.
  if (arrears > 0) {
    const due = Math.ceil(Math.round(arrears * 100) / (EUROS_PER_COIN * 100));
    const balance = await investcoinsRepository.getBalance(userId, c);
    const pay = Math.min(balance, due);
    if (pay > 0) {
      await investcoinsRepository.applyTransaction(userId, -pay, 're_arrears_payment', meta(), c);
      arrears = round2(Math.max(0, arrears - pay * EUROS_PER_COIN));
    }
  }

  const props = (await c.query(`SELECT * FROM re_properties WHERE game_id = $1 AND status <> 'sold' ORDER BY created_at FOR UPDATE`, [game.id])).rows;
  const loanIds = props.map((p) => p.loan_id).filter(Boolean);
  const loans = new Map<string, any>();
  if (loanIds.length) for (const l of (await c.query('SELECT * FROM re_loans WHERE id = ANY($1) FOR UPDATE', [loanIds])).rows) loans.set(l.id, l);
  const taxRate = RENT_TAX_RATE_BY_PROFILE[game.profile];
  const irl = await source().getIrlAnnualChangePct(y);
  const results: { propertyId: string; title: string; statement: MonthlyStatement; coinsDelta: number; hint: string | null; events: string[] }[] = [];

  for (const p of props) {
    const key = propertyKey(p);
    // Un tirage par (graine, bien, mois, sorte d'événement) : reproductible et indépendant de l'ordre.
    const draw = (kind: string): number => createRng(hashString(`${game.seed}:${key}:${kind}:${total}`))();
    const city = await source().getCity(p.city_id);
    const tenseZone = city?.tenseZone ?? false;
    const energy = String(p.energy_class).trim() as EnergyClass;
    const unit = p.property_type as UnitType;

    let status: TenantStatus = p.status === 'let' ? 'paying' : 'vacant';
    let vacancyRank: number | undefined;
    let hint: string | null = null;
    let currentRent = Number(p.current_rent);
    let nextStatus = p.status as string;
    let nextRent = currentRent;
    let searchElapsed: number | null = p.search_elapsed_months;
    let leaseStart: number | null = p.lease_start_total;
    let askingRent: number | null = p.asking_rent === null ? null : Number(p.asking_rent);
    const askingForDisplay = askingRent;
    let tenantType: TenantType | null = p.tenant_type;
    let deposit = Number(p.deposit_held_eur);
    let noticeEnd: number | null = p.notice_end_total, noticeMonths: number | null = p.notice_months, noticeReason: string | null = p.notice_reason;
    let defaultMonths: number = p.default_months, defaultInLease: number = p.default_months_in_lease;
    let arrRent = Number(p.arrears_rent_eur), arrCharges = Number(p.arrears_charges_eur);
    let carryRent = Number(p.late_carry_rent), carryCharges = Number(p.late_carry_charges);
    let catchUp: boolean = p.catch_up_pending;
    let llReason: string | null = p.landlord_notice_reason, llEffective: number | null = p.landlord_notice_effective_total;
    let salePlanned: boolean = p.sale_planned;
    const oneOff: { depositReceived?: number; depositRefunded?: number; repairCosts?: number; reletFees?: number; unexpectedWorks?: number } = {};
    const notes: { code: any; message: string }[] = [];
    const eventLog: { kind: string; message: string; details?: object }[] = [];
    const note = (code: string, kind: string, message: string, details: object = {}) => { notes.push({ code, message }); eventLog.push({ kind, message, details }); };
    const listing = await source().getListing(p.listing_id, y);
    if (!listing) throw new RealEstateError('NOT_FOUND', 'Annonce d\'origine introuvable');
    const charges = listing.recoverableChargesMonthly;

    // Tirage « un locataire se présente-t-il le mois suivant ? » (bien vacant en recherche, ou qui vient de se libérer).
    const tryRelet = async (elapsed: number): Promise<boolean> => {
      const nxt = nextMonth(y, m, source().maxYear);
      if (!nxt || askingRent === null) return false;
      const { marketRent, tension } = await marketFor({ ...p, condition: p.condition, energy_class: energy }, nxt.year);
      const ratio = askingRent / marketRent;
      const u = monthlyDraw(game.seed, key, monthTotal(nxt.year, nxt.month));
      if (!isTenantFound(u, tension, ratio, elapsed, VACANCY_MODEL)) return false;
      nextStatus = 'let'; nextRent = askingRent; leaseStart = monthTotal(nxt.year, nxt.month);
      searchElapsed = null; askingRent = null;
      tenantType = null; deposit = 0; defaultInLease = 0;
      return true;
    };

    let exit: null | 'tenant_notice' | 'default' | 'landlord_notice' = null;
    let carryOverIn = { rent: 0, charges: 0 };
    let arrearsRecovered: { rent: number; charges: number } | undefined;
    let revision;

    if (status === 'vacant') {
      if (searchElapsed !== null) {
        vacancyRank = searchElapsed + 1;
        searchElapsed += 1;
        await tryRelet(searchElapsed);
      } else hint = Number(p.pending_works_eur) > 0 ? 'PENDING_WORKS' : 'NOT_LISTED';
    } else {
      // ── Bien LOUÉ ──────────────────────────────────────────────────────
      const { tension } = await marketFor(p, y);
      // Début de bail : type de locataire et dépôt de garantie encaissé.
      if (leaseStart === total) {
        tenantType = pickTenantType(createRng(hashString(`${game.seed}:${key}:tenant:${leaseStart}`))(), unit, EP);
        deposit = round2(currentRent * EP.depositMonths);
        oneOff.depositReceived = deposit;
        note('EVENT', 'tenant_moved_in', `Nouveau locataire (${{ student: 'étudiant', worker: 'actif', family: 'famille' }[tenantType]}) : bail de ${EP.leaseTermMonths / 12} ans à ${fr(currentRent)} € par mois.`, { tenantType });
      }
      const type = (tenantType ?? 'worker') as TenantType;

      // Rattrapage d'un impayé décidé le mois précédent.
      if (catchUp) {
        arrearsRecovered = { rent: arrRent, charges: arrCharges };
        arrRent = 0; arrCharges = 0; catchUp = false;
        eventLog.push({ kind: 'default_ended', message: 'Le locataire a réglé ses impayés.', details: { rent: arrearsRecovered.rent, charges: arrearsRecovered.charges } });
      }
      carryOverIn = { rent: carryRent, charges: carryCharges };
      carryRent = 0; carryCharges = 0;

      // Indexation annuelle (date anniversaire, jamais le premier mois).
      if (leaseStart !== null) {
        const age = total - leaseStart;
        if (age > 0 && age % 12 === 0) {
          revision = reviseRent(currentRent, irl, energy);
          currentRent = revision.newRent; nextRent = revision.newRent;
        }
      }

      // Statut de paiement du mois.
      if (defaultMonths > 0) status = 'defaulting';
      else if (isLatePayment(draw('late'), type, EP)) status = 'late';
      else if (startsDefaulting(draw('default'), type, EP)) { status = 'defaulting'; }

      if (status === 'defaulting') {
        defaultMonths += 1; defaultInLease += 1;
        arrRent = round2(arrRent + currentRent); arrCharges = round2(arrCharges + charges);
        if (defaultMonths === 1) note('EVENT', 'default_started', 'Le locataire a cessé de payer. Chaque mois d\'impayé s\'ajoute à sa dette ; le dépôt de garantie couvrira une partie si il part.');
        const out = resolveDefault(defaultMonths, draw('default_resolve'), draw('default_outcome'), EP);
        if (out === 'catch_up') { catchUp = true; defaultMonths = 0; note('EVENT', 'default_resolving', 'Le locataire annonce régulariser : les impayés seront encaissés le mois prochain.'); }
        else if (out === 'leaves') exit = 'default';
      } else if (status === 'late') {
        carryRent = currentRent; carryCharges = charges;
      }

      // Préavis du locataire (jamais pendant un impayé, ni si un congé est déjà en cours).
      if (noticeEnd === null && status !== 'defaulting' && llReason === null && exit === null) {
        if (draw('depart') < departureHazard(type, tension, EP)) {
          const nd = noticeFor(tenseZone, type, draw('notice_reason'), EP);
          noticeEnd = total + nd.months - 1; noticeMonths = nd.months; noticeReason = nd.reason;
          const why = { tense_zone: 'logement en zone tendue', personal: 'motif personnel justifié (mutation, emploi, santé…)', standard: 'préavis légal standard' }[nd.reason];
          note('TENANT_NOTICE', 'tenant_notice', `Le locataire donne son préavis de ${nd.months} mois (${why}) : il paiera encore son loyer jusqu'en ${monthLabel(noticeEnd)} puis quittera le logement.`, { months: nd.months, reason: nd.reason });
        }
      }
      if (exit === null && noticeEnd !== null && noticeEnd === total) exit = 'tenant_notice';
      if (exit === null && llEffective !== null && llEffective === total) exit = 'landlord_notice';

      // ── Sortie du locataire à la fin de ce mois ──────────────────────
      if (exit !== null) {
        // Un retard en cours au moment de partir devient une dette réglée sur le dépôt.
        const lateOwed = status === 'late' ? { rent: currentRent, charges } : { rent: 0, charges: 0 };
        if (status === 'late') { carryRent = 0; carryCharges = 0; }
        const arrearsTotal = round2(arrRent + arrCharges + lateOwed.rent + lateOwed.charges);
        const damages = rollDamage(draw('damage_prob'), draw('damage_amount'), currentRent, EP);
        const st = settleDeposit(deposit, arrearsTotal, damages);
        oneOff.depositRefunded = st.refund;
        oneOff.repairCosts = damages;
        oneOff.reletFees = reletFees(currentRent, inflation, EP);
        const cause = { tenant_notice: 'a quitté le logement à la fin de son préavis', default: 'a quitté le logement (procédure pour impayés aboutie)', landlord_notice: 'quitte le logement à l\'échéance du bail (congé donné par toi)' }[exit];
        note('TENANT_LEFT', 'tenant_left',
          `Le locataire ${cause}. État des lieux de sortie : ${damages > 0 ? `dégradations chiffrées à ${fr(damages)} €` : 'conforme'}. ` +
          `Dépôt de garantie de ${fr(deposit)} € : ${st.keptForArrears > 0 ? `${fr(st.keptForArrears)} € retenus pour impayés, ` : ''}${st.keptForDamages > 0 ? `${fr(st.keptForDamages)} € retenus pour dégradations, ` : ''}${fr(st.refund)} € restitués.` +
          (st.arrearsLost > 0 ? ` Impayés perdus : ${fr(st.arrearsLost)} €.` : '') +
          (st.damagesBeyondDeposit > 0 ? ` Réparations au-delà du dépôt : ${fr(st.damagesBeyondDeposit)} € à ta charge.` : ''),
          { exit, damages, ...st });
        const wasSale = llReason === 'sale';
        // Le bien se libère : on efface tout ce qui concernait ce locataire.
        nextStatus = 'vacant'; nextRent = 0; leaseStart = null; tenantType = null; deposit = 0;
        noticeEnd = null; noticeMonths = null; noticeReason = null; defaultMonths = 0; defaultInLease = 0;
        arrRent = 0; arrCharges = 0; carryRent = 0; carryCharges = 0; catchUp = false;
        llReason = null; llEffective = null;
        if (wasSale) {
          salePlanned = true; searchElapsed = null; askingRent = null;
          note('EVENT', 'ready_for_sale', 'Le bien est libre : tu peux le vendre (mise en vente prévue à l\'étape suivante du jeu).');
        } else {
          // Remise en location automatique au loyer habituel (gel F/G : jamais au-dessus de l'ancien loyer).
          const nxtYear = nextMonth(y, m, source().maxYear)?.year ?? y;
          const { marketRent } = await marketFor(p, nxtYear);
          askingRent = capRentAtRelet(round2(marketRent * Number(p.last_asking_ratio)), currentRent, energy);
          searchElapsed = 0;
          await tryRelet(0);
        }
      }
    }

    // Travaux imprévus (tout bien, loué ou non).
    const works = rollUnexpectedWorks(draw('works_prob'), draw('works_amount'),
      { condition: p.condition as Condition, energyClass: energy, age: p.age as 'old' | 'new', surfaceSqm: Number(p.surface_sqm), inflation }, EP);
    if (works > 0) {
      oneOff.unexpectedWorks = works;
      eventLog.push({ kind: 'unexpected_works', message: `Travaux imprévus : ${fr(works)} €.`, details: { amount: works } });
    }
    if (status === 'late') eventLog.push({ kind: 'late_payment', message: 'Loyer payé avec un mois de retard.' });

    // Mensualité du prêt (échéance exacte du tableau d'amortissement).
    let loanPayment = 0;
    let loanBreakdown: { interest: number; principal: number; insurance: number } | undefined;
    const loan = p.loan_id ? loans.get(p.loan_id) : null;
    if (loan && loan.status === 'active') {
      const rows = scheduleOf(loan).rows;
      const row = rows[loan.months_paid];
      loanPayment = row.totalPayment;
      loanBreakdown = { interest: row.interest, principal: row.principal, insurance: row.insurance };
      loan.months_paid += 1;
      if (loan.months_paid >= rows.length) loan.status = 'repaid';
    }

    const displayedRent = status === 'vacant' ? (askingForDisplay ?? (await marketFor(p, y)).marketRent) : currentRent;
    const statement = buildMonthlyStatement({
      year: y, month: m, status, rent: displayedRent, recoverableCharges: charges,
      nonRecoverableAnnual: listing.annualCharges, loanPayment, loanBreakdown, revision,
      tax: { ytdBefore: Number(p.tax_base_ytd), ratePct: taxRate, settleThisMonth: m === 12 },
      vacancyMonthsSoFar: vacancyRank, carryOverIn, arrearsRecovered, oneOff, notes,
    });
    if (hint === 'PENDING_WORKS') {
      statement.explanations.unshift({ code: 'PENDING_WORKS', cashFlowImpact: 0,
        message: `Travaux à payer (${Number(p.pending_works_eur).toFixed(0)} €) : impossible de louer tant qu'ils ne sont pas réglés. Une expertise avant l'achat les aurait révélés.` });
    } else if (hint === 'NOT_LISTED') {
      statement.explanations.unshift({ code: 'NOT_LISTED', cashFlowImpact: 0,
        message: 'Ce logement n\'est pas proposé à la location : mets-le en location pour toucher des loyers.' });
    }
    // Retard : le montant reporté n'existe que si le locataire reste (sinon il a été réglé sur le dépôt).
    if (status === 'late' && exit === null) { carryRent = statement.carryOverToNextMonth.rent; carryCharges = statement.carryOverToNextMonth.charges; }

    // Net → pièces : reliquat en euros conservé par bien, aucune création ni perte.
    const conv = convertEurosToCoins(p.euro_remainder_cents, toCents(statement.lines.netCashFlow), EUROS_PER_COIN);
    let coinsDelta = 0;
    if (conv.coins > 0) {
      await investcoinsRepository.applyTransaction(userId, conv.coins, 're_cashflow_in', meta({ propertyId: p.id }), c);
      coinsDelta = conv.coins;
    } else if (conv.coins < 0) {
      const need = -conv.coins;
      const balance = await investcoinsRepository.getBalance(userId, c);
      const pay = Math.min(balance, need);
      if (pay > 0) await investcoinsRepository.applyTransaction(userId, -pay, 're_cashflow_out', meta({ propertyId: p.id }), c);
      coinsDelta = -pay;
      if (need > pay) arrears = round2(arrears + (need - pay) * EUROS_PER_COIN);
    }

    await c.query(
      `UPDATE re_properties SET status = $2, current_rent = $3, search_elapsed_months = $4, lease_start_total = $5,
         asking_rent = $6, euro_remainder_cents = $7, tenant_type = $8, deposit_held_eur = $9,
         notice_end_total = $10, notice_months = $11, notice_reason = $12, default_months = $13, default_months_in_lease = $14,
         arrears_rent_eur = $15, arrears_charges_eur = $16, late_carry_rent = $17, late_carry_charges = $18, catch_up_pending = $19,
         landlord_notice_reason = $20, landlord_notice_effective_total = $21, sale_planned = $22, tax_base_ytd = $23
       WHERE id = $1`,
      [p.id, nextStatus, nextRent, searchElapsed, leaseStart, askingRent, conv.remainderCents, tenantType, deposit,
        noticeEnd, noticeMonths, noticeReason, defaultMonths, defaultInLease, arrRent, arrCharges, carryRent, carryCharges, catchUp,
        llReason, llEffective, salePlanned, statement.taxableIncomeYtdCarry]);
    if (loan) await c.query('UPDATE re_loans SET months_paid = $2, status = $3 WHERE id = $1', [loan.id, loan.months_paid, loan.status]);
    await c.query(
      `INSERT INTO re_statements (property_id, game_id, year, month, status, lines, explanations, net_cash_flow, coins_delta, remainder_cents_after)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [p.id, game.id, y, m, status, JSON.stringify(statement.lines), JSON.stringify(statement.explanations),
        statement.lines.netCashFlow, coinsDelta, conv.remainderCents]);
    for (const ev of eventLog) {
      await c.query(`INSERT INTO re_events (game_id, property_id, year, month, kind, message, details) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [game.id, p.id, y, m, ev.kind, ev.message, JSON.stringify(ev.details ?? {})]);
    }
    results.push({ propertyId: p.id, title: p.title, statement, coinsDelta, hint, events: eventLog.map((e) => e.kind) });
  }

  if (arrears > 0) {
    missed += 1;
    warnings.push({
      code: missed >= 3 ? 'SEIZURE_RISK' : 'ARREARS',
      message: `Impayés : ${arrears.toFixed(0)} € dus faute de pièces suffisantes (${missed} mois de suite).` +
        (missed >= 3 ? ' Risque de vente forcée par la banque (mécanisme prévu à l\'étape 6).' : ' Réponds vite : la banque ne financera plus rien tant que ce n\'est pas réglé.'),
    });
  } else missed = 0;
  await c.query('UPDATE re_games SET arrears_eur = $2, missed_months = $3 WHERE id = $1', [game.id, arrears, missed]);
  game.arrears_eur = arrears; game.missed_months = missed;

  return { year: y, month: m, properties: results, warnings, arrearsEur: arrears };
}
