// Médianes glissantes par mois (fonctions pures). RÈGLE D'OR : la valeur d'un mois M n'utilise que des ventes datées au plus tard à la fin de M
// (jamais le futur) : le jeu pourra donc afficher le marché à la date du joueur sans rien lui révéler de la suite.
import { DvfSale, DvfType, median, quantile } from './clean';
import { DVF_CITIES, cityOfCode } from './cities';

export const WINDOW_MONTHS = 12;
export const MIN_SALES = 10;                 // en dessous, la médiane n'est pas fiable : repli sur la ville, puis « aucun »

export type Fallback = null | 'ville' | 'aucun';
export interface MarketRow { key: string; month: string; type: DvfType; n: number; median: number | null; p25: number | null; p75: number | null; fallback: Fallback }

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

const windowStats = (list: { m: number; p: number }[], month: number): { n: number; med: number | null; p25: number | null; p75: number | null } => {
  const v = list.filter((x) => x.m <= month && x.m > month - WINDOW_MONTHS).map((x) => x.p);
  if (!v.length) return { n: 0, med: null, p25: null, p75: null };
  return { n: v.length, med: Math.round(median(v)), p25: Math.round(quantile(v, 0.25)), p75: Math.round(quantile(v, 0.75)) };
};

// months : [premier, dernier] au format AAAA-MM. Une ligne par (zone, type, mois).
export const monthlyMarket = (sales: DvfSale[], range: { from: string; to: string }): MarketRow[] => {
  const zone = bucket(sales, (s) => s.code);
  const city = bucket(sales, (s) => cityOfCode(s.code)?.id ?? null);
  const a = monthIndex(range.from); const b = monthIndex(range.to);
  const rows: MarketRow[] = [];
  for (const c of DVF_CITIES) {
    for (const type of ['appartement', 'maison'] as const) {
      const cityList = city.get(`${c.id}|${type}`) ?? [];
      for (const code of c.districts ? c.codes : [c.codes[0]]) {
        const own = zone.get(`${code}|${type}`) ?? [];
        for (let m = a; m <= b; m++) {
          const w = windowStats(own, m);
          if (w.n >= MIN_SALES) { rows.push({ key: code, month: monthLabel(m), type, n: w.n, median: w.med, p25: w.p25, p75: w.p75, fallback: null }); continue; }
          const cw = windowStats(cityList, m);
          if (cw.n >= MIN_SALES) rows.push({ key: code, month: monthLabel(m), type, n: cw.n, median: cw.med, p25: cw.p25, p75: cw.p75, fallback: 'ville' });
          else rows.push({ key: code, month: monthLabel(m), type, n: w.n, median: null, p25: null, p75: null, fallback: 'aucun' });
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
  const perCity = DVF_CITIES.map((c) => {
    const mine = sales.filter((s) => cityOfCode(s.code)?.id === c.id);
    const r = rows.filter((x) => c.codes.includes(x.key) && x.type === 'appartement');
    const total = r.length || 1;
    const fb = r.filter((x) => x.fallback === 'ville').length; const none = r.filter((x) => x.fallback === 'aucun').length;
    let jumps = 0;
    for (const code of c.codes) {
      const seq = r.filter((x) => x.key === code && x.median !== null).sort((x, y) => x.month.localeCompare(y.month));
      for (let i = 1; i < seq.length; i++) if (Math.abs(seq[i].median! / seq[i - 1].median! - 1) > 0.15) jumps++;
    }
    const meds = r.map((x) => x.median).filter((x): x is number => x !== null);
    const byType = { appartement: mine.filter((s) => s.type === 'appartement').length, maison: mine.filter((s) => s.type === 'maison').length };
    if (mine.length === 0) warnings.push(`${c.name} : aucune vente retenue (fichiers manquants ou codes communes à vérifier).`);
    else if (none / total > 0.2) warnings.push(`${c.name} : ${(none / total * 100).toFixed(0)} % des mois sans médiane fiable (appartements, sur les années présentes seulement).`);
    if (jumps > 0) warnings.push(`${c.name} : ${jumps} saut(s) de plus de 15 % d'un mois à l'autre sur une médiane glissante (à lisser avant l'étape 3).`);
    return { id: c.id, name: c.name, sales: mine.length, byType, coveredShare: 1 - none / total, fallbackShare: fb / total, noneShare: none / total, jumps, minPerM2: meds.length ? Math.min(...meds) : null, maxPerM2: meds.length ? Math.max(...meds) : null };
  });
  // Un départ en janvier de l'année Y a besoin de médianes fiables dès ce mois, pour au moins un type de bien, sur au moins la moitié des zones de la ville.
  const startYears = presentYears.map((year) => ({
    year,
    cities: DVF_CITIES.map((c) => {
      const jan = rows.filter((x) => c.codes.includes(x.key) && x.month === `${year}-01` && x.median !== null);
      const zones = new Set(jan.map((x) => x.key));
      return { id: c.id, ok: zones.size >= Math.ceil(c.codes.length / 2) };
    }),
  }));
  return { presentYears, absentYears, perCity, startYears, warnings };
};

// Qualité par ANNÉE et par ville : combien de ventes, combien de quartiers sous le seuil de fiabilité, quelles années sont maigres.
export interface YearCityStat { year: number; cityId: string; sales: number; zones: number; zonesBelowMin: number; thin: boolean }
export const yearCityStats = (sales: DvfSale[], years: number[]): YearCityStat[] => {
  const out: YearCityStat[] = [];
  for (const year of years) {
    for (const c of DVF_CITIES) {
      const mine = sales.filter((s) => s.date.startsWith(String(year)) && c.codes.includes(s.code));
      const zones = c.codes.length;
      const below = c.codes.filter((code) => mine.filter((s) => s.code === code).length < MIN_SALES).length;
      // Année maigre : moins de la moitié des quartiers atteint le seuil sur l'année entière (donc, au mois le mois, la médiane glissante sera souvent en repli).
      out.push({ year, cityId: c.id, sales: mine.length, zones, zonesBelowMin: below, thin: below > zones / 2 });
    }
  }
  return out;
};
