// Usage :
//   npm run cutover:m1                                    → SIMULATION (par défaut) : calcule et affiche le rapport de chaque joueur, n'écrit RIEN.
//   npm run cutover:m1 -- --apply --i-have-a-backup       → applique la migration (sauvegarde de la base obligatoire AVANT, voir docs/sauvegardes.md).
// Migration « M1 » : parties d'avant l'horloge unique → nouvelle économie, à valeur conservée (docs/migration-m1.md). À lancer en maintenance :
// aucun joueur ne doit jouer pendant le script. Aucun secret n'est affiché : les joueurs sont désignés par les 8 premiers caractères de leur identifiant.
import { initDatabase, query, closePool } from '../src/utils/db';
import { cutoverService, eligibleUsers, CutoverError } from '../src/services/cutoverService';

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  if (apply && !args.includes('--i-have-a-backup')) {
    console.error('Refus : --apply exige --i-have-a-backup (sauvegarde de la base faite juste avant).');
    process.exit(1);
  }
  initDatabase();
  const db = (await query('SELECT current_database() AS db')).rows[0].db;
  console.log(`Base : ${db} — mode : ${apply ? 'APPLICATION' : 'SIMULATION (rien n\'est écrit)'}`);
  const ids = await eligibleUsers();
  console.log(`${ids.length} joueur(s) à migrer.\n`);
  let ok = 0, failed = 0, forgiven = 0, grants = 0;
  for (const id of ids) {
    const tag = id.slice(0, 8);
    try {
      const r = await cutoverService.migrate(id, { dryRun: !apply });
      ok++; forgiven += r.forgiven + r.realEstateShortfall; grants += r.grant;
      console.log(`✓ ${tag}  patrimoine ${r.before.totalWealth} → solde ${r.after.balance}  (liquidé : Bourse ${r.proceeds.stocks}, Crypto ${r.proceeds.crypto + r.proceeds.legacyCrypto}, Immo ${r.proceeds.realEstate} ; dettes payées ${r.debtPaid}${r.forgiven ? `, effacées ${r.forgiven}` : ''} ; complément ${r.grant})`);
    } catch (e) {
      failed++;
      console.log(`✗ ${tag}  ${e instanceof CutoverError ? `${e.code} : ${e.message}` : (e as Error).message}`);
    }
  }
  console.log(`\n${ok} migré(s)${apply ? '' : ' (simulation)'}, ${failed} refusé(s) ; compléments au capital de départ : ${grants} InvestCoins ; dettes effacées faute de moyens : ${forgiven}.`);
  if (!apply) console.log('Simulation terminée : relance avec --apply --i-have-a-backup pour appliquer.');
  await closePool();
  process.exit(failed ? 2 : 0);
};

main().catch((e) => { console.error(e); process.exit(1); });
