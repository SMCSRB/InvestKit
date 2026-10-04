// Prépare les loyers RÉELS de l'Immobilier HORS LIGNE : lit les fichiers CSV de la « Carte des loyers » (ANIL) que TU as téléchargés après avoir lu la page du jeu de données
// (licence, attribution, millésime), valide, ne garde que les communes des 12 villes et écrit UN petit fichier JSON. Aucun téléchargement, aucune base, aucun serveur.
//   npm run immo:import-loyers -- --vintage 2025 --dir backend/data/loyers-brut/2025
//   (fichiers reconnus d'après leur nom : …app12… = T1-T2, …app3… = T3 et plus, …mai… = maisons, …app… = tous les appartements)
//   npm run immo:import-loyers -- --vintage 2025 --all f1.csv --t12 f2.csv --t3 f3.csv --house f4.csv     (noms de fichiers imposés)
// Options : --out <fichier json> (défaut backend/data/loyers-anil-AAAA.json) · --check (rapport seulement, n'écrit rien)
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { parseAnilCsv, groupOfFileName, RentRow } from '../src/data/realEstate/rents/anil';
import { parseRentFile } from '../src/data/realEstate/rents/rentFile';
import { DVF_CITIES, allCodes, zoneLabel } from '../src/data/realEstate/dvf/cities';
import { RENT_GROUPS, RENT_GROUP_LABEL, RentGroup, rentSnapshotDate, RENT_ATTRIBUTION } from '../src/config/rentMarketRules';

const arg = (n: string): string | undefined => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const flag = (n: string) => process.argv.includes(`--${n}`);

const main = () => {
  const vintage = Number(arg('vintage'));
  if (!Number.isInteger(vintage) || vintage < 2022) throw new Error('Précise le millésime : --vintage AAAA (2022 ou plus).');
  const files: Partial<Record<RentGroup, string>> = {};
  for (const g of RENT_GROUPS) { const f = arg(g); if (f) files[g] = path.resolve(f); }
  const dir = arg('dir');
  if (dir) {
    const d = path.resolve(dir);
    if (!existsSync(d)) throw new Error(`Dossier introuvable : ${d}`);
    for (const f of readdirSync(d).filter((x) => /\.csv$/i.test(x))) {
      const g = groupOfFileName(f);
      if (!g) { console.log(`Fichier ignoré (série non reconnue d'après son nom) : ${f}. Utilise --all, --t12, --t3 ou --house.`); continue; }
      if (files[g]) throw new Error(`Deux fichiers pour la série « ${RENT_GROUP_LABEL[g]} » : ${path.basename(files[g]!)} et ${f}. Impose les noms avec --all/--t12/--t3/--house.`);
      files[g] = path.join(d, f);
    }
  }
  const have = RENT_GROUPS.filter((g) => files[g]);
  if (!have.length) throw new Error('Aucun fichier de loyers : donne --dir <dossier> ou --all/--t12/--t3/--house.');
  const wanted = new Set(allCodes());
  const rows: RentRow[] = []; const problems: string[] = [];
  console.log(`Carte des loyers, millésime ${vintage} (biens mis en location au 3e trimestre ${vintage}, disponible à partir du ${rentSnapshotDate(vintage)}).`);
  for (const g of have) {
    const r = parseAnilCsv(readFileSync(files[g]!), g, wanted);
    console.log(`\n${RENT_GROUP_LABEL[g]} : ${path.basename(files[g]!)} — ${r.read} communes lues, ${r.rows.length} dans les 12 villes, ${r.outsideScope} hors périmètre.`);
    if (!r.ok) { problems.push(`${RENT_GROUP_LABEL[g]} : ${r.errors.join(' | ')}`); console.log(`  REFUSÉ : ${r.errors.join('\n  ')}`); continue; }
    rows.push(...r.rows);
  }
  const missingSeries = RENT_GROUPS.filter((g) => !files[g]);
  if (missingSeries.length) console.log(`\nSéries non fournies : ${missingSeries.map((g) => RENT_GROUP_LABEL[g]).join(', ')} (pas de loyer pour ces biens, donc pas de rentabilité).`);
  // Couverture : pour chaque série fournie, les communes / arrondissements des 12 villes ABSENTS du fichier (aucun loyer, donc aucune rentabilité affichée pour eux).
  console.log('\nCouverture par ville (communes ou arrondissements trouvés / attendus ; nature de l\'estimation : « maille » = groupe de communes voisines) :');
  for (const c of DVF_CITIES) {
    const line = have.map((g) => { const mine = rows.filter((r) => r.group === g && c.codes.includes(r.commune)); const maille = mine.filter((r) => r.kind === 'maille').length; return `${g} ${mine.length}/${c.codes.length}${maille ? ` (${maille} maille)` : ''}`; }).join(' · ');
    console.log(`  ${c.name.padEnd(14)} ${line}`);
  }
  const absent = DVF_CITIES.flatMap((c) => c.codes.filter((code) => have.some((g) => !rows.some((r) => r.group === g && r.commune === code))).map((code) => zoneLabel(code) ?? code));
  if (absent.length) console.log(`\nSans loyer pour au moins une série (aucune rentabilité affichée pour eux) : ${absent.join(', ')}.`);
  if (problems.length) { console.error('\nUn fichier est refusé : rien n\'est écrit.'); process.exit(1); }
  if (!rows.length) { console.error('\nAucune ligne retenue : rien n\'est écrit.'); process.exit(1); }
  const json = {
    source: 'ANIL — « Carte des loyers », loyers d\'annonce par commune (Licence Ouverte 2.0)', attribution: RENT_ATTRIBUTION, vintage, snapshotDate: rentSnapshotDate(vintage),
    unit: '€/m² par mois, charges comprises, loyer d\'annonce, non meublé', columns: ['commune', 'série', 'loyer', 'bas', 'haut', 'estimation', 'observations'],
    rows: rows.map((r) => [r.commune, r.group, r.rent, r.low, r.high, r.kind, r.observations]),
  };
  const check = parseRentFile(json);
  if (!check.ok) { console.error(`\nContrôle final refusé :\n- ${check.errors.join('\n- ')}`); process.exit(1); }
  if (flag('check')) { console.log(`\n--check : rien n'est écrit (${rows.length} lignes seraient écrites).`); return; }
  const out = path.resolve(arg('out') ?? path.join(__dirname, '..', 'data', `loyers-anil-${vintage}.json`));
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(json));
  console.log(`\nÉcrit : ${out} (${rows.length} lignes).`);
};
try { main(); } catch (e) { console.error(e instanceof Error ? e.message : e); process.exit(1); }
