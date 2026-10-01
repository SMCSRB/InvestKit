// Usage : npm run education-abuse                 → RAPPORT seulement (ne modifie rien)
//         npm run education-abuse -- --apply      → corrige les comptes listés (retire les pièces indues, sans jamais passer en négatif)
//         npm run education-abuse -- --apply --user <id>   → corrige un seul compte
// Voir docs/faille-education.md (marche à suivre pas à pas, avec sauvegarde avant).
import { initDatabase, closePool } from '../src/utils/db';
import { educationAbuseService } from '../src/services/educationAbuseService';

const main = async (): Promise<void> => {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const only = argv.includes('--user') ? argv[argv.indexOf('--user') + 1] : null;
  initDatabase();
  const rows = (await educationAbuseService.detect()).filter((r) => !only || r.userId === only);
  const ledger = await educationAbuseService.detectByLedger();
  if (rows.length === 0 && ledger.length === 0) { console.log('✅ Aucun compte suspect.'); await closePool(); return; }
  console.log(`\n${rows.length} compte(s) avec des lignes d'éducation INVALIDES :`);
  for (const r of rows) console.log(` - ${r.email} (${r.userId}) : ${r.invalidRows} ligne(s), ${r.coinsGranted} 🪙 obtenues, XP ${r.xpGranted}, solde actuel ${r.balance} 🪙`);
  if (ledger.length) { console.log(`\n${ledger.length} compte(s) dont le registre dépasse le nombre de chapitres existants (à examiner à la main) :`); for (const l of ledger) console.log(` - ${l.email} (${l.userId}) : ${l.rewards} récompenses (max légitime : ${l.allowed})`); }
  if (!apply) { console.log('\nRapport seulement : rien n\'a été modifié. Pour corriger : npm run education-abuse -- --apply'); await closePool(); return; }
  let removed = 0; let unrecovered = 0;
  for (const r of rows) {
    const res = await educationAbuseService.correct(r.userId);
    removed += res.removed; unrecovered += res.unrecovered;
    console.log(` ✔ ${r.email} : −${res.removed} 🪙${res.unrecovered ? ` (non récupérables car déjà dépensées : ${res.unrecovered} 🪙)` : ''}`);
  }
  console.log(`\nTerminé : ${removed} 🪙 retirés, ${unrecovered} 🪙 non récupérables (déjà dépensées).`);
  await closePool();
};
main().catch((e) => { console.error(e); process.exit(1); });
