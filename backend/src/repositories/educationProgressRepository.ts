import { query } from '../utils/db';
import { xpService } from '../services/xpService';

const DOMAIN_COMPLETE_MARKER = '__domain_complete__';

export const educationProgressRepository = {
  async isCompleted(userId: string, domainId: string, chapterId?: string): Promise<boolean> {
    const result = await query(
      'SELECT 1 FROM education_progress WHERE user_id = $1 AND domain_id = $2 AND chapter_id = $3',
      [userId, domainId, chapterId || DOMAIN_COMPLETE_MARKER]
    );
    return result.rows.length > 0;
  },

  // Identifiants des chapitres de ce domaine déjà validés par ce joueur (hors marqueur de fin de domaine).
  async completedChapterIds(userId: string, domainId: string): Promise<string[]> {
    const result = await query(
      'SELECT chapter_id FROM education_progress WHERE user_id = $1 AND domain_id = $2 AND chapter_id <> $3',
      [userId, domainId, DOMAIN_COMPLETE_MARKER]
    );
    return result.rows.map((r: any) => String(r.chapter_id));
  },

  // Insère la complétion si elle n'existe pas déjà (idempotent - la
  // contrainte UNIQUE empêche un double-enregistrement en cas de course).
  // Renvoie true si c'est une PREMIÈRE complétion (donc à récompenser).
  async recordCompletion(
    userId: string,
    domainId: string,
    chapterId: string | undefined,
    score: number | undefined,
    xpEarned: number,
    coinsEarned: number
  ): Promise<boolean> {
    const result = await query(
      `INSERT INTO education_progress (user_id, domain_id, chapter_id, score, xp_earned, coins_earned)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, domain_id, chapter_id) DO NOTHING
       RETURNING id`,
      [userId, domainId, chapterId || DOMAIN_COMPLETE_MARKER, score ?? null, xpEarned, coinsEarned]
    );
    // Journal d'XP (6a) : même montant, une seule fois (clé = ligne d'éducation). Plafonné comme dans les classements (500 par ligne).
    if (result.rows.length > 0 && xpEarned > 0) {
      await xpService.grant(userId, {
        domain: 'education', source: chapterId ? 'quiz' : 'domain_final', key: `ep:${result.rows[0].id}`, amount: Math.min(Math.floor(xpEarned), 500),
      });
    }
    return result.rows.length > 0;
  },
};
