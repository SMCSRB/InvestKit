// Prépare les prix réels de l'Immobilier HORS LIGNE : lit les fichiers DVF téléchargés (backend/data/dvf-brut/AAAA/CODE.csv), nettoie, calcule les médianes glissantes par mois
// et écrit UN fichier JSON de quelques Mo. N'écrit rien en base, ne touche aucun serveur : le jeu n'utilise pas encore ce fichier (étape 3 du chantier).
//   npm run immo:import-dvf                      (écrit backend/data/dvf-marche.json + rapport qualité)
//   npm run immo:import-dvf -- --check           (rapport qualité seulement, n'écrit rien)
// Options : --dir <dossier des fichiers bruts> · --out <fichier> · --from AAAA-MM · --to AAAA-MM (défaut : 2014-01 à la dernière vente lue)
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import path from 'path';
import { parseCsv, cleanRows, trimOutliers, DvfSale, RejectReason } from '../src/data/realEstate/dvf/clean';
import { monthlyMarket, qualityReport, WINDOW_MONTHS, MIN_SALES } from '../src/data/realEstate/dvf/aggregate';
import { DVF_CITIES } from '../src/data/realEstate/dvf/cities';

const arg = (n: string): string | undefined => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const flag = (n: string) => process.argv.includes(`--${n}`);

const main = () => {
  const dir = path.resolve(arg('dir') ?? path.join(__dirname, '..', 'data', 'dvf-brut'));
  if (!existsSync(dir)) throw new Error(`Dossier introuvable : ${dir}. Lance d'abord « npm run immo:download-dvf ».`);
  const sales: DvfSale[] = []; const rejected: Partial<Record<RejectReason, number>> = {}; let files = 0; let mutations = 0;
  for (const year of readdirSync(dir).filter((d) => /^\d{4}$/.test(d)).sort()) {
    for (const f of readdirSync(path.join(dir, year)).filter((x) => x.endsWith('.csv'))) {
      const r = cleanRows(parseCsv(readFileSync(path.join(dir, year, f), 'utf8')));
      files++; mutations += r.mutations; sales.push(...r.sales);
      for (const [k, v] of Object.entries(r.rejected)) rejected[k as RejectReason] = (rejected[k as RejectReason] ?? 0) + v;
    }
  }
  if (!files) throw new Error('Aucun fichier .csv trouvé : rien n\'est écrit.');
  const trimmed = trimOutliers(sales);
  rejected.valeur_aberrante = (rejected.valeur_aberrante ?? 0) + trimmed.removed;
  const last = trimmed.kept.map((s) => s.date.slice(0, 7)).sort().pop()!;
  const range = { from: arg('from') ?? '2014-01', to: arg('to') ?? last };
  const rows = monthlyMarket(trimmed.kept, range);
  const rep = qualityReport(trimmed.kept, rows);

  console.log(`${files} fichier(s), ${mutations} mutations lues, ${trimmed.kept.length} ventes retenues.`);
  console.log('Rejets : ' + (Object.entries(rejected).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(', ') || 'aucun'));
  console.log(`Médiane glissante sur ${WINDOW_MONTHS} mois, au moins ${MIN_SALES} ventes, sinon repli sur la ville.\n`);
  console.log('Ville                 ventes  appart.  maisons  fiable  repli  aucun  sauts  min–max (€/m², appart.)');
  for (const c of rep.perCity) console.log(`${c.name.padEnd(20)} ${String(c.sales).padStart(7)} ${String(c.byType.appartement).padStart(8)} ${String(c.byType.maison).padStart(8)} ${(c.coveredShare * 100 - c.fallbackShare * 100).toFixed(0).padStart(6)}% ${(c.fallbackShare * 100).toFixed(0).padStart(5)}% ${(c.noneShare * 100).toFixed(0).padStart(5)}% ${String(c.jumps).padStart(6)}  ${c.minPerM2 ?? '-'}–${c.maxPerM2 ?? '-'}`);
  console.log('\nDépart en janvier de l\'année (ok = médianes fiables sur au moins la moitié des quartiers) :');
  for (const y of rep.startYears) console.log(`  ${y.year} : ${y.cities.filter((c) => c.ok).length}/${DVF_CITIES.length} villes${y.cities.some((c) => !c.ok) ? ` (manque : ${y.cities.filter((c) => !c.ok).map((c) => c.id).join(', ')})` : ''}`);
  if (rep.warnings.length) console.log('\nÀ regarder :\n- ' + rep.warnings.join('\n- '));
  if (flag('check')) return;
  const out = path.resolve(arg('out') ?? path.join(__dirname, '..', 'data', 'dvf-marche.json'));
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({
    source: 'DVF géolocalisées (DGFiP, via data.gouv.fr), Licence Ouverte 2.0', windowMonths: WINDOW_MONTHS, minSales: MIN_SALES, range,
    columns: ['zone', 'mois', 'type', 'ventes', 'médiane €/m²', 'quartile 1', 'quartile 3', 'repli'],
    rows: rows.map((r) => [r.key, r.month, r.type === 'appartement' ? 'a' : 'm', r.n, r.median, r.p25, r.p75, r.fallback]),
  }));
  console.log(`\nÉcrit : ${out} (${rows.length} lignes).`);
};
try { main(); } catch (e) { console.error(e instanceof Error ? e.message : e); process.exit(1); }
