// Prépare l'IRL RÉEL HORS LIGNE : lit le fichier CSV de la série de l'Insee que TU as téléchargé après avoir lu la page (licence, série, date de mise à jour), valide, et écrit un petit JSON.
// Aucun téléchargement, aucune base, aucun serveur.
//   npm run immo:import-irl -- --file backend/data/irl-brut/valeurs_trimestrielles.csv
// Options : --out <fichier json> (défaut backend/data/irl-insee.json) · --check (rapport seulement, n'écrit rien)
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { parseInseeIrl } from '../src/data/realEstate/irl/insee';
import { parseIrlFile } from '../src/data/realEstate/irl/irlFile';
import { annualChangePct, publishedOn } from '../src/engine/immo/irl';
import { IRL_ATTRIBUTION, IRL_PUBLICATION_DAY, IRL_SERIES_ID } from '../src/config/irlRules';

const arg = (n: string): string | undefined => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const flag = (n: string) => process.argv.includes(`--${n}`);

const main = () => {
  const f = arg('file'); if (!f) throw new Error('Précise le fichier : --file chemin/du/fichier.csv (série IRL de l\'Insee).');
  const file = path.resolve(f);
  const r = parseInseeIrl(readFileSync(file));
  console.log(`${file} : ${r.linesRead} lignes lues, ${r.points.length} trimestres retenus.`);
  if (!r.ok) { console.error(`REFUSÉ, rien n'est écrit :\n- ${r.errors.join('\n- ')}`); process.exit(1); }
  const first = r.points[0]; const last = r.points[r.points.length - 1];
  console.log(`Série ${IRL_SERIES_ID} : de ${first.year}-T${first.quarter} (${first.value}) à ${last.year}-T${last.quarter} (${last.value}). Dernière valeur utilisable à partir du ${publishedOn(last)} (hypothèse : publication le ${IRL_PUBLICATION_DAY} du mois suivant).`);
  const t3 = r.points.filter((p) => p.quarter === 3 && p.year >= 2021).map((p) => `${p.year}-T3 ${p.value}${annualChangePct(r.points, p.year, 3) !== null ? ` (${annualChangePct(r.points, p.year, 3)} % sur un an)` : ''}`);
  if (t3.length) console.log(`3e trimestres récents (à comparer avec la page de l'Insee) : ${t3.join(' · ')}`);
  const json = { source: 'Insee : indice de référence des loyers (IRL)', attribution: IRL_ATTRIBUTION, series: IRL_SERIES_ID, columns: ['année', 'trimestre', 'valeur'], rows: r.points.map((p) => [p.year, p.quarter, p.value]) };
  const check = parseIrlFile(json);
  if (!check.ok) { console.error(`Contrôle final refusé :\n- ${check.errors.join('\n- ')}`); process.exit(1); }
  if (flag('check')) { console.log(`\n--check : rien n'est écrit (${r.points.length} lignes seraient écrites).`); return; }
  const out = path.resolve(arg('out') ?? path.join(__dirname, '..', 'data', 'irl-insee.json'));
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(json));
  console.log(`\nÉcrit : ${out} (${r.points.length} lignes).`);
};
try { main(); } catch (e) { console.error(e instanceof Error ? e.message : e); process.exit(1); }
