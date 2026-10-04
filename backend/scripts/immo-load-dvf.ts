// Charge en base les médianes de prix DVF préparées par immo:import-dvf (backend/data/dvf-marche.json). PRÉPARATION : le jeu n'utilise pas encore ces prix (DVF_MARKET_ENABLED = false).
//   npm run immo:load-dvf                    simulation : valide le fichier et affiche ce qui serait écrit, n'écrit RIEN (aucune base n'est ouverte)
//   npm run immo:load-dvf -- --apply         écrit en base, SEULEMENT si la base visée se termine par « _test » (sinon refus). Rejouable : le même fichier n'est jamais importé deux fois.
// Option : --file <fichier json>
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';
import { parseMarketFile } from '../src/data/realEstate/dvf/marketFile';
import { cityOfZone, DVF_CITIES } from '../src/data/realEstate/dvf/cities';
import { assertTestDatabase } from './test-give-coins';
import { DVF_MARKET_ENABLED } from '../src/config/dvfMarketRules';

const arg = (n: string): string | undefined => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const flag = (n: string) => process.argv.includes(`--${n}`);

const main = async () => {
  const file = path.resolve(arg('file') ?? path.join(__dirname, '..', 'data', 'dvf-marche.json'));
  const text = readFileSync(file, 'utf8');
  const parsed = parseMarketFile(JSON.parse(text));
  if (!parsed.ok) { console.error(`Fichier refusé, rien n'est importé :\n- ${parsed.errors.join('\n- ')}`); process.exit(1); }
  const meta = parsed.meta!;
  console.log(`${file}\nPériode ${meta.from} à ${meta.to} · médiane glissante ${meta.windowMonths} mois · au moins ${meta.minSales} ventes · ${parsed.rows.length} lignes avec prix, ${parsed.skippedNoPrice} mois sans prix fiable (non stockés).`);
  console.log('Ligne par ville :');
  for (const c of DVF_CITIES) console.log(`  ${c.name.padEnd(14)} ${parsed.rows.filter((r) => cityOfZone(r.zone)?.id === c.id).length}`);
  if (!flag('apply')) { console.log('\nSimulation : rien n\'est écrit. Ajoute --apply pour écrire (base de test seulement).'); return; }
  const database = assertTestDatabase(process.env.DATABASE_URL);        // refuse toute base qui ne finit pas par « _test » AVANT de se connecter
  console.log(`\nBase visée : ${database}`);
  const { initDatabase, closePool } = await import('../src/utils/db');
  const { dvfMarketService } = await import('../src/services/dvfMarketService');
  initDatabase();
  try {
    const checksum = createHash('sha256').update(text).digest('hex');
    const r = await dvfMarketService.importMarket(parsed, checksum);
    console.log(r.imported ? `Importé : ${r.rows} lignes (import n° ${r.importId}).` : `Déjà importé (import n° ${r.importId}) : rien de plus n'a été écrit.`);
    console.log(`Source « dvf » en base, ${DVF_MARKET_ENABLED ? 'ACTIVE' : 'NON activée'} pour les joueurs.`);
  } finally { await closePool(); }
};
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
