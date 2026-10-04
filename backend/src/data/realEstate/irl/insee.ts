// Lecture du fichier CSV de la série IRL de l'Insee (téléchargé par Andreja après lecture de la page). Fonction pure : aucun accès réseau, disque ni base. Rien n'est deviné.
// FORMAT SUPPOSÉ [connu, à confirmer au premier import] : quelques lignes d'en-tête (libellé, identifiant de série…) puis une ligne par trimestre avec une période (« 2022-T3 ») et une valeur (virgule décimale possible).
// Le lecteur cherche, dans chaque ligne, une période puis le premier nombre qui la suit ; tout le reste est ignoré. Fichier illisible, trimestre manquant ou valeur implausible : refusé en entier.
import { CsvStream, decodeText } from '../dvf/csv';
import { IRL_BOUNDS } from '../../../config/irlRules';
import { IrlPoint, quarterIndex } from '../../../engine/immo/irl';

export interface IrlParse { ok: boolean; errors: string[]; points: IrlPoint[]; linesRead: number }
const MAX_ERRORS = 20;
const PERIOD = /^(\d{4})\s*[-_ ]?\s*[TQ]\s*([1-4])$/i;
const REVERSED = /^[TQ]\s*([1-4])\s*[-_ ]?\s*(\d{4})$/i;

const num = (s: string | undefined): number | null => {
  if (s === undefined) return null;
  const t = s.trim().replace(/[\s  ]/g, '').replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

export const parseInseeIrl = (input: string | Buffer): IrlParse => {
  const errors: string[] = [];
  const fail = (m: string) => { if (errors.length < MAX_ERRORS) errors.push(m); };
  const text = typeof input === 'string' ? input : decodeText(input);
  const st = new CsvStream();
  const records = [...st.push(text), ...st.end()];
  const byIndex = new Map<number, IrlPoint>();
  records.forEach((r, k) => {
    for (let i = 0; i < r.length; i++) {
      const f = r[i].trim();
      let year: number | null = null; let quarter: number | null = null;
      let m = PERIOD.exec(f); if (m) { year = Number(m[1]); quarter = Number(m[2]); }
      else { m = REVERSED.exec(f); if (m) { quarter = Number(m[1]); year = Number(m[2]); } }
      if (year === null || quarter === null) continue;
      let value: number | null = null;
      for (let j = i + 1; j < r.length && value === null; j++) value = num(r[j]);
      if (value === null) { fail(`ligne ${k + 1} : période ${f} sans valeur lisible.`); return; }
      if (value < IRL_BOUNDS.minValue || value > IRL_BOUNDS.maxValue) { fail(`ligne ${k + 1} : valeur de ${value} hors bornes plausibles (${IRL_BOUNDS.minValue} à ${IRL_BOUNDS.maxValue}).`); return; }
      const p: IrlPoint = { year, quarter: quarter as 1 | 2 | 3 | 4, value };
      const idx = quarterIndex(p);
      const known = byIndex.get(idx);
      if (known && known.value !== value) { fail(`ligne ${k + 1} : deux valeurs différentes pour ${year}-T${quarter}.`); return; }
      byIndex.set(idx, p);
      return;
    }
  });
  const points = [...byIndex.values()].sort((a, b) => quarterIndex(a) - quarterIndex(b));
  if (points.length < IRL_BOUNDS.minQuarters) fail(`seulement ${points.length} trimestre(s) lisible(s) (au moins ${IRL_BOUNDS.minQuarters} attendus) : le format du fichier n'est peut-être pas celui supposé.`);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]; const b = points[i];
    if (quarterIndex(b) !== quarterIndex(a) + 1) { fail(`trimestre manquant entre ${a.year}-T${a.quarter} et ${b.year}-T${b.quarter}.`); break; }
    const ch = (b.value / a.value - 1) * 100;
    if (Math.abs(ch) > IRL_BOUNDS.maxQuarterlyChangePct) { fail(`variation de ${ch.toFixed(2)} % en un trimestre entre ${a.year}-T${a.quarter} et ${b.year}-T${b.quarter} : valeur suspecte.`); break; }
  }
  return { ok: errors.length === 0, errors, points: errors.length ? [] : points, linesRead: records.length };
};
