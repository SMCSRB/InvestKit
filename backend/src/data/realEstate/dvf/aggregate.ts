// Médianes glissantes par mois (fonctions pures). RÈGLE D'OR : la valeur d'un mois M n'utilise que des ventes datées au plus tard à la fin de M
// (jamais le futur) : le jeu pourra donc afficher le marché à la date du joueur sans rien lui révéler de la suite.
import { DvfSale, DvfType } from './clean';
import { minOf, maxOf } from './arrays';
import { DVF_CITIES, cityOfCode } from './cities';

export const WINDOW_MONTHS = 12;
export const MIN_SALES = 10;                 // « zone fiable » (rapports) et seuil de la médiane de la VILLE ; la zone, elle, suit la règle de crédibilité ci-dessous
// Lissage par crédibilité (décision d'Andreja, 5 octobre 2026) : pour une zone qui a n ventes sur la fenêtre,
//   n >= 30 : médiane de la zone seule ; 5 <= n < 30 : (n/30) × médiane zone + (1 − n/30) × médiane ville ; n < 5 : médiane de la ville seule (marquée « ~ »).
// Les quartiles sont mélangés avec les mêmes poids (quartile 1 <= médiane <= quartile 3 est conservé). Aucune vente inventée : seulement un poids entre deux médianes observées.
export const CREDIBILITY_FULL = 30;
export const CREDIBILITY_FLOOR = 5;
// Plausibilité : un prix de zone ne s'écarte jamais de plus de 40 % de la médiane de la ville sans être marqué « ~ » (c'est alors le prix de la ville).
export const PLAUSIBILITY_BAND = 0.4;

// null = zone seule · 'mixte' = zone et ville mélangées (5 à 29 ventes) · 'ville' = ville seule (moins de 5 ventes, ou écart de plus de 40 %) · 'aucun' = pas de prix fiable
export type Fallback = null | 'mixte' | 'ville' | 'aucun';
export interface MarketRow { key: string; month: string; type: DvfType; n: number; median: number | null; p25: number | null; p75: number | null; fallback: Fallback; capped?: boolean }
export type Method = 'credibilite' | 'seuil';   // « seuil » = ancienne règle (10 ventes, sinon ville), gardée pour comparer avant/après

const monthIndex = (ym: string): number => Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7)) - 1;
const monthLabel = (i: number): string => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;

// Ventes triées par mois d'une clé (arrondissement, ou ville entière) et d'un type.
const bucket = (sales: DvfSale[], keyOf: (s: DvfSale) => string | null): Map<string, { m: number; p: number }[]> => {
  const out = new Map<string, { m: number; p: number }[]>();
  for (const s of sales) {
    const k = keyOf(s); if (!k) continue;
    const key = `${k}|${s.type}`;
    const l = out.get(key) ?? []; l.push({ m: monthIndex(s.date.slice(0, 7)), p: s.pricePerM2 }); out.set(key, l);
  }
  for (const l of out.values()) l.sort((a, b) => a.m - b.m);
  return out;
};

// Première position dont le mois est > m (la liste est triée par mois) : recherche dichotomique, pour ne pas relire 1,5 million de ventes à chaque mois.
const firstAfter = (list: { m: number }[], m: number): number => { let lo = 0; let hi = list.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (list[mid].m <= m) lo = mid + 1; else hi = mid; } return lo; };
// Médiane et quartiles d'un tableau DÉJÀ trié (même interpolation linéaire que clean.ts : median / quantile).
const sortedQuantile = (a: Float64Array, q: number): number => { const pos = (a.length - 1) * q; const lo = Math.floor(pos); const hi = Math.ceil(pos); return a[lo] + (a[hi] - a[lo]) * (pos - lo); };
const windowStats = (list: { m: number; p: number }[], month: number): { n: number; med: number | null; p25: number | null; p75: number | null } => {
  const from = firstAfter(list, month - WINDOW_MONTHS); const to = firstAfter(list, month);        // ventes des mois (month − 11) à month
  const n = to - from;
  if (n <= 0) return { n: 0, med: null, p25: null, p75: null };
  const v = new Float64Array(n);
  for (let i = 0; i < n; i++) v[i] = list[from + i].p;
  v.sort();                                                                                          // tri numérique natif, une seule fois pour la médiane et les deux quartiles (1,5 million de ventes : le test de volume ne doit pas bloquer le processus de test)
  return { n, med: Math.round(sortedQuantile(v, 0.5)), p25: Math.round(sortedQuantile(v, 0.25)), p75: Math.round(sortedQuantile(v, 0.75)) };
};

// months : [premier, dernier] au format AAAA-MM. Une ligne par (zone, type, mois).
export const monthlyMarket = (sales: DvfSale[], range: { from: string; to: string }, method: Method = 'credibilite'): MarketRow[] => {
  const zone = bucket(sales, (s) => s.zone || null);
  const city = bucket(sales, (s) => cityOfCode(s.code)?.id ?? null);
  const a = monthIndex(range.from); const b = monthIndex(range.to);
  const rows: MarketRow[] = [];
  for (const c of DVF_CITIES) {
    for (const type of ['appartement', 'maison'] as const) {
      const cityList = city.get(`${c.id}|${type}`) ?? [];
      const cityStats = new Map<number, ReturnType<typeof windowStats>>();      // médiane de la ville : calculée UNE fois par mois (et non par zone : 1,5 million de ventes)
      const cityAt = (m: number) => { let v = cityStats.get(m); if (!v) { v = windowStats(cityList, m); cityStats.set(m, v); } return v; };
      for (const code of c.zones) {
        const own = zone.get(`${code}|${type}`) ?? [];
        for (let m = a; m <= b; m++) {
          const month = monthLabel(m);
          const w = windowStats(own, m); const cw = cityAt(m);
          const cityOk = cw.n >= MIN_SALES;
          const asCity = (capped = false): MarketRow => ({ key: code, month, type, n: cw.n, median: cw.med, p25: cw.p25, p75: cw.p75, fallback: 'ville', ...(capped ? { capped: true } : {}) });
          const none: MarketRow = { key: code, month, type, n: w.n, median: null, p25: null, p75: null, fallback: 'aucun' };
          const alone: MarketRow = { key: code, month, type, n: w.n, median: w.med, p25: w.p25, p75: w.p75, fallback: null };
          if (method === 'seuil') { rows.push(w.n >= MIN_SALES ? alone : cityOk ? asCity() : none); continue; }
          if (!cityOk) { rows.push(w.n >= CREDIBILITY_FULL ? alone : none); continue; }   // pas de médiane de ville fiable : la zone n'est gardée que si elle est crédible à 100 %
          if (w.n < CREDIBILITY_FLOOR) { rows.push(asCity()); continue; }
          const weight = Math.min(w.n, CREDIBILITY_FULL) / CREDIBILITY_FULL;
          const mix = (z: number | null, v: number | null): number => Math.round(weight * z! + (1 - weight) * v!);
          const med = mix(w.med, cw.med);
          if (Math.abs(med / cw.med! - 1) > PLAUSIBILITY_BAND) { rows.push(asCity(true)); continue; }   // plausibilité : trop loin de la ville, on prend la ville (marquée « ~ »)
          rows.push({ key: code, month, type, n: w.n, median: med, p25: mix(w.p25, cw.p25), p75: mix(w.p75, cw.p75), fallback: weight >= 1 ? null : 'mixte' });
        }
      }
    }
  }
  return rows;
};

// 2014, 2015, 2016 -> « 2014 à 2016 » ; liste vide -> « aucune ».
export const compressYears = (years: number[]): string => {
  const ys = [...new Set(years)].sort((x, y) => x - y);
  if (!ys.length) return 'aucune';
  const parts: string[] = [];
  for (let i = 0; i < ys.length;) {
    let j = i; while (j + 1 < ys.length && ys[j + 1] === ys[j] + 1) j++;
    parts.push(j - i >= 1 ? `${ys[i]} à ${ys[j]}` : String(ys[i]));
    i = j + 1;
  }
  return parts.join(', ');
};

export interface QualityReport {
  presentYears: number[];
  absentYears: number[];
  perCity: { id: string; name: string; sales: number; byType: Record<DvfType, number>; coveredShare: number; fallbackShare: number; noneShare: number; jumps: number; minPerM2: number | null; maxPerM2: number | null }[];
  startYears: { year: number; cities: { id: string; ok: boolean }[] }[];
  warnings: string[];
}

// « Les vraies données tiennent-elles ? » : couverture par ville, part de mois sans médiane fiable, sauts suspects d'un mois à l'autre, et aptitude à chaque année de départ.
export const qualityReport = (sales: DvfSale[], allRows: MarketRow[], firstYear = 2014): QualityReport => {
  const warnings: string[] = [];
  // Les années ABSENTES (fichiers inexistants) ne comptent dans aucun pourcentage : elles sont listées à part.
  const presentYears = [...new Set(sales.map((s) => Number(s.date.slice(0, 4))))].sort((x, y) => x - y);
  const lastYear = presentYears.length ? presentYears[presentYears.length - 1] : firstYear;
  const absentYears: number[] = [];
  for (let y = firstYear; y <= lastYear; y++) if (!presentYears.includes(y)) absentYears.push(y);
  const rows = allRows.filter((x) => presentYears.includes(Number(x.month.slice(0, 4))));
  const salesByCity = new Map<string, DvfSale[]>();                       // une seule passe sur les ventes (et non une par ville)
  for (let i = 0; i < sales.length; i++) { const id = cityOfCode(sales[i].code)?.id; if (!id) continue; const l = salesByCity.get(id); if (l) l.push(sales[i]); else salesByCity.set(id, [sales[i]]); }
  const perCity = DVF_CITIES.map((c) => {
    const mine = salesByCity.get(c.id) ?? [];
    const r = rows.filter((x) => c.zones.includes(x.key) && x.type === 'appartement');
    const total = r.length || 1;
    const fb = r.filter((x) => x.fallback === 'ville').length; const none = r.filter((x) => x.fallback === 'aucun').length;
    let jumps = 0;
    for (const code of c.zones) {
      const seq = r.filter((x) => x.key === code && x.median !== null).sort((x, y) => x.month.localeCompare(y.month));
      for (let i = 1; i < seq.length; i++) if (Math.abs(seq[i].median! / seq[i - 1].median! - 1) > 0.15) jumps++;
    }
    const meds = r.map((x) => x.median).filter((x): x is number => x !== null);
    const byType = { appartement: mine.filter((s) => s.type === 'appartement').length, maison: mine.filter((s) => s.type === 'maison').length };
    if (mine.length === 0) warnings.push(`${c.name} : aucune vente retenue (fichiers manquants ou codes communes à vérifier).`);
    else if (none / total > 0.2) warnings.push(`${c.name} : ${(none / total * 100).toFixed(0)} % des mois sans médiane fiable (appartements, sur les années présentes seulement).`);
    if (jumps > 0) warnings.push(`${c.name} : ${jumps} saut(s) de plus de 15 % d'un mois à l'autre sur une médiane glissante (à lisser avant l'étape 3).`);
    return { id: c.id, name: c.name, sales: mine.length, byType, coveredShare: 1 - none / total, fallbackShare: fb / total, noneShare: none / total, jumps, minPerM2: meds.length ? minOf(meds) : null, maxPerM2: meds.length ? maxOf(meds) : null };
  });
  // Un départ en janvier de l'année Y a besoin de médianes fiables dès ce mois, pour au moins un type de bien, sur au moins la moitié des zones de la ville.
  const startYears = presentYears.map((year) => ({
    year,
    cities: DVF_CITIES.map((c) => {
      const jan = rows.filter((x) => c.zones.includes(x.key) && x.month === `${year}-01` && x.median !== null);
      const zones = new Set(jan.map((x) => x.key));
      return { id: c.id, ok: zones.size >= Math.ceil(c.zones.length / 2) };
    }),
  }));
  return { presentYears, absentYears, perCity, startYears, warnings };
};

// Qualité par ANNÉE et par ville : combien de ventes, combien de quartiers sous le seuil de fiabilité, quelles années sont maigres.
export interface YearCityStat { year: number; cityId: string; sales: number; zones: number; zonesBelowMin: number; thin: boolean }
export const yearCityStats = (sales: DvfSale[], years: number[]): YearCityStat[] => {
  // Comptage en UNE passe : (année, quartier) -> nombre de ventes.
  const count = new Map<string, number>();          // (année, zone) -> ventes
  const cityCount = new Map<string, number>();      // (année, ville) -> ventes, y compris celles sans zone fine
  for (let i = 0; i < sales.length; i++) {
    const y = sales[i].date.slice(0, 4);
    const id = cityOfCode(sales[i].code)?.id; if (id) { const ck = `${y}|${id}`; cityCount.set(ck, (cityCount.get(ck) ?? 0) + 1); }
    if (!sales[i].zone) continue;
    const k = `${y}|${sales[i].zone}`; count.set(k, (count.get(k) ?? 0) + 1);
  }
  const out: YearCityStat[] = [];
  for (const year of years) {
    for (const c of DVF_CITIES) {
      const perZone = c.zones.map((code) => count.get(`${year}|${code}`) ?? 0);
      const total = cityCount.get(`${year}|${c.id}`) ?? 0;
      const zones = c.zones.length;
      const below = perZone.filter((n) => n < MIN_SALES).length;
      // Année maigre : moins de la moitié des quartiers atteint le seuil sur l'année entière (donc, au mois le mois, la médiane glissante sera souvent en repli).
      out.push({ year, cityId: c.id, sales: total, zones, zonesBelowMin: below, thin: below > zones / 2 });
    }
  }
  return out;
};
