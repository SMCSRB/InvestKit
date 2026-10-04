// Rapport de découpage des villes en zones : lit les fichiers DVF téléchargés (comme immo:import-dvf), n'écrit RIEN en base, ne touche aucun serveur.
//   npm run immo:zones-report -- --dir backend/data/dvf-brut
// Affiche, ville par ville : nombre de zones (code postal ou arrondissement), ventes par zone et par année, zones fiables (au moins 10 appartements sur 12 mois),
// essai du découpage par section cadastrale, codes postaux inattendus. Le texte est aussi écrit dans backend/data/dvf-zones-rapport.txt.
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { loadSalesFromDir } from '../src/data/realEstate/dvf/pipeline';
import { trimOutliers } from '../src/data/realEstate/dvf/clean';
import { zoningReport, renderZoning } from '../src/data/realEstate/dvf/zoning';

const arg = (n: string): string | undefined => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };

try {
  const dir = path.resolve(arg('dir') ?? path.join(__dirname, '..', 'data', 'dvf-brut'));
  const { sales } = loadSalesFromDir(dir);
  const text = renderZoning(zoningReport(trimOutliers(sales).kept));
  const out = path.join(__dirname, '..', 'data', 'dvf-zones-rapport.txt');
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, text);
  console.log(text + `(rapport écrit dans ${out})`);
} catch (e) { console.error(e instanceof Error ? e.message : e); process.exit(1); }
