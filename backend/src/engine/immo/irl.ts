// Fonctions pures sur la série de l'IRL (trimestrielle) : date de publication, dernière valeur publiée (aucun futur), variations, recalage d'un loyer. Aucune base, aucun réseau.
import { IRL_PUBLICATION_DAY } from '../../config/irlRules';

export interface IrlPoint { year: number; quarter: 1 | 2 | 3 | 4; value: number }
export const quarterIndex = (p: { year: number; quarter: number }): number => p.year * 4 + (p.quarter - 1);

// Jour (AAAA-MM-JJ) à partir duquel la valeur d'un trimestre est utilisable : IRL_PUBLICATION_DAY du mois suivant la fin du trimestre.
export const publishedOn = (p: { year: number; quarter: number }): string => {
  const month = p.quarter * 3 + 1;                                  // T1 -> avril (4), T2 -> juillet (7), T3 -> octobre (10), T4 -> janvier (13 -> 1 de l'année suivante)
  const y = month > 12 ? p.year + 1 : p.year; const m = month > 12 ? 1 : month;
  return `${y}-${String(m).padStart(2, '0')}-${String(IRL_PUBLICATION_DAY).padStart(2, '0')}`;
};

// Dernière valeur PUBLIÉE au jour donné (jamais une valeur dont la publication est postérieure) ; null si aucune.
export const latestPublished = (series: readonly IrlPoint[], day: string): IrlPoint | null => {
  let best: IrlPoint | null = null;
  for (const p of series) if (publishedOn(p) <= day && (!best || quarterIndex(p) > quarterIndex(best))) best = p;
  return best;
};

export const valueOf = (series: readonly IrlPoint[], year: number, quarter: number): number | null => series.find((p) => p.year === year && p.quarter === quarter)?.value ?? null;

// Variation annuelle (%) de l'IRL d'un trimestre : valeur ÷ valeur du même trimestre un an plus tôt. null si l'une des deux manque.
export const annualChangePct = (series: readonly IrlPoint[], year: number, quarter: number): number | null => {
  const a = valueOf(series, year, quarter); const b = valueOf(series, year - 1, quarter);
  return a !== null && b !== null && b > 0 ? Math.round((a / b - 1) * 10000) / 100 : null;
};

// Recalage d'un loyer sur l'évolution réelle de l'IRL : loyer × IRL(date de jeu) ÷ IRL(référence). Jamais un chiffre inventé : un rapport de deux valeurs publiées.
export const recalibrate = (value: number, irlAtDate: number, irlReference: number): number => Math.round(value * (irlAtDate / irlReference) * 100) / 100;
export const changePct = (irlAtDate: number, irlReference: number): number => Math.round((irlAtDate / irlReference - 1) * 10000) / 100;
