// Lecture STRICTE du fichier de taux écrit par immo:import-taxe-fonciere (aucun accès base ni disque ici). Tout fichier incohérent est refusé en entier.
import { PROPERTY_TAX_BOUNDS } from '../../../config/propertyTaxRules';
import { TaxRateRow, TAX_COMMUNES } from './rei';

export interface ParsedTaxFile { ok: boolean; errors: string[]; rows: TaxRateRow[] }
const MAX_ERRORS = 20;
const isRate = (x: unknown, max: number): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= max;

export const parseTaxRateFile = (raw: unknown): ParsedTaxFile => {
  const errors: string[] = [];
  const fail = (m: string) => { if (errors.length < MAX_ERRORS) errors.push(m); };
  const bad = (): ParsedTaxFile => ({ ok: false, errors, rows: [] });
  if (!raw || typeof raw !== 'object') { fail('Le fichier n\'est pas un objet JSON.'); return bad(); }
  const f = raw as Record<string, unknown>;
  if (typeof f.source !== 'string' || !/Terralyse/i.test(f.source)) fail('Source absente ou qui n\'est pas Terralyse.');
  if (!Array.isArray(f.rows)) fail('Liste de lignes (rows) absente.');
  if (errors.length) return bad();
  const communes = new Set(TAX_COMMUNES); const seen = new Set<string>(); const rows: TaxRateRow[] = [];
  (f.rows as unknown[]).forEach((r, i) => {
    const at = `ligne ${i + 1}`;
    if (!Array.isArray(r) || r.length !== 6) { fail(`${at} : 6 colonnes attendues (commune, année, taux global, communal, intercommunal, TEOM).`); return; }
    const [commune, year, global, communal, inter, teom] = r as [unknown, unknown, unknown, unknown, unknown, unknown];
    if (typeof commune !== 'string' || !communes.has(commune)) { fail(`${at} : commune inconnue (${String(commune)}).`); return; }
    if (typeof year !== 'number' || !Number.isInteger(year) || year < PROPERTY_TAX_BOUNDS.firstYear || year > 2100) { fail(`${at} : année invalide.`); return; }
    if (!isRate(global, PROPERTY_TAX_BOUNDS.maxRatePct) || global < PROPERTY_TAX_BOUNDS.minRatePct || !isRate(communal, PROPERTY_TAX_BOUNDS.maxPartPct) || !isRate(inter, PROPERTY_TAX_BOUNDS.maxPartPct)) { fail(`${at} : taux invalide.`); return; }
    if (Math.abs(global - (communal + inter)) > 0.001) { fail(`${at} : le taux global n'est pas communal + intercommunal.`); return; }
    if (teom !== null && !isRate(teom, PROPERTY_TAX_BOUNDS.maxTeomPct)) { fail(`${at} : TEOM invalide.`); return; }
    const key = `${commune}|${year}`;
    if (seen.has(key)) { fail(`${at} : doublon (${key}).`); return; }
    seen.add(key); rows.push({ commune, year, communalPct: communal, intercommunalPct: inter, ratePct: global, teomPct: teom as number | null });
  });
  if (!errors.length && !rows.length) fail('aucune ligne.');
  return errors.length ? bad() : { ok: true, errors, rows };
};
