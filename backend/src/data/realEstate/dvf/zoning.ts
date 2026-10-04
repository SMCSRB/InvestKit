// Rapport de découpage : « combien de zones possibles par ville, et combien de ventes par zone et par année ? » (fonctions pures, rien n'est écrit).
// Compare deux découpages : le CODE POSTAL (retenu : nom lisible pour le joueur) et la SECTION CADASTRALE (plus fin, mais sans nom lisible : étudié seulement, jamais montré).
import { DvfSale } from './clean';
import { DVF_CITIES, cityOfCode, DvfCity } from './cities';
import { MIN_SALES, WINDOW_MONTHS } from './aggregate';

export interface UnitStat { unit: string; byYear: Record<number, number>; last12: number }
export interface CityZoning {
  id: string; name: string; sales: number; withoutPostal: number;
  unknownPostal: { postal: string; sales: number }[];            // codes postaux trouvés dans les données mais absents de la liste de la ville
  postal: { zones: number; reliable: number; shareOfSales: number; perZone: UnitStat[] };
  section: { units: number; reliable: number; shareOfSales: number; medianPerYear: number | null };
}
export interface ZoningReport { years: number[]; lastMonth: string | null; cities: CityZoning[] }

const monthIndex = (ym: string): number => Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7)) - 1;
const medianOf = (v: number[]): number | null => { if (!v.length) return null; const a = [...v].sort((x, y) => x - y); const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };

// « Fiable » = au moins MIN_SALES appartements vendus sur les WINDOW_MONTHS derniers mois des données (la règle des médianes glissantes).
export const zoningReport = (sales: readonly DvfSale[]): ZoningReport => {
  const years = new Set<number>(); let lastMonth = '';
  for (let i = 0; i < sales.length; i++) { years.add(Number(sales[i].date.slice(0, 4))); const m = sales[i].date.slice(0, 7); if (m > lastMonth) lastMonth = m; }
  const last = lastMonth ? monthIndex(lastMonth) : 0;
  const byCity = new Map<string, DvfSale[]>();
  for (let i = 0; i < sales.length; i++) { const id = cityOfCode(sales[i].code)?.id; if (!id) continue; const l = byCity.get(id); if (l) l.push(sales[i]); else byCity.set(id, [sales[i]]); }
  const inLast12 = (s: DvfSale): boolean => { const d = last - monthIndex(s.date.slice(0, 7)); return d >= 0 && d < WINDOW_MONTHS; };
  const cities = DVF_CITIES.map((c: DvfCity): CityZoning => {
    const mine = byCity.get(c.id) ?? [];
    const stat = new Map<string, UnitStat>(c.zones.map((z) => [z, { unit: z, byYear: {}, last12: 0 }]));
    const unknown = new Map<string, number>(); let without = 0;
    const sec = new Map<string, UnitStat>();
    let apartments12 = 0;
    for (const s of mine) {
      const y = Number(s.date.slice(0, 4));
      if (!c.districts) { if (!s.postal) without++; else if (!c.zones.includes(s.postal)) unknown.set(s.postal, (unknown.get(s.postal) ?? 0) + 1); }
      const z = stat.get(s.zone); if (z) { z.byYear[y] = (z.byYear[y] ?? 0) + 1; if (s.type === 'appartement' && inLast12(s)) z.last12++; }
      if (s.section) {
        const key = c.districts ? `${s.code}${s.section}` : s.section;
        let u = sec.get(key); if (!u) { u = { unit: key, byYear: {}, last12: 0 }; sec.set(key, u); }
        u.byYear[y] = (u.byYear[y] ?? 0) + 1; if (s.type === 'appartement' && inLast12(s)) u.last12++;
      }
      if (s.type === 'appartement' && inLast12(s)) apartments12++;
    }
    const perZone = [...stat.values()];
    const secs = [...sec.values()];
    const share = (list: UnitStat[]): number => (apartments12 ? list.filter((u) => u.last12 >= MIN_SALES).reduce((a, u) => a + u.last12, 0) / apartments12 : 0);
    const perYearSection: number[] = []; for (const u of secs) for (const n of Object.values(u.byYear)) perYearSection.push(n);
    return {
      id: c.id, name: c.name, sales: mine.length, withoutPostal: without,
      unknownPostal: [...unknown.entries()].map(([postal, n]) => ({ postal, sales: n })).sort((a, b) => b.sales - a.sales),
      postal: { zones: perZone.length, reliable: perZone.filter((u) => u.last12 >= MIN_SALES).length, shareOfSales: share(perZone), perZone },
      section: { units: secs.length, reliable: secs.filter((u) => u.last12 >= MIN_SALES).length, shareOfSales: share(secs), medianPerYear: medianOf(perYearSection) },
    };
  });
  return { years: [...years].sort((a, b) => a - b), lastMonth: lastMonth || null, cities };
};

export const renderZoning = (r: ZoningReport): string => {
  const { cities, years, lastMonth } = r;
  const out: string[] = [];
  out.push(`Rapport de découpage des zones — ventes retenues, années ${years.join(', ') || 'aucune'}, dernier mois ${lastMonth ?? '-'}.`);
  out.push(`« Fiable » = au moins ${MIN_SALES} appartements vendus sur les ${WINDOW_MONTHS} derniers mois (règle des médianes glissantes).`, '');
  for (const c of cities) {
    out.push(`${c.name} — ${c.sales} ventes retenues`);
    out.push(`  Zones par code postal / arrondissement : ${c.postal.zones}, dont ${c.postal.reliable} fiables (${(c.postal.shareOfSales * 100).toFixed(0)} % des ventes d'appartements sont dans une zone fiable).`);
    out.push('  ' + 'zone'.padEnd(8) + years.map((y) => String(y).padStart(7)).join('') + '   12 derniers mois (appart.)');
    for (const z of c.postal.perZone) out.push('  ' + z.unit.padEnd(8) + years.map((y) => String(z.byYear[y] ?? 0).padStart(7)).join('') + `   ${String(z.last12).padStart(4)}${z.last12 < MIN_SALES ? '  < seuil' : ''}`);
    out.push(`  Sections cadastrales (essai, pas de nom lisible pour le joueur) : ${c.section.units} sections, ${c.section.reliable} fiables (${(c.section.shareOfSales * 100).toFixed(0)} % des ventes d'appartements), médiane ${c.section.medianPerYear ?? '-'} vente(s) par section et par année.`);
    if (c.withoutPostal) out.push(`  ${c.withoutPostal} vente(s) sans code postal : elles ne servent qu'à la médiane de la ville.${c.withoutPostal === c.sales && c.sales ? ' TOUTES : fichiers téléchargés avant l\'ajout du code postal, à retélécharger (voir docs/immobilier-reel-preparation.md).' : ''}`);
    if (c.unknownPostal.length) out.push(`  Codes postaux trouvés mais absents de la liste de la ville (à ajouter si pertinent) : ${c.unknownPostal.map((u) => `${u.postal} (${u.sales})`).join(', ')}.`);
    out.push('');
  }
  return out.join('\n');
};
