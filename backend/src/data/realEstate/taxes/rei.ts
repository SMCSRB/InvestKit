// Lecture du fichier CSV de taxe foncière par commune (publié par Terralyse sur data.gouv.fr, Licence Ouverte 2.0, « Source : Terralyse »), téléchargé par Andreja après lecture de la page. Fonction pure : aucun accès réseau, disque ni base.
// FORMAT SUPPOSÉ [à confirmer au premier import] : une ligne par commune et par année, avec un code commune, une année, un taux COMMUNAL, un taux INTERCOMMUNAL et, en plus, un taux de TEOM. Les colonnes sont reconnues par leur nom (voir REI_COLUMNS).
// Taux global de taxe foncière = communal + intercommunal. La TEOM (récupérable sur le locataire) n'entre JAMAIS dans le taux global : elle est gardée à part.
// Si une colonne obligatoire manque, ou si le fichier n'a pas cette forme : REFUSÉ en entier, avec la liste des colonnes trouvées. Seules les communes des villes du jeu sont retenues.
import { CsvStream, decodeText } from '../dvf/csv';
import { PROPERTY_TAX_BOUNDS, REI_COLUMNS, TAX_COMMUNE_BY_CITY } from '../../../config/propertyTaxRules';
import { DVF_CITIES } from '../dvf/cities';

export interface TaxRateRow { commune: string; year: number; communalPct: number; intercommunalPct: number; ratePct: number; teomPct: number | null }
export interface ReiParse {
  ok: boolean; errors: string[]; rows: TaxRateRow[]; linesRead: number; columns: string[];
  communesInFile: number;              // communes distinctes du fichier (Terralyse en annonce 5 206)
  emptyIntercommunal: string[];        // « commune|année » dont le taux intercommunal est vide (compté 0) : à signaler
}
const MAX_ERRORS = 20;

export const normalizeColumn = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/^﻿/, '').trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
export const taxCommuneOf = (cityId: string): string => TAX_COMMUNE_BY_CITY[cityId] ?? DVF_CITIES.find((c) => c.id === cityId)!.codes[0];
export const TAX_COMMUNES: readonly string[] = DVF_CITIES.map((c) => taxCommuneOf(c.id));

const num = (s: string | undefined): number | null => {
  if (s === undefined) return null;
  const t = s.trim().replace(/[\s  ]/g, '').replace(/%/g, '').replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};
const round4 = (n: number): number => Math.round(n * 10000) / 10000;

export const parseReiCsv = (input: string | Buffer): ReiParse => {
  const errors: string[] = [];
  const fail = (m: string) => { if (errors.length < MAX_ERRORS) errors.push(m); };
  const text = typeof input === 'string' ? input : decodeText(input);
  const st = new CsvStream();
  const records = [...st.push(text), ...st.end()];
  const empty = (columns: string[], linesRead: number): ReiParse => ({ ok: false, errors, rows: [], linesRead, columns, communesInFile: 0, emptyIntercommunal: [] });
  if (!records.length) { fail('fichier vide.'); return empty([], 0); }
  const header = records[0].map(normalizeColumn);
  const find = (names: readonly string[]): number => header.findIndex((h) => names.includes(h));
  const iCom = find(REI_COLUMNS.commune); const iYear = find(REI_COLUMNS.year); const iCommunal = find(REI_COLUMNS.communal); const iInter = find(REI_COLUMNS.intercommunal); const iTeom = find(REI_COLUMNS.teom);
  const missing = [['code commune', iCom], ['année', iYear], ['taux communal de taxe foncière bâtie', iCommunal], ['taux intercommunal de taxe foncière bâtie', iInter]].filter(([, i]) => i === -1).map(([n]) => n as string);
  if (missing.length) {
    fail(`colonne(s) introuvable(s) : ${missing.join(', ')}. Colonnes trouvées : ${header.join(' | ')}. Le format du fichier n'est pas celui supposé : rien n'est deviné.`);
    return empty(header, records.length);
  }
  const wanted = new Set(TAX_COMMUNES); const byKey = new Map<string, TaxRateRow>(); const emptyInter: string[] = []; const allCommunes = new Set<string>();
  records.slice(1).forEach((r, k) => {
    const line = k + 2;
    const commune = (r[iCom] ?? '').trim().padStart(5, '0');
    if (commune !== '00000') allCommunes.add(commune);
    if (!wanted.has(commune)) return;
    const year = Number((r[iYear] ?? '').trim());
    if (!Number.isInteger(year) || year < PROPERTY_TAX_BOUNDS.firstYear || year > 2100) { fail(`ligne ${line} : année illisible (${r[iYear]}).`); return; }
    const communal = num(r[iCommunal]);
    if (communal === null) { fail(`ligne ${line} : taux communal illisible pour ${commune} en ${year} (${r[iCommunal]}).`); return; }
    const rawInter = (r[iInter] ?? '').trim(); let inter = 0;
    if (rawInter === '') emptyInter.push(`${commune}|${year}`);
    else { const v = num(rawInter); if (v === null) { fail(`ligne ${line} : taux intercommunal illisible pour ${commune} en ${year} (${rawInter}).`); return; } inter = v; }
    let teom: number | null = null;
    if (iTeom >= 0 && (r[iTeom] ?? '').trim() !== '') { teom = num(r[iTeom]); if (teom === null) { fail(`ligne ${line} : taux de TEOM illisible pour ${commune} en ${year} (${r[iTeom]}).`); return; } }
    if (communal > PROPERTY_TAX_BOUNDS.maxPartPct || inter > PROPERTY_TAX_BOUNDS.maxPartPct || (teom !== null && teom > PROPERTY_TAX_BOUNDS.maxTeomPct)) { fail(`ligne ${line} : taux hors bornes plausibles pour ${commune} en ${year}.`); return; }
    const global = round4(communal + inter);
    if (global < PROPERTY_TAX_BOUNDS.minRatePct || global > PROPERTY_TAX_BOUNDS.maxRatePct) { fail(`ligne ${line} : taux global de ${global} % hors bornes plausibles (${PROPERTY_TAX_BOUNDS.minRatePct} à ${PROPERTY_TAX_BOUNDS.maxRatePct}).`); return; }
    const key = `${commune}|${year}`; const known = byKey.get(key);
    if (known && (known.ratePct !== global || known.teomPct !== teom)) { fail(`ligne ${line} : deux taux différents pour ${commune} en ${year}.`); return; }
    byKey.set(key, { commune, year, communalPct: communal, intercommunalPct: inter, ratePct: global, teomPct: teom });
  });
  const rows = [...byKey.values()].sort((a, b) => a.commune.localeCompare(b.commune) || a.year - b.year);
  const found = new Set(rows.map((r) => r.commune));
  const absent = TAX_COMMUNES.filter((c) => !found.has(c));
  if (!errors.length && absent.length) fail(`commune(s) absente(s) du fichier : ${absent.join(', ')} (code erroné, ou commune non couverte par ce jeu de données). Rien n'est deviné : fichier refusé.`);
  const ok = errors.length === 0;
  return { ok, errors, rows: ok ? rows : [], linesRead: records.length, columns: header, communesInFile: allCommunes.size, emptyIntercommunal: ok ? [...new Set(emptyInter)].sort() : [] };
};
