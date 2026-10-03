// Taux de change : fonctions PURES (pas de réseau, pas d'horloge système, pas de base de données).
// Le taux utilisé est exprimé en « unités de la devise pour 1 euro » (convention de la BCE : 1 EUR = 1,0831 USD → 1,0831).
// Comme 1 InvestCoin = 1 €, un montant en dollars vaut montant ÷ taux InvestCoins.

export interface FxRate { day: string; perEur: number }          // day : AAAA-MM-JJ (UTC)
export interface PickedRate { perEur: number; day: string; staleDays: number }

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;
const dayMs = (d: string): number => Date.parse(`${d}T00:00:00Z`);
export const isDay = (d: unknown): d is string => typeof d === 'string' && DAY_RE.test(d) && !Number.isNaN(dayMs(d)) && new Date(dayMs(d)).toISOString().slice(0, 10) === d;
export const dayOf = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

// Dernier taux publié AU PLUS TARD ce jour-là et pas plus vieux que maxStaleDays (week-ends et jours fériés : on reprend le jour ouvré précédent).
// `rates` peut être dans n'importe quel ordre. Renvoie null si aucun taux utilisable : la conversion est alors indisponible.
export const pickRate = (rates: FxRate[], day: string, maxStaleDays: number): PickedRate | null => {
  if (!isDay(day)) return null;
  const target = dayMs(day);
  let best: FxRate | null = null;
  for (const r of rates) {
    if (!(r.perEur > 0) || !Number.isFinite(r.perEur) || !isDay(r.day)) continue;
    const t = dayMs(r.day);
    if (t > target) continue;                                   // jamais un taux postérieur à la date de jeu
    if (target - t > maxStaleDays * DAY_MS) continue;
    if (!best || t > dayMs(best.day)) best = r;
  }
  return best ? { perEur: best.perEur, day: best.day, staleDays: Math.round((target - dayMs(best.day)) / DAY_MS) } : null;
};

// Montant en devise → InvestCoins (flottant : l'arrondi est décidé par l'appelant, toujours contre le joueur).
export const toCoins = (amount: number, perEur: number): number => amount / perEur;
export const fromCoins = (coins: number, perEur: number): number => coins * perEur;

// ── Lecture des fichiers de la BCE ───────────────────────────────────────────
// Deux formats acceptés :
//  1) API de données de la BCE (SDMX) en CSV :  « …,TIME_PERIOD,OBS_VALUE,… »  (une ligne par jour, une seule devise)
//  2) fichier historique « eurofxref-hist.csv » : « Date,USD,JPY,… »  (une colonne par devise ; « N/A » les jours sans valeur)
// Les lignes invalides (date impossible, valeur vide, « N/A », « . », nulle ou négative) sont IGNORÉES et comptées : on n'invente rien.
export interface ParsedRates { rates: FxRate[]; rejected: number }

const splitCsv = (line: string): string[] => {
  const out: string[] = []; let cur = ''; let q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === ',' && !q) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim());
};

export const parseEcbCsv = (text: string, currency = 'USD'): ParsedRates => {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
  if (!lines.length) return { rates: [], rejected: 0 };
  const header = splitCsv(lines[0]).map((h) => h.toUpperCase());
  let iDay = header.indexOf('TIME_PERIOD'), iVal = header.indexOf('OBS_VALUE');
  if (iDay < 0 || iVal < 0) { iDay = header.indexOf('DATE'); iVal = header.indexOf(currency.toUpperCase()); }
  if (iDay < 0 || iVal < 0) throw new Error(`Format de fichier BCE non reconnu (colonnes attendues : TIME_PERIOD et OBS_VALUE, ou Date et ${currency}).`);
  const byDay = new Map<string, number>();
  let rejected = 0;
  for (const line of lines.slice(1)) {
    const cells = splitCsv(line);
    const day = cells[iDay], raw = cells[iVal];
    const v = Number(raw);
    if (!isDay(day) || raw === undefined || raw === '' || !Number.isFinite(v) || !(v > 0)) { rejected++; continue; }
    byDay.set(day, v);                                          // un jour en double : la dernière ligne gagne
  }
  const rates = [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([day, perEur]) => ({ day, perEur }));
  return { rates, rejected };
};
