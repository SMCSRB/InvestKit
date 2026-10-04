// Prépare les prix réels de l'Immobilier HORS LIGNE : lit les fichiers DVF téléchargés (backend/data/dvf-brut/AAAA/CODE.csv), nettoie, calcule les médianes glissantes par mois
// et écrit UN fichier JSON de quelques Mo. N'écrit rien en base, ne touche aucun serveur : le jeu n'utilise pas encore ce fichier (étape 3 du chantier).
//   npm run immo:import-dvf                      (écrit backend/data/dvf-marche.json + rapport qualité)
//   npm run immo:import-dvf -- --check           (rapport qualité seulement, n'écrit rien)
// Options : --dir <dossier des fichiers bruts> · --out <fichier> · --from AAAA-MM · --to AAAA-MM (défaut : 2014-01 à la dernière vente lue)
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { yearCityStats, compressYears, WINDOW_MONTHS, MIN_SALES } from '../src/data/realEstate/dvf/aggregate';
import { loadSalesFromDir, buildFromSales } from '../src/data/realEstate/dvf/pipeline';
import { DVF_CITIES } from '../src/data/realEstate/dvf/cities';

const arg = (n: string): string | undefined => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const flag = (n: string) => process.argv.includes(`--${n}`);

const main = () => {
  const dir = path.resolve(arg('dir') ?? path.join(__dirname, '..', 'data', 'dvf-brut'));
  const { sales, rejected: rejectedIn, files, mutations } = loadSalesFromDir(dir);
  const { kept, rejected, range, rows, report: rep } = buildFromSales(sales, rejectedIn, { from: arg('from'), to: arg('to') });
  const trimmed = { kept };

  console.log(`${files} fichier(s), ${mutations} mutations lues, ${trimmed.kept.length} ventes retenues.`);
  console.log('Rejets : ' + (Object.entries(rejected).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(', ') || 'aucun'));
  console.log(`Médiane glissante sur ${WINDOW_MONTHS} mois, au moins ${MIN_SALES} ventes, sinon repli sur la ville.\n`);
  console.log('Ville                 ventes  appart.  maisons  fiable  repli  aucun  sauts  min–max (€/m², appart.)');
  for (const c of rep.perCity) console.log(`${c.name.padEnd(20)} ${String(c.sales).padStart(7)} ${String(c.byType.appartement).padStart(8)} ${String(c.byType.maison).padStart(8)} ${(c.coveredShare * 100 - c.fallbackShare * 100).toFixed(0).padStart(6)}% ${(c.fallbackShare * 100).toFixed(0).padStart(5)}% ${(c.noneShare * 100).toFixed(0).padStart(5)}% ${String(c.jumps).padStart(6)}  ${c.minPerM2 ?? '-'}–${c.maxPerM2 ?? '-'}`);
  console.log('\nDépart en janvier de l\'année (ok = médianes fiables sur au moins la moitié des quartiers) :');
  for (const y of rep.startYears) console.log(`  ${y.year} : ${y.cities.filter((c) => c.ok).length}/${DVF_CITIES.length} villes${y.cities.some((c) => !c.ok) ? ` (manque : ${y.cities.filter((c) => !c.ok).map((c) => c.id).join(', ')})` : ''}`);
  // Par année et par ville : ce qui tient réellement.
  const years = rep.presentYears;
  const stats = yearCityStats(trimmed.kept, years);
  console.log(`\nAnnées présentes : ${compressYears(years)}. Années absentes : ${compressYears(rep.absentYears)}${rep.absentYears.length ? ' (aucun fichier : elles ne comptent dans aucun pourcentage ci-dessus)' : ''}.`);
  console.log(`Mois de chauffe : janvier à novembre ${years[0]} reposent sur moins de ${WINDOW_MONTHS} mois de ventes (la fenêtre se remplit peu à peu) ; ils sont à lire avec prudence.`);
  console.log(`\nVentes retenues par année et par ville (le signe « * » = année maigre : plus de la moitié des quartiers sous ${MIN_SALES} ventes sur l'année) :`);
  console.log('Ville'.padEnd(16) + years.map((y) => String(y).padStart(8)).join(''));
  for (const c of DVF_CITIES) console.log(c.name.padEnd(16) + years.map((y) => { const s = stats.find((x) => x.year === y && x.cityId === c.id)!; return `${s.sales}${s.thin ? '*' : ' '}`.padStart(8); }).join(''));
  console.log('\nQuartiers sous ' + MIN_SALES + ' ventes sur l\'année (sur le nombre de quartiers de la ville) :');
  const citiesBelow = DVF_CITIES.filter((c) => stats.some((x) => x.cityId === c.id && x.zonesBelowMin > 0));
  if (!citiesBelow.length) console.log(`  Aucun quartier sous ${MIN_SALES} ventes sur l'année, pour aucune ville, sur les années présentes.`);
  else {
    for (const c of citiesBelow) console.log(`  ${c.name.padEnd(14)} ${stats.filter((x) => x.cityId === c.id && x.zonesBelowMin > 0).map((x) => `${x.year}: ${x.zonesBelowMin}/${x.zones}`).join('  ')}`);
    const fine = DVF_CITIES.filter((c) => !citiesBelow.includes(c)).map((c) => c.name);
    console.log(`  Aucun quartier sous ${MIN_SALES} ventes pour : ${fine.length ? fine.join(', ') : 'aucune ville'}.`);
  }
  const thinYears = years.filter((y) => stats.filter((x) => x.year === y && x.thin).length >= 3);
  if (thinYears.length) console.log(`Années maigres pour au moins 3 villes : ${thinYears.join(', ')}.`);
  const noPostal = trimmed.kept.filter((x) => !x.zone && !DVF_CITIES.find((c) => c.codes.includes(x.code))?.districts).length;
  if (noPostal) console.log(`\nZones : ${noPostal} vente(s) hors arrondissement sans code postal connu (elles ne servent qu'à la médiane de la ville). Si ce nombre est très grand, les fichiers datent d'avant l'ajout du code postal : voir docs/immobilier-reel-preparation.md. Détail : npm run immo:zones-report.`);
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
