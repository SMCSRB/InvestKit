import type { Queryable } from '../repositories/investcoinsRepository';
import { query } from '../utils/db';

// Journal d'audit (table append-only : voir migration 025). Ne jamais y mettre de mot de passe, de code ni de jeton.
export const auditLog = async (
  entry: { userId: string | null; action: string; entityType?: string; entityId?: string | null; metadata?: object; ip?: string | null },
  db: Queryable = { query }
): Promise<void> => {
  try {
    await db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata, ip_address) VALUES ($1,$2,$3,$4,$5,$6)`,
      [entry.userId, entry.action, entry.entityType ?? null, entry.entityId ?? null, JSON.stringify(entry.metadata ?? {}), entry.ip ? String(entry.ip).slice(0, 45) : null]
    );
  } catch (e) {
    // Un échec de journalisation ne doit jamais casser l'action de l'utilisateur, mais il doit se voir.
    console.error('Audit log error:', (e as Error).message);
  }
};
