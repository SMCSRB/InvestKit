// Fonctions pures sur la série de l'IRL (trimestrielle) : date de publication, dernière valeur publiée (aucun futur), variations, recalage d'un loyer. Aucune base, aucun réseau.
import { IRL_PUBLICATION_DAY, IRL_SHIELD } from '../../config/irlRules';

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

// ── Révision annuelle d'un loyer à la date anniversaire du bail ──
// Mois de jeu (total = année × 12 + mois) en AAAA-MM et en premier jour du mois.
export const monthKey = (total: number): string => `${Math.floor((total - 1) / 12)}-${String(((total - 1) % 12) + 1).padStart(2, '0')}`;
export const monthStart = (total: number): string => `${monthKey(total)}-01`;

export interface LeaseRevision { pct: number; rawPct: number; capped: boolean; referenceQuarter: string; previousQuarter: string }

// Trimestre de référence = dernier IRL PUBLIÉ au début du bail. À chaque anniversaire, la hausse est le rapport entre l'IRL de ce même trimestre cette année et celui de l'an dernier
// (le loyer a été fixé, ou révisé, avec la valeur de l'an dernier). Renvoie null si une valeur manque ou n'est pas encore publiée : on n'invente jamais une variation.
// Bouclier : à partir de IRL_SHIELD.fromMonth jusqu'à toMonth (mois de l'anniversaire), la hausse est plafonnée (voir config/irlRules.ts).
export const leaseRevision = (series: readonly IrlPoint[], leaseStartTotal: number, anniversaryTotal: number): LeaseRevision | null => {
  const ref = latestPublished(series, monthStart(leaseStartTotal));
  const years = Math.floor((anniversaryTotal - leaseStartTotal) / 12);
  if (!ref || years < 1) return null;
  const now = { year: ref.year + years, quarter: ref.quarter };
  const before = { year: now.year - 1, quarter: ref.quarter };
  const a = valueOf(series, now.year, now.quarter); const b = valueOf(series, before.year, before.quarter);
  if (a === null || b === null || publishedOn(now) > monthStart(anniversaryTotal)) return null;
  const rawPct = changePct(a, b);
  const month = monthKey(anniversaryTotal);
  const capped = month >= IRL_SHIELD.fromMonth && month <= IRL_SHIELD.toMonth && rawPct > IRL_SHIELD.capPct;
  return { pct: capped ? IRL_SHIELD.capPct : rawPct, rawPct, capped, referenceQuarter: `${now.year}-T${now.quarter}`, previousQuarter: `${before.year}-T${before.quarter}` };
};
