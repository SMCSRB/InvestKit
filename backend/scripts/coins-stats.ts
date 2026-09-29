// Statistique d'administration : pièces créées / détruites / échangées par domaine.
//   npm run coins-stats
import { initDatabase, closePool } from '../src/utils/db';
import { investcoinsRepository } from '../src/repositories/investcoinsRepository';

(async () => {
  initDatabase();
  const stats = await investcoinsRepository.ledgerStatsByDomain();
  console.log('Domaine'.padEnd(18), 'créées'.padStart(12), 'détruites'.padStart(12), 'échanges (net)'.padStart(16), 'solde injecté'.padStart(14), 'écritures'.padStart(10));
  for (const [domain, d] of Object.entries(stats)) {
    console.log(domain.padEnd(18), String(d.created).padStart(12), String(d.destroyed).padStart(12), String(d.exchangeNet).padStart(16), String(d.netInjected).padStart(14), String(d.entries).padStart(10));
  }
  await closePool();
})().catch((e) => { console.error(e); process.exit(1); });
