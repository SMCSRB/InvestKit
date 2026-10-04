// Prépare les taux de TAXE FONCIÈRE RÉELS HORS LIGNE : lit le fichier CSV de Terralyse (data.gouv.fr, « Source : Terralyse ») que TU as téléchargé après avoir lu la page (licence, date, colonnes), valide, et écrit un petit JSON.
// Aucun téléchargement, aucune base, aucun serveur. Seules les communes des 12 villes sont gardées.
//   npm run immo:import-taxe-fonciere -- --file backend/data/taxe-fonciere-brut/taux.csv
// Options : --out <fichier json> (défaut backend/data/taxe-fonciere-terralyse.json) · --check (rapport seulement, n'écrit rien)
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { parseReiCsv } from '../src/data/realEstate/taxes/rei';
import { parseTaxRateFile } from '../src/data/realEstate/taxes/rateFile';
import { DVF_CITIES } from '../src/data/realEstate/dvf/cities';
import { taxCommuneOf } from '../src/data/realEstate/taxes/rei';
import { propertyTaxEstimate } from '../src/engine/immo/propertyTax';
import { CADASTRAL_BASE_NET_EUR_PER_SQM, PROPERTY_TAX_ATTRIBUTION, PROPERTY_TAX_BASE_NOTE } from '../src/config/propertyTaxRules';

const arg = (n: string): string | undefined => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const flag = (n: string) => process.argv.includes(`--${n}`);

const main = () => {
  const f = arg('file'); if (!f) throw new Error('Précise le fichier : --file chemin/du/fichier.csv (taux de taxe foncière, Terralyse).');
  const file = path.resolve(f);
  const r = parseReiCsv(readFileSync(file));
  console.log(`${file} : ${r.linesRead} lignes lues, ${r.communesInFile} communes dans le fichier (Terralyse en annonce 5 206), ${r.rows.length} taux retenus (communes des 12 villes).`);
  if (!r.ok) { console.error(`REFUSÉ, rien n'est écrit :\n- ${r.errors.join('\n- ')}`); process.exit(1); }
  const years = [...new Set(r.rows.map((x) => x.year))];
  console.log(`Années : ${years.join(', ')}. Paris, Lyon et Marseille (communes entières 75056, 69123, 13055) : présentes.\n`);
  console.log(`Taux global de taxe foncière bâtie = communal + intercommunal (TEOM à part, récupérable sur le locataire), dernière année. À comparer avec la page de la source. Estimation pour 50 m² avec une base ESTIMÉE de ${CADASTRAL_BASE_NET_EUR_PER_SQM} €/m² (valeur de jeu) :`);
  for (const c of DVF_CITIES) {
    const code = taxCommuneOf(c.id);
    const last = [...r.rows.filter((x) => x.commune === code)].pop();
    if (last) console.log(`  ${c.name.padEnd(14)} ${code}  ${String(last.communalPct).padStart(7)} % + ${String(last.intercommunalPct).padStart(6)} % = ${String(last.ratePct).padStart(7)} % (${last.year}) · TEOM ${last.teomPct === null ? 'non fournie' : `${last.teomPct} %`} → ~${propertyTaxEstimate(50, last).annualEur} €/an`);
  }
  if (r.emptyIntercommunal.length) console.log(`\nATTENTION : taux intercommunal VIDE (compté 0) pour : ${r.emptyIntercommunal.join(', ')}. Vérifie sur la page que ces communes n'ont pas de taux d'intercommunalité.`);
  console.log(`\n${PROPERTY_TAX_BASE_NOTE}`);
  const json = { source: 'Terralyse : taux de taxe foncière par commune (data.gouv.fr)', attribution: PROPERTY_TAX_ATTRIBUTION, columns: ['commune', 'année', 'taux global (%)', 'taux communal (%)', 'taux intercommunal (%)', 'TEOM (%)'], rows: r.rows.map((x) => [x.commune, x.year, x.ratePct, x.communalPct, x.intercommunalPct, x.teomPct]) };
  const check = parseTaxRateFile(json);
  if (!check.ok) { console.error(`Contrôle final refusé :\n- ${check.errors.join('\n- ')}`); process.exit(1); }
  if (flag('check')) { console.log(`\n--check : rien n'est écrit (${r.rows.length} lignes seraient écrites).`); return; }
  const out = path.resolve(arg('out') ?? path.join(__dirname, '..', 'data', 'taxe-fonciere-terralyse.json'));
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(json));
  console.log(`\nÉcrit : ${out} (${r.rows.length} lignes).`);
};
try { main(); } catch (e) { console.error(e instanceof Error ? e.message : e); process.exit(1); }
