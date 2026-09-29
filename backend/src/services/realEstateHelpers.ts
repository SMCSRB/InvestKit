import { createRng, hashString } from '../utils/seededRandom';
import { source, RealEstateError } from './realEstateService';
import {
  estimateMarketRent, buildSchedule, round2, valueFromMarket, interpolateByMonth, LoanSchedule, Condition, EnergyClass,
} from '../engine/immo';
import { RENT_MODEL } from '../config/immoRules';

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
      condition: p.condition as Condition, energyClass: String(p.energy_class).trim() as EnergyClass },
    RENT_MODEL
  );
  return { marketRent: rent.monthlyRent, tension: round2(clamp(market.rentalTension + nbh.tensionOffset, 0, 1)) };
};

export const scheduleOf = (loan: any): LoanSchedule =>
  buildSchedule({
    principal: Number(loan.principal), annualRatePct: Number(loan.annual_rate_pct), months: Number(loan.months),
    insurance: { annualRatePct: Number(loan.insurance_rate_pct), basis: 'initial' },
  });

// Valeur d'un bien à une date (année, mois) : prix payé × évolution du marché de la ville, ramenée à
// l'état actuel, interpolée mois par mois entre deux années.
export const valueOfProperty = async (p: any, y: number, m: number): Promise<number> => {
  const at = async (year: number) => {
    const now = await source().estimateValue({ cityId: p.city_id, neighborhoodId: p.neighborhood_id, type: p.property_type, surfaceSqm: Number(p.surface_sqm), condition: p.condition, energyClass: String(p.energy_class).trim() as EnergyClass }, year);
    const then = await source().estimateValue({ cityId: p.city_id, neighborhoodId: p.neighborhood_id, type: p.property_type, surfaceSqm: Number(p.surface_sqm), condition: p.initial_condition, energyClass: String(p.initial_energy_class ?? p.energy_class).trim() as EnergyClass }, p.purchase_year);
    return valueFromMarket(Number(p.purchase_price), now, then);
  };
  const thisYear = await at(y);
  const nextYear = y + 1 <= source().maxYear ? await at(y + 1) : null;
  return interpolateByMonth(thisYear, nextYear, m);
};
