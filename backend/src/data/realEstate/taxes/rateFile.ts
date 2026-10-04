// Lecture STRICTE du fichier de taux écrit par immo:import-taxe-fonciere (aucun accès base ni disque ici). Tout fichier incohérent est refusé en entier.
import { PROPERTY_TAX_BOUNDS } from '../../../config/propertyTaxRules';
import { TaxRateRow, TAX_COMMUNES } from './rei';

export interface ParsedTaxFile { ok: boolean; errors: string[]; rows: TaxRateRow[] }
const MAX_ERRORS = 20;

export const parseTaxRateFile = (raw: unknown): ParsedTaxFile => {
  const errors: string[] = [];
  const fail = (m: string) => { if (errors.length < MAX_ERRORS) errors.push(m); };
  const bad = (): ParsedTaxFile => ({ ok: false, errors, rows: [] });
  if (!raw || typeof raw !== 'object') { fail('Le fichier n\'est pas un objet JSON.'); return bad(); }
  const f = raw as Record<string, unknown>;
  if (typeof f.source !== 'string' || !/DGFiP/i.test(f.source)) fail('Source absente ou qui n\'est pas la DGFiP.');
  if (!Array.isArray(f.rows)) fail('Liste de lignes (rows) absente.');
  if (errors.length) return bad();
  const communes = new Set(TAX_COMMUNES); const seen = new Set<string>(); const rows: TaxRateRow[] = [];
  (f.rows as unknown[]).forEach((r, i) => {
    const at = `ligne ${i + 1}`;
    if (!Array.isArray(r) || r.length !== 3) { fail(`${at} : 3 colonnes attendues (commune, année, taux).`); return; }
    const [commune, year, rate] = r as [unknown, unknown, unknown];
    if (typeof commune !== 'string' || !communes.has(commune)) { fail(`${at} : commune inconnue (${String(commune)}).`); return; }
    if (typeof year !== 'number' || !Number.isInteger(year) || year < PROPERTY_TAX_BOUNDS.firstYear || year > 2100) { fail(`${at} : année invalide.`); return; }
    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate < PROPERTY_TAX_BOUNDS.minRatePct || rate > PROPERTY_TAX_BOUNDS.maxRatePct) { fail(`${at} : taux invalide.`); return; }
    const key = `${commune}|${year}`;
    if (seen.has(key)) { fail(`${at} : doublon (${key}).`); return; }
    seen.add(key); rows.push({ commune, year, ratePct: rate });
  });
  if (!errors.length && !rows.length) fail('aucune ligne.');
  return errors.length ? bad() : { ok: true, errors, rows };
};
