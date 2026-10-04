// Lecture STRICTE du fichier de l'IRL écrit par immo:import-irl (aucun accès base ni disque ici). Tout fichier incohérent est refusé en entier.
import { IRL_BOUNDS } from '../../../config/irlRules';
import { IrlPoint, quarterIndex } from '../../../engine/immo/irl';

export interface ParsedIrlFile { ok: boolean; errors: string[]; points: IrlPoint[] }
const MAX_ERRORS = 20;

export const parseIrlFile = (raw: unknown): ParsedIrlFile => {
  const errors: string[] = [];
  const fail = (m: string) => { if (errors.length < MAX_ERRORS) errors.push(m); };
  const bad = (): ParsedIrlFile => ({ ok: false, errors, points: [] });
  if (!raw || typeof raw !== 'object') { fail('Le fichier n\'est pas un objet JSON.'); return bad(); }
  const f = raw as Record<string, unknown>;
  if (typeof f.source !== 'string' || !/Insee/i.test(f.source)) fail('Source absente ou qui n\'est pas l\'Insee.');
  if (!Array.isArray(f.rows)) fail('Liste de lignes (rows) absente.');
  if (errors.length) return bad();
  const points: IrlPoint[] = []; const seen = new Set<number>();
  (f.rows as unknown[]).forEach((r, i) => {
    const at = `ligne ${i + 1}`;
    if (!Array.isArray(r) || r.length !== 3) { fail(`${at} : 3 colonnes attendues (année, trimestre, valeur).`); return; }
    const [year, quarter, value] = r as [unknown, unknown, unknown];
    if (typeof year !== 'number' || !Number.isInteger(year) || year < 1999 || year > 2100) { fail(`${at} : année invalide.`); return; }
    if (typeof quarter !== 'number' || ![1, 2, 3, 4].includes(quarter)) { fail(`${at} : trimestre invalide.`); return; }
    if (typeof value !== 'number' || !Number.isFinite(value) || value < IRL_BOUNDS.minValue || value > IRL_BOUNDS.maxValue) { fail(`${at} : valeur invalide.`); return; }
    const p: IrlPoint = { year, quarter: quarter as 1 | 2 | 3 | 4, value };
    if (seen.has(quarterIndex(p))) { fail(`${at} : doublon.`); return; }
    seen.add(quarterIndex(p)); points.push(p);
  });
  if (!errors.length && points.length < IRL_BOUNDS.minQuarters) fail(`seulement ${points.length} trimestre(s).`);
  points.sort((a, b) => quarterIndex(a) - quarterIndex(b));
  for (let i = 1; i < points.length && !errors.length; i++) if (quarterIndex(points[i]) !== quarterIndex(points[i - 1]) + 1) fail('trimestre manquant dans la série.');
  return errors.length ? bad() : { ok: true, errors, points };
};
