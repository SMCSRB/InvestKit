import { createRng, hashString } from '../utils/seededRandom';
import { source, RealEstateError } from './realEstateService';
import {
  estimateMarketRent, buildSchedule, round2, valueFromMarket, interpolateByMonth, applyRenovation, LoanSchedule, Condition, EnergyClass,
} from '../engine/immo';
import { RENT_MODEL, PARKING_RULES, RENOVATION_RULES } from '../config/immoRules';

// Petits utilitaires partagés par les services de la vie du bien et des reventes.
export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
export const uuidOk = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);
export const fr = (x: number): string => x.toFixed(2).replace('.', ',');

// La clé du bien est STABLE (annonce d'origine + date d'achat), pas l'identifiant technique : deux parties
// de même graine qui font les mêmes choses obtiennent exactement les mêmes résultats.
export const propertyKey = (p: { listing_id: string; purchase_year: number; purchase_month: number }): string =>
  `${p.listing_id}:${p.purchase_year}:${p.purchase_month}`;

// Un tirage par (graine, clé du bien, mois) : reproductible, indépendant de l'historique des appels.
export const monthlyDraw = (seed: string, key: string, monthTotalValue: number, kind = 'search'): number =>
  createRng(hashString(`${seed}:${key}:${kind}:${monthTotalValue}`))();

export const marketFor = async (p: any, year: number) => {
  const [market, nbhs] = await Promise.all([source().getMarket(p.city_id, year), source().listNeighborhoods(p.city_id)]);
  const nbh = nbhs.find((n) => n.id === p.neighborhood_id);
  if (!market || !nbh) throw new RealEstateError('NOT_FOUND', 'Marché introuvable pour ce bien');
  const rent = estimateMarketRent(
    { surfaceSqm: Number(p.surface_sqm), cityRentPerSqm: market.rentPerSqm, neighborhoodRentMultiplier: nbh.rentMultiplier,
      condition: p.condition as Condition, energyClass: String(p.energy_class).trim() as EnergyClass,
      unitRentFactor: p.property_type === 'parking' ? PARKING_RULES.rentFactor : 1 },
    RENT_MODEL
  );
  const boost = p.property_type === 'parking' ? PARKING_RULES.tensionBoost : 0;
  return { marketRent: rent.monthlyRent, tension: round2(clamp(market.rentalTension + nbh.tensionOffset + boost, 0, 1)) };
};

export const scheduleOf = (loan: any): LoanSchedule =>
  buildSchedule({
    principal: Number(loan.principal), annualRatePct: Number(loan.annual_rate_pct), months: Number(loan.months),
    insurance: { annualRatePct: Number(loan.insurance_rate_pct), basis: 'initial' },
  });

// Valeur d'un bien à une date (année, mois) : prix payé × évolution du marché de la ville, ramenée à
// l'état actuel, interpolée mois par mois entre deux années.
const marketValueOf = async (p: any, y: number, m: number): Promise<number> => {
  const at = async (year: number) => {
    const now = await source().estimateValue({ cityId: p.city_id, neighborhoodId: p.neighborhood_id, type: p.property_type, surfaceSqm: Number(p.surface_sqm), condition: p.condition, energyClass: String(p.energy_class).trim() as EnergyClass }, year);
    const then = await source().estimateValue({ cityId: p.city_id, neighborhoodId: p.neighborhood_id, type: p.property_type, surfaceSqm: Number(p.surface_sqm), condition: p.initial_condition, energyClass: String(p.initial_energy_class ?? p.energy_class).trim() as EnergyClass }, p.purchase_year);
    return valueFromMarket(Number(p.purchase_price), now, then);
  };
  const thisYear = await at(y);
  const nextYear = y + 1 <= source().maxYear ? await at(y + 1) : null;
  return interpolateByMonth(thisYear, nextYear, m);
};

// Valeur d'un bien. Un bien « à rénover » acheté sans expertise, dont les travaux annoncés sont financés mais dont les travaux cachés restent à payer,
// vaut selon la part de travaux déjà payée : valeur « non rénové » + (valeur rénovée − valeur « non rénové ») × part payée (décision d'Andreja :
// le joueur n'est pas pénalisé deux fois). Une fois tous les travaux payés, le bien est rénové et vaut sa valeur rénovée.
export const valueOfProperty = async (p: any, y: number, m: number): Promise<number> => {
  const asIs = await marketValueOf(p, y, m);
  const spent = Number(p.works_financed ?? 0);
  const pending = Number(p.pending_works_eur ?? 0);
  if (p.condition !== 'to_renovate' || !(pending > 0) || !(spent > 0)) return asIs;
  const after = applyRenovation('to_renovate', String(p.energy_class).trim() as EnergyClass, RENOVATION_RULES);
  const renovated = await marketValueOf({ ...p, condition: after.condition, energy_class: after.energyClass }, y, m);
  const progress = spent / (spent + pending);
  return round2(Math.max(asIs, asIs + (renovated - asIs) * progress));
};
