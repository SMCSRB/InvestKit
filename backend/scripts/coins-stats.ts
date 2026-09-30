// Statistique d'administration : pièces créées / détruites / échangées par domaine, et crédit bancaire.
//   npm run coins-stats
import { initDatabase, closePool } from '../src/utils/db';
import { investcoinsRepository } from '../src/repositories/investcoinsRepository';
import { bankService } from '../src/services/bankService';

(async () => {
  initDatabase();
  const stats = await investcoinsRepository.ledgerStatsByDomain();
  const cols = ['Domaine', 'créées', 'détruites', 'crédit créé', 'remboursé', 'échanges (net)', 'solde injecté', 'écritures'];
  console.log(cols.map((c, i) => (i === 0 ? c.padEnd(18) : c.padStart(14))).join(' '));
  for (const [domain, d] of Object.entries(stats)) {
    const v = [d.created, d.destroyed, d.credited, d.repaid, d.exchangeNet, d.netInjected, d.entries];
    console.log(domain.padEnd(18), v.map((x) => String(x).padStart(14)).join(' '));
  }
  const bank = await bankService.adminStats();
  console.log('\nBanque : dette en cours par produit et domaine (pièces)');
  for (const r of bank.outstanding) console.log(`  ${r.product.padEnd(10)} ${r.domain.padEnd(14)} ${String(r.loans).padStart(4)} prêts  ${String(r.outstandingCoins).padStart(10)} 🪙`);
  console.log(`  prêts en défaut : ${bank.defaultedLoans} · comptes bloqués : ${bank.blockedAccounts}`);
  await closePool();
})().catch((e) => { console.error(e); process.exit(1); });
