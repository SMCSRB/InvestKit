// Import de l'historique de cours du domaine Crypto dans PostgreSQL. À lancer SUR TON SERVEUR (il faut accès aux fournisseurs).
//
//  Journalier, toutes les pièces du catalogue, depuis le début (CryptoCompare, clé gratuite) :
//    CRYPTOCOMPARE_API_KEY=xxxx npm run crypto:import -- --provider cryptocompare --all --tf 1d --from 2010-01-01
//  Horaire des grandes pièces (Binance Vision, sans clé) :
//    npm run crypto:import -- --provider binance-vision --symbols BTC,ETH,BNB,XRP,SOL --tf 1h --from 2017-08-01
//  Minutes (volumineux : quelques pièces, période courte) :
//    npm run crypto:import -- --provider binance-vision --symbols BTC,ETH --tf 1m --from 2024-01-01
//  Capitalisation (CoinGecko, clé « demo » gratuite : ~1 an d'historique) :
//    COINGECKO_API_KEY=xxxx npm run crypto:import -- --marketcaps --symbols BTC,ETH --days 365
//  Jeu FICTIF de démonstration (pour essayer l'interface sans import réel) :
//    npm run crypto:import -- --demo
// Options : --to AAAA-MM-JJ (défaut : aujourd'hui) · --continue (ne pas s'arrêter à la première erreur)
import { initDatabase, closePool, executeSchema } from '../src/utils/db';
import { CATALOG } from '../src/data/crypto/catalog';
import { cryptoCompareProvider, binanceVisionProvider } from '../src/services/crypto/providers';
import { importDemo, importMarketCaps, runImport } from '../src/services/crypto/importer';
import { cryptoDataService } from '../src/services/crypto/dataService';

const arg = (name: string): string | undefined => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const flag = (name: string) => process.argv.includes(`--${name}`);

const main = async () => {
  initDatabase();
  await executeSchema();
  const log = (m: string) => console.log(m);
  if (flag('demo')) { await cryptoDataService.seedCatalog(); await importDemo(log); console.log('⚠️  Jeu FICTIF importé : à ne jamais présenter comme de vrais cours.'); return; }
  const symbols = flag('all') ? CATALOG.map((c) => c.symbol) : (arg('symbols') ?? '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  if (!symbols.length) { console.error('Indique --symbols BTC,ETH ou --all (voir l\'en-tête du fichier).'); process.exit(1); }
  if (flag('marketcaps')) { await importMarketCaps(symbols, (arg('days') as any) === 'max' ? 'max' : Number(arg('days') ?? 365), process.env.COINGECKO_API_KEY, undefined, log); return; }
  const tf = (arg('tf') ?? '1d') as '1d' | '1h' | '1m';
  if (!['1d', '1h', '1m'].includes(tf)) { console.error('--tf doit valoir 1d, 1h ou 1m.'); process.exit(1); }
  const provider = arg('provider') === 'binance-vision' ? binanceVisionProvider() : arg('provider') === 'cryptocompare' ? cryptoCompareProvider(process.env.CRYPTOCOMPARE_API_KEY) : null;
  if (!provider) { console.error('Indique --provider cryptocompare ou --provider binance-vision.'); process.exit(1); }
  if (provider.id === 'cryptocompare' && !process.env.CRYPTOCOMPARE_API_KEY) console.warn('⚠️  CRYPTOCOMPARE_API_KEY non défini : quota très réduit.');
  const fromMs = Date.parse(`${arg('from') ?? '2010-01-01'}T00:00:00Z`), toMs = arg('to') ? Date.parse(`${arg('to')}T00:00:00Z`) : Date.now();
  const reports = await runImport({ provider, symbols, tf, fromMs, toMs, log, continueOnError: flag('continue') });
  const ok = reports.filter((r) => r.status === 'ok').length;
  console.log(`\nTerminé : ${ok} actif(s) importé(s), ${reports.filter((r) => r.status === 'empty').length} vide(s), ${reports.filter((r) => r.status === 'error').length} en erreur.`);
};

main().then(() => closePool()).catch(async (e) => { console.error(e); await closePool(); process.exit(1); });
