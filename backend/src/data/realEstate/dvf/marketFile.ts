// Lecture STRICTE du fichier de médianes écrit par immo:import-dvf (aucun accès base ni disque ici). Tout fichier incohérent est refusé en entier : on n'importe jamais « ce qui a l'air bon ».
import { allZones } from './cities';
import { BOUNDS } from './clean';

export interface MarketDbRow { zone: string; month: string; type: 'apartment' | 'house'; salesCount: number; median: number; p25: number; p75: number; scope: 'zone' | 'city' }
export interface ParsedMarketFile { ok: boolean; errors: string[]; meta: { from: string; to: string; windowMonths: number; minSales: number } | null; rows: MarketDbRow[]; skippedNoPrice: number }

const MAX_ERRORS = 20;
const validMonth = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export const parseMarketFile = (raw: unknown, now: Date = new Date()): ParsedMarketFile => {
  const errors: string[] = [];
  const fail = (m: string) => { if (errors.length < MAX_ERRORS) errors.push(m); };
  const bad = (): ParsedMarketFile => ({ ok: false, errors, meta: null, rows: [], skippedNoPrice: 0 });
  if (!raw || typeof raw !== 'object') { fail('Le fichier n\'est pas un objet JSON.'); return bad(); }
  const f = raw as Record<string, unknown>;
  if (typeof f.source !== 'string' || !/DVF/.test(f.source)) fail('Source absente ou qui n\'est pas DVF.');
  const range = f.range as { from?: unknown; to?: unknown } | undefined;
  if (!range || !validMonth(range.from) || !validMonth(range.to) || range.from > range.to) fail('Période (range) invalide.');
  if (!isInt(f.windowMonths) || f.windowMonths <= 0) fail('windowMonths invalide.');
  if (!isInt(f.minSales) || f.minSales <= 0) fail('minSales invalide.');
  if (!Array.isArray(f.rows)) fail('Liste de lignes (rows) absente.');
  if (errors.length) return bad();
  const nowMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const zones = new Set(allZones());
  const seen = new Set<string>();
  const rows: MarketDbRow[] = []; let skipped = 0;
  const from = (range as { from: string }).from; const to = (range as { to: string }).to;
  (f.rows as unknown[]).forEach((r, i) => {
    const at = `ligne ${i + 1}`;
    if (!Array.isArray(r) || r.length !== 8) { fail(`${at} : 8 colonnes attendues.`); return; }
    const [zone, month, t, n, med, p25, p75, fb] = r as [unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown];
    if (typeof zone !== 'string' || !zones.has(zone)) { fail(`${at} : quartier inconnu (${String(zone)}).`); return; }
    if (!validMonth(month)) { fail(`${at} : mois invalide.`); return; }
    if (month < from || month > to) { fail(`${at} : mois ${month} hors de la période ${from} à ${to}.`); return; }
    if (month > nowMonth) { fail(`${at} : mois ${month} dans le futur.`); return; }
    if (t !== 'a' && t !== 'm') { fail(`${at} : type de bien inconnu.`); return; }
    if (!isInt(n) || n < 0) { fail(`${at} : nombre de ventes invalide.`); return; }
    if (fb !== null && fb !== 'mixte' && fb !== 'ville' && fb !== 'aucun') { fail(`${at} : repli inconnu.`); return; }
    const key = `${zone}|${month}|${t}`;
    if (seen.has(key)) { fail(`${at} : doublon (${key}).`); return; }
    seen.add(key);
    if (fb === 'aucun') {
      if (med !== null || p25 !== null || p75 !== null) { fail(`${at} : « aucun » doit être sans prix.`); return; }
      skipped++; return;                                                    // pas de prix fiable : rien n'est stocké (jamais de chiffre inventé)
    }
    if (!isNum(med) || !isNum(p25) || !isNum(p75)) { fail(`${at} : prix manquant.`); return; }
    if (med < BOUNDS.minPerM2 || med > BOUNDS.maxPerM2 || p25 > med || med > p75 || p25 <= 0) { fail(`${at} : prix incohérents (${p25} / ${med} / ${p75}).`); return; }
    if (n < (f.minSales as number)) { fail(`${at} : ${n} ventes, sous le seuil de ${f.minSales}.`); return; }
    rows.push({ zone, month, type: t === 'a' ? 'apartment' : 'house', salesCount: n, median: med, p25, p75, scope: fb === 'ville' ? 'city' : 'zone' });
  });
  if (errors.length) return bad();
  return { ok: true, errors, meta: { from, to, windowMonths: f.windowMonths as number, minSales: f.minSales as number }, rows, skippedNoPrice: skipped };
};
