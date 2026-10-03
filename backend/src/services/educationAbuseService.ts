import { query, getClient } from '../utils/db';
import { investcoinsRepository } from '../repositories/investcoinsRepository';
import { auditLog } from './auditService';
import { notify } from './notificationService';
import { EDUCATION_CATALOG } from '../data/educationCatalog';

// Détection et correction des comptes qui ont profité de l'ancienne faille de l'éducation : le serveur récompensait n'importe quel
// identifiant de chapitre/domaine envoyé par le navigateur, donc des pièces à l'infini. Utilisé par scripts/education-abuse.ts.
// Un chapitre ou un domaine est LÉGITIME s'il existe dans EDUCATION_CATALOG ; tout le reste est une ligne « invalide ».
const DOMAIN_COMPLETE_MARKER = '__domain_complete__';

export interface AbuseRow { userId: string; email: string; invalidRows: number; coinsGranted: number; xpGranted: number; balance: number }

// Lignes d'avancement invalides : domaine inconnu, ou chapitre inconnu dans un domaine connu (le marqueur de fin de domaine est valide
// seulement pour un domaine connu).
const INVALID_SQL = (valid: string) => `
  WITH valid(domain_id, chapter_id) AS (VALUES ${valid}),
  bad AS (
    SELECT ep.* FROM education_progress ep
    WHERE NOT EXISTS (SELECT 1 FROM valid v WHERE v.domain_id = ep.domain_id AND (v.chapter_id = ep.chapter_id OR ep.chapter_id = '${DOMAIN_COMPLETE_MARKER}'))
  )`;
// Les valeurs viennent du catalogue généré (jamais d'une saisie) ; on les échappe quand même.
const validValues = (): { sql: string; params: string[] } => {
  const params: string[] = []; const rows: string[] = [];
  for (const [d, chapters] of Object.entries(EDUCATION_CATALOG)) for (const c of chapters) { params.push(d, c); rows.push(`($${params.length - 1}, $${params.length})`); }
  return { sql: rows.join(', '), params };
};

export const educationAbuseService = {
  // LECTURE SEULE : un compte par ligne, avec ce qu'il a obtenu par des lignes invalides.
  async detect(): Promise<AbuseRow[]> {
    const v = validValues();
    const r = await query(
      `${INVALID_SQL(v.sql)}
       SELECT b.user_id, u.email, COUNT(*)::int AS invalid_rows, COALESCE(SUM(b.coins_earned), 0)::int AS coins_granted,
              COALESCE(SUM(LEAST(b.xp_earned, 2000000000)), 0)::bigint AS xp_granted, COALESCE(bal.balance, 0)::int AS balance
       FROM bad b JOIN users u ON u.id = b.user_id LEFT JOIN investcoins_balance bal ON bal.user_id = b.user_id
       WHERE b.coins_earned > 0 OR b.xp_earned > 0
       GROUP BY b.user_id, u.email, bal.balance ORDER BY coins_granted DESC`, v.params);
    return r.rows.map((x: any) => ({ userId: x.user_id, email: x.email, invalidRows: x.invalid_rows, coinsGranted: x.coins_granted, xpGranted: Number(x.xp_granted), balance: x.balance }));
  },

  // Comptes dont le registre contient plus de récompenses d'éducation qu'il n'existe de chapitres (filet de sécurité : repère aussi les
  // lignes d'avancement déjà supprimées à la main).
  async detectByLedger(): Promise<{ userId: string; email: string; rewards: number; allowed: number }[]> {
    const chapters = Object.values(EDUCATION_CATALOG).reduce((n, c) => n + c.length, 0);
    const domains = Object.keys(EDUCATION_CATALOG).length;
    const r = await query(
      `SELECT t.user_id, u.email, COUNT(*)::int AS rewards FROM investcoins_transactions t JOIN users u ON u.id = t.user_id
       WHERE t.reason IN ('quiz_chapter', 'quiz_domain_complete') GROUP BY t.user_id, u.email
       HAVING COUNT(*) FILTER (WHERE t.reason = 'quiz_chapter') > $1 OR COUNT(*) FILTER (WHERE t.reason = 'quiz_domain_complete') > $2
       ORDER BY rewards DESC`, [chapters, domains]);
    return r.rows.map((x: any) => ({ userId: x.user_id, email: x.email, rewards: x.rewards, allowed: chapters + domains }));
  },

  // CORRECTION d'UN compte, dans une transaction : retire les pièces obtenues indûment (jamais plus que le solde : on ne met personne en négatif),
  // met à zéro les pièces et l'XP des lignes invalides (les lignes restent, pour la trace), journalise et prévient le joueur.
  // Idempotent : une fois les lignes mises à zéro, un second passage ne retire plus rien.
  async correct(userId: string, adminLabel = 'script education-abuse'): Promise<{ removed: number; unrecovered: number; rows: number }> {
    const v = validValues();
    const client = await getClient();
    try {
      await client.query('BEGIN');
      const bad = (await client.query(
        `${INVALID_SQL(v.sql)} SELECT id, coins_earned, xp_earned FROM bad WHERE user_id = $${v.params.length + 1} AND (coins_earned > 0 OR xp_earned > 0) FOR UPDATE`, [...v.params, userId])).rows;
      const owed = bad.reduce((n: number, r: any) => n + Number(r.coins_earned), 0);
      const balance = Number((await client.query('SELECT balance FROM investcoins_balance WHERE user_id = $1 FOR UPDATE', [userId])).rows[0]?.balance ?? 0);
      const removed = Math.min(owed, balance);
      if (removed > 0) {
        await investcoinsRepository.applyTransaction(userId, -removed, 'admin_adjustment', { reason: 'Correction : récompenses d\'éducation obtenues avec des chapitres inexistants', via: adminLabel }, client);
      }
      if (bad.length) await client.query('UPDATE education_progress SET coins_earned = 0, xp_earned = 0 WHERE id = ANY($1)', [bad.map((r: any) => r.id)]);
      if (bad.length) {
        await auditLog({ userId: null, action: 'education_abuse_corrected', entityType: 'user', entityId: userId, metadata: { removed, unrecovered: owed - removed, rows: bad.length, via: adminLabel } }, client);
        await notify(client, userId, { kind: 'admin_coins', title: removed > 0 ? `${removed} InvestCoins retirés` : 'Correction de ta progression', body: 'Des récompenses d\'éducation obtenues avec des chapitres qui n\'existent pas ont été annulées (faille corrigée).' });
      }
      await client.query('COMMIT');
      return { removed, unrecovered: owed - removed, rows: bad.length };
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  },
};
