import { query, getClient } from '../utils/db';
import { investcoinsRepository } from '../repositories/investcoinsRepository';
import { walletService } from './walletService';
import { tradingSummary, cryptoMarketSummary, realEstateNetCoins } from './overviewService';
import { RE_DOMAIN } from './realEstateService';
import { CRYPTO_DOMAIN } from '../config/cryptoMarketRules';
import { STARTING_CAPITAL } from '../config/economy';

// Migration « M1 » (6b-fin + 6c) : passage des parties d'avant l'horloge unique à la nouvelle économie, À VALEUR CONSERVÉE.
// Pour chaque joueur : tout ce qu'il possède (titres de Bourse, cryptos, biens immobiliers) est converti en InvestCoins à la valeur que le site affichait
// dans son patrimoine (sans frais ni impôt : la même valeur, pas un cadeau), ses prêts sont soldés avec ce produit, ses domaines sont remis à zéro
// (ils repartiront de la date de sa nouvelle partie), puis il est remonté au capital de départ s'il avait moins (écriture tracée « economy_cutover_grant »).
// Le registre n'est JAMAIS réécrit : on ajoute des lignes. Le patrimoine total avant/après est vérifié pour chaque joueur ; au moindre écart, rien n'est écrit.
export interface CutoverReport {
  userId: string;
  before: { balance: number; stocks: number; crypto: number; realEstateNet: number; debt: number; totalWealth: number };
  proceeds: { stocks: number; legacyCrypto: number; crypto: number; realEstate: number };
  debtPaid: number;
  forgiven: number;             // dette que la liquidation ne couvrait pas (le joueur ne repart jamais en négatif ; la dette est effacée)
  realEstateShortfall: number;  // immobilier net négatif non couvert par le solde (même règle)
  grant: number;                // complément pour remonter au capital de départ
  after: { balance: number };
  clearedDomains: string[];
}

export class CutoverError extends Error { constructor(public code: 'FX_UNAVAILABLE' | 'MISMATCH' | 'ALREADY_DONE' | 'NOT_ELIGIBLE', message: string) { super(message); this.name = 'CutoverError'; } }

// Joueurs concernés : pas encore d'horloge unique, pas encore migrés.
export const eligibleUsers = async (): Promise<string[]> =>
  (await query(`SELECT u.id FROM users u WHERE NOT EXISTS (SELECT 1 FROM sim_clocks s WHERE s.user_id = u.id) AND NOT EXISTS (SELECT 1 FROM m1_cutover m WHERE m.user_id = u.id) ORDER BY u.created_at`)).rows.map((r: any) => r.id as string);

const CLEARED = ['virtual_portfolios', 'crypto_accounts', 'crypto_positions', 'crypto_event_log', 're_games', 'leaderboard_rankings', 'bank_credit_balances'];

// dryRun : tout est exécuté dans la transaction puis ANNULÉ (le rapport est donc exact, rien n'est écrit).
export const cutoverService = {
  async migrate(userId: string, opts: { dryRun?: boolean } = {}): Promise<CutoverReport> {
    if ((await query('SELECT 1 FROM m1_cutover WHERE user_id = $1', [userId])).rows.length) throw new CutoverError('ALREADY_DONE', 'Joueur déjà migré');
    if ((await query('SELECT 1 FROM sim_clocks WHERE user_id = $1', [userId])).rows.length) throw new CutoverError('NOT_ELIGIBLE', 'Ce joueur a déjà une horloge unique');

    // Valeurs affichées par le site AVANT la migration (les mêmes fonctions que le patrimoine).
    const snap = await walletService.snapshot(userId);
    const stocks = await tradingSummary(userId, 'stocks');
    const legacyCrypto = await tradingSummary(userId, 'crypto');
    const crypto = await cryptoMarketSummary(userId);
    if (crypto.fxUnavailable) throw new CutoverError('FX_UNAVAILABLE', 'Taux de change indisponible : la valeur de la Crypto ne peut pas être calculée, joueur laissé tel quel.');
    const reNet = await realEstateNetCoins(userId);
    if (stocks.marketValue + legacyCrypto.marketValue + crypto.marketValue !== snap.tradingValue) throw new CutoverError('MISMATCH', 'Les valeurs de titres ne correspondent pas au patrimoine affiché.');

    const client = await getClient();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`clock:${userId}`]);
      await client.query('SELECT 1 FROM investcoins_balance WHERE user_id = $1 FOR UPDATE', [userId]);
      const db = client as any;

      // 1. Produit de la liquidation (échanges : ni création ni destruction de pièces pour les statistiques).
      const credit = async (amount: number, domain: string) => { if (amount > 0) await investcoinsRepository.applyTransaction(userId, amount, 'trade_migration_sell', { domain, migration: 'm1' }, db); };
      await credit(stocks.marketValue, 'stocks');
      await credit(legacyCrypto.marketValue, 'crypto');
      await credit(crypto.marketValue, CRYPTO_DOMAIN);
      let realEstateShortfall = 0;
      if (reNet >= 0) await credit(reNet, RE_DOMAIN);
      else {
        const bal = await investcoinsRepository.getBalance(userId, db);
        const pay = Math.min(bal, -reNet);
        if (pay > 0) await investcoinsRepository.applyTransaction(userId, -pay, 'trade_migration_buy', { domain: RE_DOMAIN, migration: 'm1' }, db);
        realEstateShortfall = -reNet - pay;
      }

      // 2. Prêts soldés avec ce produit (capital + intérêts échus, sans indemnité) ; ce que le solde ne couvre pas est effacé et rapporté.
      let debtPaid = 0, forgiven = 0;
      const loans = (await db.query(`SELECT id, domain, balance_h, due_principal_h, due_interest_h FROM bank_loans WHERE user_id = $1 AND status IN ('active','defaulted') ORDER BY created_at FOR UPDATE`, [userId])).rows;
      for (const l of loans) {
        const debt = Math.ceil((Number(l.balance_h) + Number(l.due_principal_h) + Number(l.due_interest_h)) / 100);
        const bal = await investcoinsRepository.getBalance(userId, db);
        const pay = Math.min(bal, debt);
        if (pay > 0) await investcoinsRepository.applyTransaction(userId, -pay, 'bank_repayment', { domain: l.domain, loanId: l.id, migration: 'm1' }, db);
        debtPaid += pay; forgiven += debt - pay;
        await db.query(`UPDATE bank_loans SET status = 'repaid', balance_h = 0, due_principal_h = 0, due_interest_h = 0, closed_at = NOW(), meta = meta || $2::jsonb WHERE id = $1`, [l.id, JSON.stringify({ migration: 'm1', forgivenCoins: debt - pay })]);
      }

      // 3. Domaines remis à zéro : ils repartiront à la date de la nouvelle partie.
      await db.query(`UPDATE crypto_orders SET status = 'cancelled', reject_reason = 'Migration vers l''horloge unique', closed_sim_at = NOW() WHERE user_id = $1 AND status = 'open'`, [userId]);
      for (const t of CLEARED) await db.query(`DELETE FROM ${t} WHERE user_id = $1`, [userId]);   // re_games supprime ses biens, prêts et relevés en cascade

      // 4. Vérification : le solde doit valoir exactement le patrimoine total d'avant (plus ce qui a été effacé faute de moyens).
      const mid = await investcoinsRepository.getBalance(userId, db);
      const expected = snap.totalWealth + forgiven + realEstateShortfall;
      if (mid !== expected) throw new CutoverError('MISMATCH', `Écart de valeur (${mid} au lieu de ${expected}) : rien n'est écrit pour ce joueur.`);

      // 5. Complément jusqu'au capital de départ, jamais de retrait.
      const grant = Math.max(0, STARTING_CAPITAL - mid);
      if (grant > 0) await investcoinsRepository.applyTransaction(userId, grant, 'economy_cutover_grant', { migration: 'm1' }, db);
      const after = await investcoinsRepository.getBalance(userId, db);

      const report: CutoverReport = {
        userId,
        before: { balance: snap.balance, stocks: stocks.marketValue, crypto: legacyCrypto.marketValue + crypto.marketValue, realEstateNet: reNet, debt: snap.debtCoins, totalWealth: snap.totalWealth },
        proceeds: { stocks: stocks.marketValue, legacyCrypto: legacyCrypto.marketValue, crypto: crypto.marketValue, realEstate: Math.max(0, reNet) },
        debtPaid, forgiven, realEstateShortfall, grant, after: { balance: after }, clearedDomains: CLEARED,
      };
      if (opts.dryRun) { await client.query('ROLLBACK'); return report; }
      await db.query('INSERT INTO m1_cutover (user_id, report) VALUES ($1, $2)', [userId, JSON.stringify(report)]);
      await db.query(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata) VALUES ($1, 'm1_cutover', 'user', $1, $2)`, [userId, JSON.stringify({ totalWealth: snap.totalWealth, after, grant, forgiven })]);
      await client.query('COMMIT');
      return report;
    } catch (e) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      client.release();
    }
  },
};
