// Lecture du fichier CSV de la DGFiP (taux de taxe foncière par commune), téléchargé par Andreja après lecture de la page. Fonction pure : aucun accès réseau, disque ni base.
// FORMAT SUPPOSÉ [à confirmer au premier import] : une ligne par commune et par année, avec un code commune, une année et un taux global de taxe foncière bâtie (en %). Les colonnes sont reconnues par leur nom (voir REI_COLUMNS).
// Si une colonne manque, ou si le fichier n'a pas cette forme : REFUSÉ en entier, avec la liste des colonnes trouvées. Seules les communes des villes du jeu sont retenues.
import { CsvStream, decodeText } from '../dvf/csv';
import { PROPERTY_TAX_BOUNDS, REI_COLUMNS, TAX_COMMUNE_BY_CITY } from '../../../config/propertyTaxRules';
import { DVF_CITIES } from '../dvf/cities';

export interface TaxRateRow { commune: string; year: number; ratePct: number }
export interface ReiParse { ok: boolean; errors: string[]; rows: TaxRateRow[]; linesRead: number; columns: string[] }
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

export const parseReiCsv = (input: string | Buffer): ReiParse => {
  const errors: string[] = [];
  const fail = (m: string) => { if (errors.length < MAX_ERRORS) errors.push(m); };
  const text = typeof input === 'string' ? input : decodeText(input);
  const st = new CsvStream();
  const records = [...st.push(text), ...st.end()];
  if (!records.length) { fail('fichier vide.'); return { ok: false, errors, rows: [], linesRead: 0, columns: [] }; }
  const header = records[0].map(normalizeColumn);
  const find = (names: readonly string[]): number => header.findIndex((h) => names.includes(h));
  const iCom = find(REI_COLUMNS.commune); const iYear = find(REI_COLUMNS.year); const iRate = find(REI_COLUMNS.rate);
  const missing = [['code commune', iCom], ['année', iYear], ['taux global de taxe foncière bâtie', iRate]].filter(([, i]) => i === -1).map(([n]) => n as string);
  if (missing.length) {
    fail(`colonne(s) introuvable(s) : ${missing.join(', ')}. Colonnes trouvées : ${header.join(' | ')}. Le format du fichier n'est pas celui supposé : rien n'est deviné.`);
    return { ok: false, errors, rows: [], linesRead: records.length, columns: header };
  }
  const wanted = new Set(TAX_COMMUNES); const byKey = new Map<string, TaxRateRow>();
  records.slice(1).forEach((r, k) => {
    const line = k + 2;
    const commune = (r[iCom] ?? '').trim().padStart(5, '0');
    if (!wanted.has(commune)) return;
    const year = Number((r[iYear] ?? '').trim());
    if (!Number.isInteger(year) || year < PROPERTY_TAX_BOUNDS.firstYear || year > 2100) { fail(`ligne ${line} : année illisible (${r[iYear]}).`); return; }
    const rate = num(r[iRate]);
    if (rate === null) { fail(`ligne ${line} : taux illisible pour ${commune} en ${year} (${r[iRate]}).`); return; }
    if (rate < PROPERTY_TAX_BOUNDS.minRatePct || rate > PROPERTY_TAX_BOUNDS.maxRatePct) { fail(`ligne ${line} : taux de ${rate} % hors bornes plausibles (${PROPERTY_TAX_BOUNDS.minRatePct} à ${PROPERTY_TAX_BOUNDS.maxRatePct}).`); return; }
    const key = `${commune}|${year}`; const known = byKey.get(key);
    if (known && known.ratePct !== rate) { fail(`ligne ${line} : deux taux différents pour ${commune} en ${year}.`); return; }
    byKey.set(key, { commune, year, ratePct: rate });
  });
  const rows = [...byKey.values()].sort((a, b) => a.commune.localeCompare(b.commune) || a.year - b.year);
  const found = new Set(rows.map((r) => r.commune));
  const absent = TAX_COMMUNES.filter((c) => !found.has(c));
  if (!errors.length && absent.length) fail(`commune(s) absente(s) du fichier : ${absent.join(', ')} (code erroné, ou fichier incomplet). Rien n'est deviné : fichier refusé.`);
  return { ok: errors.length === 0, errors, rows: errors.length ? [] : rows, linesRead: records.length, columns: header };
};
