// Lecture STRICTE du fichier de loyers écrit par immo:import-loyers (aucun accès base ni disque ici). Tout fichier incohérent est refusé en entier.
import { allCodes } from '../dvf/cities';
import { RENT_BOUNDS, RENT_GROUPS, RentGroup, rentSnapshotDate } from '../../../config/rentMarketRules';

export interface RentDbRow { commune: string; group: RentGroup; vintage: number; snapshotDate: string; rent: number; low: number; high: number; kind: 'commune' | 'maille'; observations: number | null }
export interface ParsedRentFile { ok: boolean; errors: string[]; vintage: number | null; rows: RentDbRow[] }
const MAX_ERRORS = 20;

export const parseRentFile = (raw: unknown, now: Date = new Date()): ParsedRentFile => {
  const errors: string[] = [];
  const fail = (m: string) => { if (errors.length < MAX_ERRORS) errors.push(m); };
  const bad = (): ParsedRentFile => ({ ok: false, errors, vintage: null, rows: [] });
  if (!raw || typeof raw !== 'object') { fail('Le fichier n\'est pas un objet JSON.'); return bad(); }
  const f = raw as Record<string, unknown>;
  if (typeof f.source !== 'string' || !/ANIL/.test(f.source)) fail('Source absente ou qui n\'est pas ANIL.');
  const vintage = f.vintage;
  if (typeof vintage !== 'number' || !Number.isInteger(vintage) || vintage < 2022 || vintage > now.getUTCFullYear()) fail('Millésime invalide (entier de 2022 à l\'année en cours).');
  if (typeof vintage === 'number' && f.snapshotDate !== rentSnapshotDate(vintage)) fail(`snapshotDate doit valoir ${rentSnapshotDate(vintage as number)} (fin du 3e trimestre).`);
  if (!Array.isArray(f.rows)) fail('Liste de lignes (rows) absente.');
  if (errors.length) return bad();
  const v = vintage as number; const communes = new Set(allCodes()); const seen = new Set<string>(); const rows: RentDbRow[] = [];
  (f.rows as unknown[]).forEach((r, i) => {
    const at = `ligne ${i + 1}`;
    if (!Array.isArray(r) || r.length !== 7) { fail(`${at} : 7 colonnes attendues.`); return; }
    const [commune, group, rent, low, high, kind, obs] = r as [unknown, unknown, unknown, unknown, unknown, unknown, unknown];
    if (typeof commune !== 'string' || !communes.has(commune)) { fail(`${at} : commune inconnue (${String(commune)}).`); return; }
    if (typeof group !== 'string' || !(RENT_GROUPS as readonly string[]).includes(group)) { fail(`${at} : série inconnue (${String(group)}).`); return; }
    const nums = [rent, low, high];
    if (!nums.every((x) => typeof x === 'number' && Number.isFinite(x))) { fail(`${at} : loyer illisible.`); return; }
    const [rr, lo, hi] = nums as number[];
    if (rr < RENT_BOUNDS.minPerM2 || rr > RENT_BOUNDS.maxPerM2 || lo <= 0 || lo > rr || hi < rr) { fail(`${at} : loyers incohérents (${lo} / ${rr} / ${hi}).`); return; }
    if (kind !== 'commune' && kind !== 'maille') { fail(`${at} : type d'estimation inconnu.`); return; }
    if (obs !== null && !(typeof obs === 'number' && Number.isInteger(obs) && obs >= 0)) { fail(`${at} : nombre d'observations invalide.`); return; }
    const key = `${commune}|${group}`;
    if (seen.has(key)) { fail(`${at} : doublon (${key}).`); return; }
    seen.add(key);
    rows.push({ commune, group: group as RentGroup, vintage: v, snapshotDate: rentSnapshotDate(v), rent: rr, low: lo, high: hi, kind, observations: obs as number | null });
  });
  return errors.length ? bad() : { ok: true, errors, vintage: v, rows };
};
