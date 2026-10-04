// Lecture des fichiers de la « Carte des loyers » (ANIL) : un fichier CSV par série (appartements, T1-T2, T3 et plus, maisons), une ligne par commune (Paris, Lyon, Marseille : par arrondissement).
// Fonctions pures : aucun accès réseau, disque ni base. Rien n'est jamais deviné : une colonne indispensable absente refuse le fichier en entier (en listant les colonnes trouvées).
// FORMAT SUPPOSÉ [connu, à confirmer au premier import] : colonnes INSEE_C, LIBGEO, loypredm2, lwr.IPm2, upr.IPm2, TYPPRED, nbobs_com, nbobs_mail ; séparateur « ; » ou « , », virgule décimale possible.
import { CsvStream, decodeText } from '../dvf/csv';
import { canonHeader } from '../dvf/format';
import { RENT_BOUNDS, RentGroup } from '../../../config/rentMarketRules';

export type EstimateKind = 'commune' | 'maille';
export interface RentRow { commune: string; group: RentGroup; rent: number; low: number; high: number; kind: EstimateKind; observations: number | null }
export interface RentParse { ok: boolean; errors: string[]; rows: RentRow[]; columns: string[]; outsideScope: number; read: number }

const ALIASES: Record<string, string[]> = {
  commune: ['insee_c', 'insee', 'codgeo', 'code_commune', 'code_insee', 'depcom'],
  rent: ['loypredm2', 'loyer_predit', 'loypred', 'loyer_m2'],
  low: ['lwr_ipm2', 'loyer_bas', 'borne_basse'],
  high: ['upr_ipm2', 'loyer_haut', 'borne_haute'],
  kind: ['typpred', 'type_estimation', 'type_prediction'],
  obs: ['nbobs_com', 'nb_obs_com', 'nombre_observations'],
};
const REQUIRED = ['commune', 'rent', 'low', 'high', 'kind'] as const;
const MAX_ERRORS = 20;

const num = (s: string | undefined): number | null => {
  if (s === undefined) return null;
  const t = s.trim().replace(/[\s  ]/g, '').replace(',', '.');
  if (t === '' || t.toUpperCase() === 'NA') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};
export const communeCode = (raw: string): string => { const t = raw.trim().toUpperCase(); return /^\d{1,4}$/.test(t) ? t.padStart(5, '0') : t; };

export const parseAnilCsv = (input: string | Buffer, group: RentGroup, wanted: ReadonlySet<string>): RentParse => {
  const errors: string[] = [];
  const fail = (m: string) => { if (errors.length < MAX_ERRORS) errors.push(m); };
  const text = typeof input === 'string' ? input : decodeText(input);
  const st = new CsvStream();
  const records = [...st.push(text), ...st.end()];
  if (!records.length) return { ok: false, errors: ['Fichier vide.'], rows: [], columns: [], outsideScope: 0, read: 0 };
  const columns = records[0].map((h) => canonHeader(h));
  const at: Record<string, number> = {};
  for (const [key, names] of Object.entries(ALIASES)) { const i = columns.findIndex((c) => names.includes(c)); if (i >= 0) at[key] = i; }
  const missing = REQUIRED.filter((k) => at[k] === undefined);
  if (missing.length) return { ok: false, errors: [`Colonnes indispensables absentes : ${missing.map((k) => ALIASES[k][0]).join(', ')}. Colonnes trouvées : ${columns.join(', ')}`], rows: [], columns, outsideScope: 0, read: 0 };
  const rows: RentRow[] = []; const seen = new Set<string>(); let outside = 0;
  records.slice(1).forEach((r, k) => {
    const line = k + 2;
    const commune = communeCode(r[at.commune] ?? '');
    if (!commune) { fail(`ligne ${line} : code commune vide.`); return; }
    if (!wanted.has(commune)) { outside++; return; }                         // hors des 12 villes : ignoré, pas une erreur
    const rent = num(r[at.rent]); const low = num(r[at.low]); const high = num(r[at.high]);
    if (rent === null || low === null || high === null) { fail(`ligne ${line} (${commune}) : loyer ou fourchette illisible.`); return; }
    if (rent < RENT_BOUNDS.minPerM2 || rent > RENT_BOUNDS.maxPerM2) { fail(`ligne ${line} (${commune}) : loyer de ${rent} €/m² hors bornes plausibles (${RENT_BOUNDS.minPerM2} à ${RENT_BOUNDS.maxPerM2}).`); return; }
    if (!(low > 0) || low > rent + 1e-9 || high < rent - 1e-9) { fail(`ligne ${line} (${commune}) : fourchette incohérente (${low} / ${rent} / ${high}).`); return; }
    const rawKind = (r[at.kind] ?? '').trim().toLowerCase();
    const kind: EstimateKind | null = rawKind === 'commune' ? 'commune' : rawKind.includes('maille') ? 'maille' : null;
    if (!kind) { fail(`ligne ${line} (${commune}) : type d'estimation inconnu « ${r[at.kind]} ».`); return; }
    if (seen.has(commune)) { fail(`ligne ${line} : commune ${commune} en double dans la série.`); return; }
    seen.add(commune);
    const obs = at.obs !== undefined ? num(r[at.obs]) : null;
    rows.push({ commune, group, rent: Math.round(rent * 100) / 100, low: Math.round(low * 100) / 100, high: Math.round(high * 100) / 100, kind, observations: obs !== null && Number.isInteger(obs) && obs >= 0 ? obs : null });
  });
  return { ok: errors.length === 0, errors, rows: errors.length ? [] : rows, columns, outsideScope: outside, read: records.length - 1 };
};

// Série d'après le NOM du fichier (pred-app-…, pred-app12-…, pred-app3-…, pred-mai-…). Ambigu ou inconnu : null (le script le dit, il ne devine pas).
export const groupOfFileName = (name: string): RentGroup | null => {
  const n = name.toLowerCase();
  if (/app12|t1-?t2|t1t2/.test(n)) return 't12';
  if (/app3|t3/.test(n)) return 't3';
  if (/mai|maison|house/.test(n)) return 'house';
  if (/app/.test(n)) return 'all';
  return null;
};
