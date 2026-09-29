import type { PoolClient } from 'pg';
import { query } from '../utils/db';
import { investcoinsRepository } from '../repositories/investcoinsRepository';
import { leaderboardRepository } from '../repositories/leaderboardRepository';
import { RealEstateError, RE_DOMAIN, GameRow, requireGame, source, tx } from './realEstateService';
import { uuidOk, fr, monthlyDraw, propertyKey, marketFor, scheduleOf, valueOfProperty } from './realEstateHelpers';
import {
  computeSaleClosing, energyAuditRequired, rentalBannedByEnergy, SaleClosing, remainingBalance, convertEurosToCoins, toCents, monthTotal, computeRentTax,
  isTenantFound, monthlyLetProbability, vacancyCapMonths, expectedVacancyMonths, expectedCappedVacancyMonths, round2, computePerformancePctFromEuros,
  EnergyClass, UnitType,
} from '../engine/immo';
import {
  CAPITAL_GAIN_RULES, SALE_PARAMS, EUROS_PER_COIN, RENT_TAX_RATE_BY_PROFILE, RENOVATION_RULES, RENT_MODEL,
} from '../config/immoRules';
import { MIN_RANKED_CAPITAL, LEADERBOARD_SIZE } from '../config/game';
import { applyEnergyRenovation } from '../engine/immo';

export type SaleKind = 'amicable' | 'distress_amicable' | 'forced';

export interface CloseOutcome {
  closing: SaleClosing;
  arrearsCovered: number;   // dette du joueur réglée avec le produit de la vente
  shortfall: number;        // partie de la dette que le prix ne couvre pas (reste dû à la banque)
  coins: number;
  message: string;
  eventKind: string;
}

const KIND_LABEL: Record<SaleKind, string> = {
  amicable: 'Vente à l\'amiable',
  distress_amicable: 'Vente amiable rapide (proposée par la banque)',
  forced: 'VENTE FORCÉE par la banque',
};

const explain = (kind: SaleKind, c: SaleClosing, opts: { discountPct?: number; occupiedDiscountPct?: number; arrearsCovered: number; shortfall: number; coins: number; yearsHeld: number; valueBefore: number }): string => {
  const g = c.capitalGain;
  const parts: string[] = [];
  parts.push(`${KIND_LABEL[kind]} : prix de vente ${fr(c.salePrice)} €` +
    (opts.discountPct ? ` (${opts.discountPct} % sous la valeur estimée de ${fr(opts.valueBefore)} €)` : '') +
    (opts.occupiedDiscountPct ? ` (dont ${opts.occupiedDiscountPct} % de décote « vendu occupé »)` : '') + '.');
  if (kind === 'forced') {
    parts.push('Dans la réalité, une saisie immobilière est beaucoup plus longue que dans ce jeu (commandement de payer, procédure judiciaire, audience, vente aux enchères : souvent plus d\'un an) ; elle est ici raccourcie à quelques mois. Le prix d\'adjudication est en moyenne nettement sous la valeur de marché (décote de 10 à 30 % constatée, 25 % retenue ici) et la procédure engendre des frais.');
  }
  const lines = [
    `prêt remboursé à la banque : ${fr(c.loanPayoff)} €`,
    c.earlyRepaymentFee > 0 ? `indemnité de remboursement anticipé : ${fr(c.earlyRepaymentFee)} € (le plus faible de 6 mois d'intérêts et 3 % du capital restant dû)` : null,
    c.agencyFees > 0 ? `frais d'agence : ${fr(c.agencyFees)} €` : null,
    c.diagnostics > 0 ? `diagnostics obligatoires : ${fr(c.diagnostics)} €` : null,
    c.energyAudit > 0 ? `audit énergétique obligatoire : ${fr(c.energyAudit)} €` : null,
    c.proceedingCosts > 0 ? `frais de la procédure de vente forcée : ${fr(c.proceedingCosts)} €` : null,
    c.depositTransferred > 0 ? `dépôt de garantie remis à l'acquéreur : ${fr(c.depositTransferred)} €` : null,
    c.rentalTaxSettled > 0 ? `impôt sur les loyers de l'année en cours : ${fr(c.rentalTaxSettled)} €` : null,
  ].filter(Boolean);
  parts.push('Sur ce prix : ' + lines.join(' ; ') + '.');
  if (g.grossGain > 0) {
    parts.push(`Plus-value : ${fr(g.grossGain)} € (prix de vente − frais − prix de revient ${fr(g.costBasis)} €), après ${opts.yearsHeld} an${opts.yearsHeld > 1 ? 's' : ''} de détention. ` +
      (g.totalTax > 0
        ? `Impôt sur la plus-value : ${fr(g.totalTax)} € (impôt sur le revenu ${fr(g.incomeTax)} € + prélèvements sociaux ${fr(g.socialCharges)} €${g.surtax > 0 ? ` + surtaxe ${fr(g.surtax)} €` : ''}).`
        : 'Aucun impôt sur la plus-value grâce aux abattements pour durée de détention.'));
  } else parts.push('Aucune plus-value imposable (moins-value ou gain nul).');
  if (opts.arrearsCovered > 0) parts.push(`${fr(opts.arrearsCovered)} € de tes impayés ont été réglés avec le produit de la vente.`);
  if (opts.shortfall > 0) parts.push(`Le prix ne couvre pas la dette : il reste ${fr(opts.shortfall)} € dus à la banque, ajoutés à tes impayés.`);
  else parts.push(`Il te reste ${fr(c.netProceeds - opts.arrearsCovered)} € : ${opts.coins} 🪙 crédités (les centimes restent en attente).`);
  return parts.join(' ');
};

// Solde d'un bien vendu : rembourse le prêt, calcule tous les frais et impôts, règle les impayés du joueur,
// crédite les pièces (arrondi contre le joueur, reliquat conservé), marque le bien vendu, journalise.
export async function closeSale(
  c: PoolClient, game: GameRow, userId: string, p: any, kind: SaleKind, salePrice: number,
  opts: { arrearsEur: number; discountPct?: number; occupiedDiscountPct?: number; valueBefore: number; y: number; m: number }
): Promise<CloseOutcome> {
  const { y, m } = opts;
  const energy = String(p.energy_class).trim() as EnergyClass;
  const unit = p.property_type as UnitType;
  const yearsHeld = Math.max(0, Math.floor((monthTotal(y, m) - monthTotal(p.purchase_year, p.purchase_month)) / 12));

  let capitalRemaining = 0, loanRate = 0, loanRow: any = null;
  if (p.loan_id) {
    loanRow = (await c.query('SELECT * FROM re_loans WHERE id = $1 FOR UPDATE', [p.loan_id])).rows[0];
    if (loanRow && loanRow.status === 'active') {
      capitalRemaining = remainingBalance(scheduleOf(loanRow).rows, Number(loanRow.principal), Number(loanRow.months_paid));
      loanRate = Number(loanRow.annual_rate_pct);
    }
  }
  const forced = kind === 'forced';
  const proceedingCosts = forced
    ? round2(Math.min(SALE_PARAMS.distress.proceedingCostsMax, Math.max(SALE_PARAMS.distress.proceedingCostsMin, (salePrice * SALE_PARAMS.distress.proceedingCostsPct) / 100)))
    : 0;
  const rentalTaxDue = computeRentTax(Number(p.tax_base_ytd), RENT_TAX_RATE_BY_PROFILE[game.profile]);
  const closing = computeSaleClosing({
    salePrice, capitalRemaining, loanRatePct: loanRate, applyEarlyRepaymentFee: !forced,
    agencyFeePct: forced ? 0 : SALE_PARAMS.agencyFeePct, diagnosticsCost: forced ? 0 : SALE_PARAMS.diagnosticsCost,
    energyAuditCost: !forced && energyAuditRequired(unit, energy, y, m) ? SALE_PARAMS.energyAuditCost : 0,
    proceedingCosts, depositToTransfer: p.status === 'let' ? Number(p.deposit_held_eur) : 0, rentalTaxDue,
    purchase: { price: Number(p.purchase_price), notaryFees: Number(p.notary_fees), works: Number(p.works_financed), yearsHeld },
    gainRules: CAPITAL_GAIN_RULES,
  });

  // Le produit règle d'abord les impayés du joueur ; s'il est négatif, le solde reste dû à la banque.
  const positive = Math.max(0, closing.netProceeds);
  const arrearsCovered = round2(Math.min(opts.arrearsEur, positive));
  const shortfall = closing.netProceeds < 0 ? round2(-closing.netProceeds) : 0;
  const toCredit = round2(positive - arrearsCovered);
  const conv = convertEurosToCoins(p.euro_remainder_cents, toCents(toCredit), EUROS_PER_COIN);
  if (conv.coins > 0) {
    await investcoinsRepository.applyTransaction(userId, conv.coins, 're_exchange_sale_net',
      { domain: RE_DOMAIN, propertyId: p.id, year: y, month: m, kind }, c);
  }

  const message = explain(kind, closing, { discountPct: opts.discountPct, occupiedDiscountPct: opts.occupiedDiscountPct, arrearsCovered, shortfall, coins: conv.coins, yearsHeld, valueBefore: opts.valueBefore });
  if (loanRow) await c.query(`UPDATE re_loans SET status = 'repaid', months_paid = months WHERE id = $1`, [loanRow.id]);
  await c.query(
    `UPDATE re_properties SET status = 'sold', sold_year = $2, sold_month = $3, sold_price = $4, sale_kind = $5, current_rent = 0,
       search_elapsed_months = NULL, asking_rent = NULL, sale_asking_price = NULL, sale_search_elapsed_months = NULL,
       deposit_held_eur = 0, tenant_type = NULL, euro_remainder_cents = $6, tax_base_ytd = 0, sale_planned = FALSE
     WHERE id = $1`, [p.id, y, m, salePrice, kind, conv.remainderCents]);
  await c.query(
    `INSERT INTO re_sales (game_id, property_id, year, month, kind, sale_price, breakdown, net_proceeds, arrears_covered, shortfall, coins_credited, message)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [game.id, p.id, y, m, kind, salePrice, JSON.stringify(closing), closing.netProceeds, arrearsCovered, shortfall, conv.coins, message]);
  const eventKind = kind === 'forced' ? 'forced_sale' : 'property_sold';
  await c.query(`INSERT INTO re_events (game_id, property_id, year, month, kind, message, details) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [game.id, p.id, y, m, eventKind, message, JSON.stringify({ kind, salePrice, netProceeds: closing.netProceeds, coins: conv.coins })]);
  return { closing, arrearsCovered, shortfall, coins: conv.coins, message, eventKind };
}

const askingRatioOk = (r: unknown): number => {
  if (typeof r !== 'number' || !Number.isFinite(r) || r < SALE_PARAMS.askingRatioMin || r > SALE_PARAMS.askingRatioMax) {
    throw new RealEstateError('INVALID_INPUT', `Le prix demandé doit rester entre ${Math.round(SALE_PARAMS.askingRatioMin * 100)} % et ${Math.round(SALE_PARAMS.askingRatioMax * 100)} % de la valeur estimée`);
  }
  return r;
};

const saleInfo = async (p: any, y: number, value: number, asking: number, ratio: number, elapsed: number) => {
  const { tension } = await marketFor(p, y);
  const occupied = p.status === 'let';
  const expectedPrice = round2(asking * (occupied ? 1 - SALE_PARAMS.occupiedDiscountPct / 100 : 1));
  const params = SALE_PARAMS.market;
  return {
    propertyId: p.id, estimatedValue: value, askingPrice: asking, askingRatio: ratio, expectedSalePrice: expectedPrice,
    occupied, occupiedDiscountPct: occupied ? SALE_PARAMS.occupiedDiscountPct : 0,
    tension, expectedMonthsToSell: expectedVacancyMonths(tension, ratio, params),
    expectedMonthsToSellWithCap: expectedCappedVacancyMonths(tension, ratio, params),
    monthlyBuyerProbabilityPct: Math.round(monthlyLetProbability(tension, ratio, params) * 1000) / 10,
    maxMonthsToSell: vacancyCapMonths(tension, ratio, params), monthsSoFar: elapsed,
  };
};

// État de la recherche d'acquéreur d'un bien en vente (calculé côté serveur, sans effet de bord).
export const describeSale = async (p: any, y: number, m: number) => {
  if (p.sale_search_elapsed_months === null || p.sale_search_elapsed_months === undefined) return null;
  const value = await valueOfProperty(p, y, m);
  const asking = Number(p.sale_asking_price);
  const ratio = value > 0 ? Math.round((asking / value) * 1000) / 1000 : 1;
  const info = await saleInfo(p, y, value, asking, ratio, p.sale_search_elapsed_months);
  return { ...info, monthsSoFar: p.sale_search_elapsed_months, askingPrice: asking, askingRatio: ratio };
};

export const realEstateSaleService = {
  // Propositions de prix (85 % à 110 % de la valeur estimée) avec délai attendu : aide à choisir sans rien engager.
  async saleOptions(userId: string, propertyId: unknown) {
    if (!uuidOk(propertyId)) throw new RealEstateError('INVALID_INPUT', 'Identifiant invalide');
    const game = await requireGame(userId);
    const p = (await query('SELECT * FROM re_properties WHERE id = $1 AND game_id = $2', [propertyId, game.id])).rows[0];
    if (!p || p.status === 'sold') throw new RealEstateError('NOT_FOUND', 'Bien introuvable');
    const y = game.simulated_year, m = game.simulated_month;
    const value = await valueOfProperty(p, y, m);
    const options = [];
    for (let r = Math.round(SALE_PARAMS.askingRatioMin * 100); r <= Math.round(SALE_PARAMS.askingRatioMax * 100); r += 5) {
      const ratio = r / 100;
      const i = await saleInfo(p, y, value, round2(value * ratio), ratio, 0);
      options.push({ ratio, askingPrice: i.askingPrice, expectedSalePrice: i.expectedSalePrice, expectedMonthsToSell: i.expectedMonthsToSellWithCap,
        monthlyBuyerProbabilityPct: i.monthlyBuyerProbabilityPct, maxMonthsToSell: i.maxMonthsToSell });
    }
    return { propertyId: p.id, estimatedValue: value, occupied: p.status === 'let', occupiedDiscountPct: p.status === 'let' ? SALE_PARAMS.occupiedDiscountPct : 0,
      current: await describeSale(p, y, m), options };
  },

  // Met un bien en vente à l'amiable. Prix demandé = % de la valeur estimée (borné) ; acquéreur trouvé mois par mois.
  async sell(userId: string, propertyId: unknown, ratioRaw: unknown) {
    if (!uuidOk(propertyId)) throw new RealEstateError('INVALID_INPUT', 'Identifiant invalide');
    const ratio = askingRatioOk(ratioRaw);
    return tx(async (c) => {
      const game = await requireGame(userId, c, true);
      const p = (await c.query('SELECT * FROM re_properties WHERE id = $1 AND game_id = $2 FOR UPDATE', [propertyId, game.id])).rows[0];
      if (!p || p.status === 'sold') throw new RealEstateError('NOT_FOUND', 'Bien introuvable');
      if (p.sale_search_elapsed_months !== null) throw new RealEstateError('INVALID_INPUT', 'Ce bien est déjà en vente : utilise « modifier le prix »');
      const y = game.simulated_year, m = game.simulated_month;
      const value = await valueOfProperty(p, y, m);
      const asking = round2(value * ratio);
      const { tension } = await marketFor(p, y);
      const u = monthlyDraw(game.seed, propertyKey(p), monthTotal(y, m), 'sale');
      const found = isTenantFound(u, tension, ratio, 0, SALE_PARAMS.market);
      const info = await saleInfo(p, y, value, asking, ratio, 0);
      if (found) {
        const occ = p.status === 'let' ? SALE_PARAMS.occupiedDiscountPct : 0;
        const out = await closeSale(c, game, userId, p, 'amicable', round2(asking * (1 - occ / 100)), { arrearsEur: Number(game.arrears_eur ?? 0), occupiedDiscountPct: occ || undefined, valueBefore: value, y, m });
        await c.query('UPDATE re_games SET arrears_eur = $2 WHERE id = $1', [game.id, round2(Number(game.arrears_eur ?? 0) - out.arrearsCovered + out.shortfall)]);
        return { ...info, sold: true, message: out.message, coinsCredited: out.coins };
      }
      await c.query('UPDATE re_properties SET sale_asking_price = $2, sale_search_elapsed_months = 0 WHERE id = $1', [p.id, asking]);
      return { ...info, sold: false, message: `Bien mis en vente à ${fr(asking)} € (${Math.round(ratio * 100)} % de la valeur estimée de ${fr(value)} €).` };
    });
  },

  // Modifier le prix demandé pendant la recherche d'un acquéreur (effet dès le mois suivant, sans « rejouer » le mois).
  async repriceSale(userId: string, propertyId: unknown, ratioRaw: unknown) {
    if (!uuidOk(propertyId)) throw new RealEstateError('INVALID_INPUT', 'Identifiant invalide');
    const ratio = askingRatioOk(ratioRaw);
    return tx(async (c) => {
      const game = await requireGame(userId, c, true);
      const p = (await c.query('SELECT * FROM re_properties WHERE id = $1 AND game_id = $2 FOR UPDATE', [propertyId, game.id])).rows[0];
      if (!p || p.status === 'sold') throw new RealEstateError('NOT_FOUND', 'Bien introuvable');
      if (p.sale_search_elapsed_months === null) throw new RealEstateError('INVALID_INPUT', 'Ce bien n\'est pas en vente');
      const value = await valueOfProperty(p, game.simulated_year, game.simulated_month);
      const asking = round2(value * ratio);
      await c.query('UPDATE re_properties SET sale_asking_price = $2 WHERE id = $1', [p.id, asking]);
      return { ...(await saleInfo(p, game.simulated_year, value, asking, ratio, p.sale_search_elapsed_months)), sold: false,
        message: `Prix demandé ramené à ${fr(asking)} € (${Math.round(ratio * 100)} % de la valeur estimée). Effet dès le mois prochain.` };
    });
  },

  // Vente amiable rapide proposée par la banque quand le joueur est en difficulté : décote plus faible que la vente forcée.
  async distressSell(userId: string, propertyId: unknown) {
    if (!uuidOk(propertyId)) throw new RealEstateError('INVALID_INPUT', 'Identifiant invalide');
    return tx(async (c) => {
      const game = await requireGame(userId, c, true);
      if ((game as any).distress_since_total === null || (game as any).distress_since_total === undefined) {
        throw new RealEstateError('INVALID_INPUT', 'La vente amiable rapide n\'est proposée que lorsque la banque te signale des impayés');
      }
      const p = (await c.query('SELECT * FROM re_properties WHERE id = $1 AND game_id = $2 FOR UPDATE', [propertyId, game.id])).rows[0];
      if (!p || p.status === 'sold') throw new RealEstateError('NOT_FOUND', 'Bien introuvable');
      const y = game.simulated_year, m = game.simulated_month;
      const value = await valueOfProperty(p, y, m);
      const disc = SALE_PARAMS.distress.amicableDiscountPct;
      const arrears = Number(game.arrears_eur ?? 0);
      const out = await closeSale(c, game, userId, p, 'distress_amicable', round2(value * (1 - disc / 100)), { arrearsEur: arrears, discountPct: disc, valueBefore: value, y, m });
      const newArrears = round2(arrears - out.arrearsCovered + out.shortfall);
      await c.query('UPDATE re_games SET arrears_eur = $2, distress_since_total = $3, missed_months = $4 WHERE id = $1',
        [game.id, newArrears, newArrears > 0 ? (game as any).distress_since_total : null, newArrears > 0 ? game.missed_months ?? 0 : 0]);
      return { sold: true, message: out.message, coinsCredited: out.coins, arrearsLeft: newArrears };
    });
  },

  // Rénovation énergétique à la demande : coût au m², gagne des classes (règle de JEU).
  // Aperçu d'une rénovation énergétique, sans effet : coût, classes avant/après, effet sur le loyer, interdiction de location.
  async renovationPreview(userId: string, propertyId: unknown) {
    if (!uuidOk(propertyId)) throw new RealEstateError('INVALID_INPUT', 'Identifiant invalide');
    const game = await requireGame(userId);
    const p = (await query('SELECT * FROM re_properties WHERE id = $1 AND game_id = $2', [propertyId, game.id])).rows[0];
    if (!p || p.status === 'sold') throw new RealEstateError('NOT_FOUND', 'Bien introuvable');
    const energy = String(p.energy_class).trim() as EnergyClass;
    const improved = applyEnergyRenovation(energy, RENOVATION_RULES);
    const costEuros = round2(Number(p.surface_sqm) * SALE_PARAMS.renovationCostPerSqm);
    const coinsCost = Math.ceil(Math.round(costEuros * 100) / (EUROS_PER_COIN * 100));
    const balance = await investcoinsRepository.getBalance(userId);
    let reason: string | null = null;
    if (p.status === 'let') reason = 'Impossible de rénover un logement occupé : attends le départ du locataire.';
    else if (Number(p.pending_works_eur) > 0) reason = 'Paie d\'abord les travaux en attente.';
    else if (improved === energy) reason = `Ce logement est déjà en classe ${energy} : rien à gagner.`;
    let bannedFromYear: number | null = null;
    for (let yr = game.simulated_year; yr <= game.simulated_year + 30; yr++) { if (rentalBannedByEnergy(energy, yr)) { bannedFromYear = yr; break; } }
    // Gain attendu : loyer de marché avant/après (même modèle que la mise en location) et valeur du bien avant/après.
    // Dans le modèle actuel la valeur d'un bien ne dépend pas de sa classe énergétique : le gain de valeur est donc nul (affiché tel quel).
    const y = game.simulated_year, m = game.simulated_month;
    const rentBefore = (await marketFor(p, y)).marketRent;
    const rentAfter = (await marketFor({ ...p, energy_class: improved }, y)).marketRent;
    const rentGainMonthly = round2(rentAfter - rentBefore);
    const valueBefore = await valueOfProperty(p, y, m);
    const valueGain = round2((await valueOfProperty({ ...p, energy_class: improved }, y, m)) - valueBefore);
    const rentGainYearly = round2(rentGainMonthly * 12);
    const paybackYears = rentGainYearly > 0 ? Math.round((costEuros / rentGainYearly) * 10) / 10 : null;
    let verdict: 'no_change' | 'no_direct_gain' | 'profitable_slowly' | 'profitable';
    if (improved === energy) verdict = 'no_change';
    else if (rentGainYearly <= 0 && valueGain <= 0) verdict = 'no_direct_gain';
    else if ((paybackYears ?? Infinity) > 15) verdict = 'profitable_slowly';
    else verdict = 'profitable';
    const factors = RENT_MODEL.energyFactors;
    return {
      rentBefore: round2(rentBefore), rentAfter: round2(rentAfter), rentGainMonthly, rentGainYearly,
      valueBefore, valueGain, paybackYears, verdict,
      propertyId: p.id, currentClass: energy, newClass: improved === energy ? null : improved, canRenovate: reason === null, reason,
      costEuros, coinsCost, balance, affordable: balance >= coinsCost,
      rentEffectPct: Math.round(((factors[improved] / factors[energy]) - 1) * 1000) / 10,
      bannedNow: rentalBannedByEnergy(energy, game.simulated_year), bannedAfter: rentalBannedByEnergy(improved, game.simulated_year),
      currentClassBannedFromYear: bannedFromYear,
      newClassBannedFromYear: (() => { for (let yr = game.simulated_year; yr <= game.simulated_year + 30; yr++) { if (rentalBannedByEnergy(improved, yr)) return yr; } return null; })(),
    };
  },

  async renovate(userId: string, propertyId: unknown) {
    if (!uuidOk(propertyId)) throw new RealEstateError('INVALID_INPUT', 'Identifiant invalide');
    return tx(async (c) => {
      const game = await requireGame(userId, c, true);
      const p = (await c.query('SELECT * FROM re_properties WHERE id = $1 AND game_id = $2 FOR UPDATE', [propertyId, game.id])).rows[0];
      if (!p || p.status === 'sold') throw new RealEstateError('NOT_FOUND', 'Bien introuvable');
      if (p.status === 'let') throw new RealEstateError('INVALID_INPUT', 'Impossible de rénover un logement occupé : attends le départ du locataire');
      if (Number(p.pending_works_eur) > 0) throw new RealEstateError('INVALID_INPUT', 'Paie d\'abord les travaux en attente');
      const energy = String(p.energy_class).trim() as EnergyClass;
      const improved = applyEnergyRenovation(energy, RENOVATION_RULES);
      if (improved === energy) throw new RealEstateError('INVALID_INPUT', `Ce logement est déjà en classe ${energy} : rien à gagner`);
      const cost = round2(Number(p.surface_sqm) * SALE_PARAMS.renovationCostPerSqm);
      const coins = Math.ceil(Math.round(cost * 100) / (EUROS_PER_COIN * 100));
      await investcoinsRepository.applyTransaction(userId, -coins, 're_exchange_renovation', { domain: RE_DOMAIN, propertyId: p.id, euros: cost }, c).catch((e) => {
        if (e?.name === 'InsufficientFundsError') throw new RealEstateError('INSUFFICIENT_FUNDS', 'Solde InvestCoins insuffisant pour la rénovation');
        throw e;
      });
      await c.query('UPDATE re_properties SET energy_class = $2, works_financed = works_financed + $3, extra_invested_eur = extra_invested_eur + $3 WHERE id = $1', [p.id, improved, cost]);
      return { propertyId: p.id, previousClass: energy, newClass: improved, costEuros: cost, coinsCharged: coins };
    });
  },

  async listSales(userId: string) {
    const game = await requireGame(userId);
    const rows = (await query(
      `SELECT s.*, p.title FROM re_sales s JOIN re_properties p ON p.id = s.property_id WHERE s.game_id = $1 ORDER BY s.year DESC, s.month DESC, s.created_at DESC`, [game.id])).rows;
    return { sales: rows.map((r) => ({ propertyId: r.property_id, title: r.title, year: r.year, month: r.month, kind: r.kind, salePrice: Number(r.sale_price),
      netProceeds: Number(r.net_proceeds), arrearsCovered: Number(r.arrears_covered), shortfall: Number(r.shortfall), coinsCredited: r.coins_credited, breakdown: r.breakdown, message: r.message })) };
  },
};

// ── Recherche d'acquéreur à chaque mois (appelée par le règlement mensuel) ──
export async function processSaleSearch(c: PoolClient, game: GameRow, userId: string, propertyId: string, arrearsEur: number, y: number, m: number): Promise<{ sold: boolean; arrearsDelta: number }> {
  const p = (await c.query('SELECT * FROM re_properties WHERE id = $1 FOR UPDATE', [propertyId])).rows[0];
  if (!p || p.status === 'sold' || p.sale_search_elapsed_months === null) return { sold: false, arrearsDelta: 0 };
  const elapsed: number = p.sale_search_elapsed_months;
  const value = await valueOfProperty(p, y, m);
  const asking = Number(p.sale_asking_price);
  const { tension } = await marketFor(p, y);
  const ratio = asking / value;
  const u = monthlyDraw(game.seed, propertyKey(p), monthTotal(y, m) + 1, 'sale');
  if (!isTenantFound(u, tension, ratio, elapsed + 1, SALE_PARAMS.market)) {
    await c.query('UPDATE re_properties SET sale_search_elapsed_months = $2 WHERE id = $1', [p.id, elapsed + 1]);
    return { sold: false, arrearsDelta: 0 };
  }
  const occ = p.status === 'let' ? SALE_PARAMS.occupiedDiscountPct : 0;
  const out = await closeSale(c, game, userId, p, 'amicable', round2(asking * (1 - occ / 100)), { arrearsEur, occupiedDiscountPct: occ || undefined, valueBefore: value, y, m });
  return { sold: true, arrearsDelta: -out.arrearsCovered + out.shortfall };
}

// ── Difficultés de paiement : avertissement, puis vente forcée ──
export async function processDistress(c: PoolClient, game: GameRow, userId: string, arrearsEur: number, missed: number, y: number, m: number): Promise<{ arrearsDelta: number; warnings: { code: string; message: string }[] }> {
  const warnings: { code: string; message: string }[] = [];
  const total = monthTotal(y, m);
  const D = SALE_PARAMS.distress;
  const g: any = game;
  if (arrearsEur <= 0 || missed < D.warningAfterMissedMonths) {
    if (g.distress_since_total !== null && g.distress_since_total !== undefined) await c.query('UPDATE re_games SET distress_since_total = NULL WHERE id = $1', [game.id]);
    g.distress_since_total = null;
    return { arrearsDelta: 0, warnings };
  }
  if (g.distress_since_total === null || g.distress_since_total === undefined) {
    g.distress_since_total = total;
    await c.query('UPDATE re_games SET distress_since_total = $2 WHERE id = $1', [game.id, total]);
    const msg = `Ta banque te signale ${fr(arrearsEur)} € d'impayés depuis ${missed} mois. Elle te propose une VENTE AMIABLE RAPIDE d'un de tes biens (décote de ${D.amicableDiscountPct} % seulement). Sans règlement dans les ${D.graceMonths} mois, elle engagera une VENTE FORCÉE (décote de ${D.forcedDiscountPct} % plus frais de procédure) sur le bien qui porte le plus de dette.`;
    await c.query(`INSERT INTO re_events (game_id, property_id, year, month, kind, message, details)
                   SELECT $1, id, $2, $3, 'distress_warning', $4, '{}' FROM re_properties WHERE game_id = $1 AND status <> 'sold' ORDER BY created_at LIMIT 1`, [game.id, y, m, msg]);
    warnings.push({ code: 'DISTRESS_WARNING', message: msg });
    return { arrearsDelta: 0, warnings };
  }
  if (total < g.distress_since_total + D.graceMonths) return { arrearsDelta: 0, warnings };

  // Vente forcée : le bien qui porte le plus de dette.
  const props = (await c.query(`SELECT p.*, l.principal AS l_principal, l.months AS l_months, l.months_paid AS l_paid, l.annual_rate_pct, l.insurance_rate_pct, l.status AS l_status
                                FROM re_properties p LEFT JOIN re_loans l ON l.id = p.loan_id WHERE p.game_id = $1 AND p.status <> 'sold' ORDER BY p.created_at`, [game.id])).rows;
  if (props.length === 0) return { arrearsDelta: 0, warnings };
  let target = props[0], best = -1;
  for (const p of props) {
    const debt = p.loan_id && p.l_status === 'active'
      ? remainingBalance(scheduleOf({ principal: p.l_principal, annual_rate_pct: p.annual_rate_pct, months: p.l_months, insurance_rate_pct: p.insurance_rate_pct }).rows, Number(p.l_principal), Number(p.l_paid)) : 0;
    if (debt > best) { best = debt; target = p; }
  }
  const p = (await c.query('SELECT * FROM re_properties WHERE id = $1 FOR UPDATE', [target.id])).rows[0];
  const value = await valueOfProperty(p, y, m);
  const out = await closeSale(c, game, userId, p, 'forced', round2(value * (1 - D.forcedDiscountPct / 100)), { arrearsEur, discountPct: D.forcedDiscountPct, valueBefore: value, y, m });
  await c.query('UPDATE re_games SET distress_since_total = $2 WHERE id = $1', [game.id, total]); // nouveau délai avant une éventuelle autre vente
  g.distress_since_total = total;
  warnings.push({ code: 'FORCED_SALE', message: out.message });
  return { arrearsDelta: -out.arrearsCovered + out.shortfall, warnings };
}

// ── Performance et classement (comparaison à année simulée égale) ──
export async function wealthMetrics(db: { query: PoolClient['query'] }, game: GameRow) {
  const q = (sql: string, params: any[]) => (db.query as any)(sql, params);
  const props = (await q(
    `SELECT p.*, l.principal AS l_principal, l.annual_rate_pct AS l_rate, l.months AS l_months, l.insurance_rate_pct AS l_ins, l.months_paid AS l_paid, l.status AS l_status, l.upfront_fees AS l_fees
     FROM re_properties p LEFT JOIN re_loans l ON l.id = p.loan_id WHERE p.game_id = $1`, [game.id])).rows;
  const y = game.simulated_year, m = game.simulated_month;
  let invested = 0, equity = 0;
  for (const p of props) {
    invested += Number(p.down_payment) + Number(p.l_fees ?? 0) + Number(p.extra_invested_eur);
    if (p.status !== 'sold') {
      const value = await valueOfProperty(p, y, m);
      const debt = p.loan_id && p.l_status === 'active'
        ? remainingBalance(scheduleOf({ principal: p.l_principal, annual_rate_pct: p.l_rate, months: p.l_months, insurance_rate_pct: p.l_ins }).rows, Number(p.l_principal), Number(p.l_paid)) : 0;
      equity += value - debt;
    }
  }
  const cash = Number((await q('SELECT COALESCE(SUM(net_cash_flow), 0) AS s FROM re_statements WHERE game_id = $1', [game.id])).rows[0].s);
  const sold = (await q('SELECT COALESCE(SUM(net_proceeds), 0) AS s FROM re_sales WHERE game_id = $1', [game.id])).rows[0].s;
  return { investedEuros: round2(invested), equity: round2(equity), cumulativeCashFlow: round2(cash), saleNetProceeds: round2(Number(sold)),
    performancePct: computePerformancePctFromEuros({ equity, cumulativeCashFlow: cash + Number(sold), invested }) };
}

export async function snapshotLeaderboard(c: PoolClient, game: GameRow, userId: string): Promise<void> {
  const w = await wealthMetrics(c, game);
  await leaderboardRepository.upsertSnapshot(c, {
    userId, mode: 'accelerated', domain: RE_DOMAIN, year: game.simulated_year,
    performancePct: w.performancePct, capitalCommitted: round2(w.investedEuros / EUROS_PER_COIN),
  });
}

export const getRealEstateLeaderboard = async (userId: string, yearRaw: unknown) => {
  const game = await requireGame(userId);
  let year = game.simulated_year;
  if (yearRaw !== undefined && yearRaw !== '') {
    year = Number(yearRaw);
    if (!Number.isInteger(year) || year < source().minYear || year > source().maxYear) throw new RealEstateError('INVALID_INPUT', 'Année invalide');
  }
  const board = await leaderboardRepository.getBoard({ mode: 'accelerated', domain: RE_DOMAIN, year, minCapital: MIN_RANKED_CAPITAL, limit: LEADERBOARD_SIZE, callerId: userId });
  // Ma performance détaillée (calculée côté serveur) : visible même si je ne suis pas encore classé.
  const w = await wealthMetrics({ query } as any, game);
  const investedCoins = round2(w.investedEuros / EUROS_PER_COIN);
  const mine = { ...w, investedCoins, ranked: investedCoins >= MIN_RANKED_CAPITAL, minCapitalCoins: MIN_RANKED_CAPITAL };
  return { domain: RE_DOMAIN, year, minCapital: MIN_RANKED_CAPITAL, ...board, mine };
};
