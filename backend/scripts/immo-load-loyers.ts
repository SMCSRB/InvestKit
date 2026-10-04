// Charge en base les loyers préparés par immo:import-loyers (backend/data/loyers-anil-AAAA.json). PRÉPARATION : le jeu n'utilise pas encore ces loyers (RENT_MARKET_ENABLED = false).
//   npm run immo:load-loyers -- --file backend/data/loyers-anil-2025.json          simulation : valide et affiche ce qui serait écrit, n'écrit RIEN (aucune base n'est ouverte)
//   npm run immo:load-loyers -- --file … --apply                                    écrit en base, SEULEMENT si la base visée se termine par « _test » (sinon refus). Rejouable : le même fichier n'est jamais importé deux fois.
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';
import { parseRentFile } from '../src/data/realEstate/rents/rentFile';
import { DVF_CITIES } from '../src/data/realEstate/dvf/cities';
import { RENT_GROUPS, RENT_GROUP_LABEL, RENT_MARKET_ENABLED } from '../src/config/rentMarketRules';
import { assertTestDatabase } from './test-give-coins';

const arg = (n: string): string | undefined => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const flag = (n: string) => process.argv.includes(`--${n}`);

const main = async () => {
  const f = arg('file'); if (!f) throw new Error('Précise le fichier : --file backend/data/loyers-anil-AAAA.json');
  const file = path.resolve(f);
  const text = readFileSync(file, 'utf8');
  const parsed = parseRentFile(JSON.parse(text));
  if (!parsed.ok) { console.error(`Fichier refusé, rien n'est importé :\n- ${parsed.errors.join('\n- ')}`); process.exit(1); }
  console.log(`${file}\nMillésime ${parsed.vintage} · ${parsed.rows.length} lignes.`);
  for (const g of RENT_GROUPS) console.log(`  ${RENT_GROUP_LABEL[g].padEnd(26)} ${parsed.rows.filter((r) => r.group === g).length}`);
  console.log('Lignes par ville :');
  for (const c of DVF_CITIES) console.log(`  ${c.name.padEnd(14)} ${parsed.rows.filter((r) => c.codes.includes(r.commune)).length}`);
  if (!flag('apply')) { console.log('\nSimulation : rien n\'est écrit. Ajoute --apply pour écrire (base de test seulement).'); return; }
  const database = assertTestDatabase(process.env.DATABASE_URL);        // refuse toute base qui ne finit pas par « _test » AVANT de se connecter
  console.log(`\nBase visée : ${database}`);
  const { initDatabase, closePool } = await import('../src/utils/db');
  const { rentMarketService } = await import('../src/services/rentMarketService');
  initDatabase();
  try {
    const r = await rentMarketService.importRents(parsed, createHash('sha256').update(text).digest('hex'));
    console.log(r.imported ? `Importé : ${r.rows} lignes (import n° ${r.importId}).` : `Déjà importé (import n° ${r.importId}) : rien de plus n'a été écrit.`);
    console.log(`Source « anil » en base, ${RENT_MARKET_ENABLED ? 'ACTIVE' : 'NON activée'} pour les joueurs.`);
  } finally { await closePool(); }
};
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
