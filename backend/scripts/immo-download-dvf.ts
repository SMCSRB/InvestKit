// Télécharge les DVF géolocalisées (DGFiP, Licence Ouverte 2.0) des 12 villes, un fichier par commune ou arrondissement et par année, dans backend/data/dvf-brut/AAAA/CODE.csv.
// À LANCER PAR ANDREJA, jamais automatique. Aucune base de données, aucun secret. Seul le site files.data.gouv.fr est contacté. Les fichiers déjà présents sont conservés (on ne supprime rien).
//   npm run immo:download-dvf -- --from 2014 --to 2022
// Options : --dir <dossier> (défaut backend/data/dvf-brut) · --city paris (une seule ville) · --dry (affiche les adresses sans rien télécharger)
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { DVF_CITIES, DVF_FIRST_YEAR, dvfUrl } from '../src/data/realEstate/dvf/cities';

const arg = (n: string): string | undefined => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const flag = (n: string) => process.argv.includes(`--${n}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const main = async () => {
  const from = Number(arg('from') ?? DVF_FIRST_YEAR); const to = Number(arg('to') ?? 2022);
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < DVF_FIRST_YEAR || to < from) throw new Error(`Années invalides (de ${DVF_FIRST_YEAR} à une année postérieure).`);
  const dir = path.resolve(arg('dir') ?? path.join(__dirname, '..', 'data', 'dvf-brut'));
  const cities = DVF_CITIES.filter((c) => !arg('city') || c.id === arg('city'));
  if (!cities.length) throw new Error('Ville inconnue.');
  let ok = 0; let skipped = 0; const missing: string[] = [];
  for (let year = from; year <= to; year++) {
    for (const c of cities) for (const code of c.codes) {
      const url = dvfUrl(year, code, c.department);
      const file = path.join(dir, String(year), `${code}.csv`);
      if (flag('dry')) { console.log(url); continue; }
      if (existsSync(file)) { skipped++; continue; }
      const res = await fetch(url).catch(() => null);
      if (!res || !res.ok) { missing.push(`${year} ${code} (${res ? `HTTP ${res.status}` : 'réseau'})`); await sleep(300); continue; }
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      ok++; await sleep(300);                      // on ménage le serveur public
    }
  }
  if (flag('dry')) return;
  console.log(`${ok} fichier(s) téléchargé(s), ${skipped} déjà présent(s) dans ${dir}.`);
  if (missing.length) console.log(`Introuvables (${missing.length}) : ${missing.slice(0, 20).join(', ')}${missing.length > 20 ? ', …' : ''}\n→ un code commune ou une adresse à vérifier.`);
};
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
