// Télécharge les DVF (DGFiP, Licence Ouverte 2.0) des 12 villes dans backend/data/dvf-brut/AAAA/CODE.csv, un fichier par commune ou arrondissement et par année.
// À LANCER PAR ANDREJA, jamais automatique. Aucune base de données, aucun secret. Les fichiers déjà présents ne sont JAMAIS retéléchargés ni réécrits, et rien n'est supprimé.
//   npm run immo:download-dvf -- --from 2014 --to 2022
//   (2021 et 2022 : un fichier par commune ; années plus anciennes : fichier départemental ou national, FILTRÉ AU FIL DE L'EAU, jamais enregistré en entier)
// Options :
//   --dir <dossier>        défaut backend/data/dvf-brut
//   --city paris           une seule ville
//   --url "<modèle>"       adresse exacte à essayer en premier ({year}, {dep}, {code} remplacés) ; plusieurs --url possibles
//   --file <fichier>       fichier DVF déjà téléchargé à la main (.csv ou .csv.gz, national ou départemental) ; avec --year AAAA ; le fichier n'est pas supprimé
//   --dry                  affiche le plan et les adresses, ne télécharge rien
// Le rapport (adresses essayées, résultat exact de chacune, adresses à vérifier) est affiché et écrit dans backend/data/dvf-rapport-telechargement.txt.
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { DVF_CITIES, DVF_FIRST_YEAR } from '../src/data/realEstate/dvf/cities';
import { DEFAULT_SOURCES, customSource } from '../src/data/realEstate/dvf/sources';
import { downloadYear, realFetcher, renderReport, YearReport } from '../src/data/realEstate/dvf/download';
import { filterToFiles, openDvfStream } from '../src/data/realEstate/dvf/filter';
import { FormatError } from '../src/data/realEstate/dvf/format';

const args = (n: string): string[] => process.argv.flatMap((a, i, all) => (a === `--${n}` && all[i + 1] ? [all[i + 1]] : []));
const arg = (n: string): string | undefined => args(n)[0];
const flag = (n: string) => process.argv.includes(`--${n}`);

const main = async () => {
  const dataDir = path.join(__dirname, '..', 'data');
  const dir = path.resolve(arg('dir') ?? path.join(dataDir, 'dvf-brut'));
  const cities = DVF_CITIES.filter((c) => !arg('city') || c.id === arg('city'));
  if (!cities.length) throw new Error('Ville inconnue.');
  const codes = cities.flatMap((c) => c.codes.map((code) => ({ code, dep: c.department })));
  const when = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const reportPath = path.join(dataDir, 'dvf-rapport-telechargement.txt');

  // Fichier déjà téléchargé à la main.
  if (arg('file')) {
    const year = Number(arg('year'));
    if (!Number.isInteger(year) || year < DVF_FIRST_YEAR) throw new Error('Avec --file, précise l\'année : --year AAAA.');
    const file = path.resolve(arg('file')!);
    if (!existsSync(file)) throw new Error(`Fichier introuvable : ${file}`);
    const yearDir = path.join(dir, String(year));
    const wanted = new Set(codes.map((c) => c.code).filter((c) => !existsSync(path.join(yearDir, `${c}.csv`))));
    if (!wanted.size) { console.log(`${year} : tous les fichiers existent déjà, rien à faire.`); return; }
    const r = await filterToFiles(await openDvfStream(createReadStream(file)), { dir: yearDir, wanted, yearOnly: undefined });
    console.log(`${file} : ${r.rowsRead} lignes lues (format ${r.format}), ${r.rowsKept} gardées, ${r.written.length} fichier(s) écrit(s) dans ${yearDir}. Le fichier d'origine n'a pas été touché.`);
    return;
  }

  const from = Number(arg('from') ?? DVF_FIRST_YEAR); const to = Number(arg('to') ?? 2022);
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < DVF_FIRST_YEAR || to < from) throw new Error(`Années invalides (de ${DVF_FIRST_YEAR} à une année postérieure).`);
  const sources = [...args('url').map(customSource), ...DEFAULT_SOURCES];
  if (flag('dry')) {
    for (let year = from; year <= to; year++) {
      const missing = codes.filter((c) => !existsSync(path.join(dir, String(year), `${c.code}.csv`)));
      console.log(`${year} : ${missing.length === 0 ? 'déjà complet' : `${missing.length} fichier(s) manquant(s)`}`);
      if (missing.length) for (const s of sources) console.log(`    ${s.label}\n      ${s.url({ year, dep: missing[0].dep, code: missing[0].code })}`);
    }
    return;
  }
  const reports: YearReport[] = [];
  for (let year = from; year <= to; year++) {
    console.log(`\n${year} :`);
    const rep = await downloadYear({ year, dir: path.join(dir, String(year)), codes, sources, fetcher: realFetcher, log: (s) => console.log(s) })
      .catch((e): YearReport => ({ year, state: 'echec', method: null, written: 0, alreadyThere: 0, rowsRead: 0, rowsKept: 0, attempts: [], missingCodes: [], notes: [e instanceof FormatError ? e.message : String(e)] }));
    reports.push(rep);
    console.log(`  → ${rep.state}${rep.method ? ` (${rep.method})` : ''}`);
  }
  const text = renderReport(reports, when);
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(reportPath, text);
  console.log('\n' + text + `(rapport écrit dans ${reportPath})`);
};
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
