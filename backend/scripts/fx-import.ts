// Import du taux de change EUR/USD de la BCE dans PostgreSQL. À lancer SUR TON SERVEUR (il faut accès au site de la BCE) ; jamais automatique.
//
//  Depuis le site de la BCE (une ligne par jour ouvré, depuis 2014) :
//    npm run fx:import -- --from 2014-01-01
//  Depuis un fichier déjà téléchargé (CSV de l'API de données de la BCE, ou eurofxref-hist.csv) :
//    npm run fx:import -- --file ./eurofxref-hist.csv
//  Taux FICTIFS de démonstration (jamais sur une base de production) :
//    npm run fx:import -- --demo
// Options : --to AAAA-MM-JJ (défaut : aujourd'hui) · --check (lit et vérifie le fichier, n'écrit rien)
import { readFileSync } from 'fs';
import { initDatabase, closePool, executeSchema } from '../src/utils/db';
import { parseEcbCsv } from '../src/engine/fx';
import { fxService, FX_SOURCE_ECB } from '../src/services/fxService';

const arg = (name: string): string | undefined => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const flag = (name: string) => process.argv.includes(`--${name}`);

const ecbUrl = (from: string, to: string): string =>
  `https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?format=csvdata&startPeriod=${from}&endPeriod=${to}`;

const main = async () => {
  if (flag('check') && !arg('file')) { console.error('--check s\'utilise avec --file.'); process.exit(1); }
  if (!flag('check')) { initDatabase(); await executeSchema(); }
  if (flag('demo')) {
    const n = await fxService.seedDemoRates();
    console.log(`⚠️  ${n} taux FICTIFS de démonstration écrits (marqués « demo »). À ne jamais présenter comme de vrais taux.`);
    return;
  }
  let text: string;
  if (arg('file')) text = readFileSync(arg('file')!, 'utf8');
  else {
    const from = arg('from') ?? '2014-01-01', to = arg('to') ?? new Date().toISOString().slice(0, 10);
    const url = ecbUrl(from, to);
    console.log(`Téléchargement : ${url}`);
    const res = await fetch(url, { headers: { Accept: 'text/csv' } });
    if (!res.ok) throw new Error(`HTTP ${res.status} pour ${url}`);
    text = await res.text();
  }
  const { rates, rejected } = parseEcbCsv(text, 'USD');
  if (!rates.length) throw new Error('Aucun taux valide dans ce fichier : rien n\'est écrit.');
  console.log(`${rates.length} taux valides du ${rates[0].day} au ${rates[rates.length - 1].day} (${rejected} ligne(s) ignorée(s) : valeur vide, N/A ou invalide).`);
  if (flag('check')) { console.log('Vérification seulement : rien n\'est écrit.'); return; }
  const n = await fxService.importRates(rates, FX_SOURCE_ECB);
  console.log(`✓ ${n} taux écrits (source : ${FX_SOURCE_ECB}).`);
};

main().catch((e) => { console.error(`✗ ${e.message}`); process.exitCode = 1; }).finally(() => closePool().catch(() => {}));
