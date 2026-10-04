// Diagnostic des « sauts » de médiane (plus de 15 % d'un mois à l'autre) : où, quand, et POURQUOI. Lecture seule, aucun chiffre inventé.
// Pour chaque saut on dit : combien de ventes sont entrées et sorties de la fenêtre glissante, à quels prix, si la zone a basculé entre « sa » médiane et celle de la ville (repli),
// et une cause probable : « bascule » (repli ↔ zone), « bruit » (peu de ventes dans la fenêtre), sinon « marché » (volume suffisant : le mouvement est réel).
import { DvfSale } from './clean';
import { MarketRow, WINDOW_MONTHS, MIN_SALES } from './aggregate';
import { DVF_CITIES, cityOfCode } from './cities';
import { median } from './clean';

export const NOISE_BELOW = 30;          // moins de 30 ventes dans la fenêtre : une médiane bouge facilement de 15 % (VALEUR DE DIAGNOSTIC, pas une règle du jeu)

export type JumpCause = 'bascule' | 'bruit' | 'marche';
export interface Jump {
  zone: string; month: string; prevMonth: string; prevMedian: number; median: number; deltaPct: number;
  nPrev: number; n: number; entering: number; leaving: number; enteringMedian: number | null; leavingMedian: number | null;
  prevFallback: MarketRow['fallback']; fallback: MarketRow['fallback']; cause: JumpCause;
}

const monthIndex = (ym: string): number => Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7)) - 1;
const med = (v: number[]): number | null => (v.length ? Math.round(median(v)) : null);

export const explainJumps = (sales: readonly DvfSale[], rows: readonly MarketRow[], cityId: string, threshold = 0.15): Jump[] => {
  const city = DVF_CITIES.find((c) => c.id === cityId);
  if (!city) throw new Error(`Ville inconnue : ${cityId}`);
  // Prix par mois, pour les appartements : par zone, et pour la ville entière (repli).
  const byZone = new Map<string, Map<number, number[]>>(); const cityAll = new Map<number, number[]>();
  const push = (m: Map<number, number[]>, k: number, p: number) => { const l = m.get(k); if (l) l.push(p); else m.set(k, [p]); };
  for (const s of sales) {
    if (s.type !== 'appartement' || cityOfCode(s.code)?.id !== cityId) continue;
    const k = monthIndex(s.date.slice(0, 7));
    push(cityAll, k, s.pricePerM2);
    if (s.zone) { let z = byZone.get(s.zone); if (!z) { z = new Map(); byZone.set(s.zone, z); } push(z, k, s.pricePerM2); }
  }
  const out: Jump[] = [];
  for (const zone of city.zones) {
    const seq = rows.filter((r) => r.key === zone && r.type === 'appartement' && r.median !== null).sort((a, b) => a.month.localeCompare(b.month));
    for (let i = 1; i < seq.length; i++) {
      const a = seq[i - 1]; const b = seq[i];
      const delta = b.median! / a.median! - 1;
      if (Math.abs(delta) <= threshold) continue;
      const pm = monthIndex(a.month); const nm = monthIndex(b.month);
      // Ventes sorties (mois pm-11 à nm-12) et entrées (mois pm+1 à nm) de la fenêtre, sur la série réellement utilisée au mois b.
      const src = b.fallback === 'ville' ? cityAll : byZone.get(zone) ?? new Map<number, number[]>();
      const take = (from: number, to: number): number[] => { const v: number[] = []; for (let m = from; m <= to; m++) for (const p of src.get(m) ?? []) v.push(p); return v; };
      const entering = take(pm + 1, nm); const leaving = take(pm - WINDOW_MONTHS + 1, nm - WINDOW_MONTHS);
      const cause: JumpCause = a.fallback !== b.fallback ? 'bascule' : Math.min(a.n, b.n) < NOISE_BELOW ? 'bruit' : 'marche';
      out.push({ zone, month: b.month, prevMonth: a.month, prevMedian: a.median!, median: b.median!, deltaPct: Math.round(delta * 1000) / 10, nPrev: a.n, n: b.n,
        entering: entering.length, leaving: leaving.length, enteringMedian: med(entering), leavingMedian: med(leaving), prevFallback: a.fallback, fallback: b.fallback, cause });
    }
  }
  return out;
};

const CAUSE: Record<JumpCause, string> = { bascule: 'BASCULE zone ↔ ville', bruit: 'BRUIT (peu de ventes)', marche: 'MARCHÉ (volume suffisant)' };
export const renderJumps = (cityId: string, jumps: Jump[], threshold = 0.15): string => {
  const out = [`Sauts de plus de ${Math.round(threshold * 100)} % sur la médiane glissante (appartements), ${cityId} : ${jumps.length}`, `(seuil de fiabilité ${MIN_SALES} ventes ; « bruit » = moins de ${NOISE_BELOW} ventes dans la fenêtre de ${WINDOW_MONTHS} mois)`];
  for (const j of jumps) {
    out.push(`- ${j.zone} · ${j.prevMonth} → ${j.month} : ${j.prevMedian} → ${j.median} €/m² (${j.deltaPct > 0 ? '+' : ''}${j.deltaPct} %) · ventes dans la fenêtre ${j.nPrev} → ${j.n}${j.prevFallback !== j.fallback ? ` · repli ${j.prevFallback ?? 'aucun'} → ${j.fallback ?? 'aucun'}` : j.fallback === 'ville' ? ' · repli sur la ville' : ''}`);
    out.push(`    entrées ${j.entering}${j.enteringMedian ? ` (médiane ${j.enteringMedian})` : ''} · sorties ${j.leaving}${j.leavingMedian ? ` (médiane ${j.leavingMedian})` : ''} → ${CAUSE[j.cause]}`);
  }
  return out.join('\n');
};
