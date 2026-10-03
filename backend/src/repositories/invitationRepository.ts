import { randomBytes } from 'crypto';
import { query } from '../utils/db';
import type { Queryable } from './investcoinsRepository';

// Alphabet sans caractères ambigus (0/O, 1/I/L) : les codes se recopient à la main.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export const generateInvitationCode = (): string => {
  const bytes = randomBytes(10);
  let raw = '';
  for (const b of bytes) raw += ALPHABET[b % ALPHABET.length];
  return `${raw.slice(0, 5)}-${raw.slice(5)}`;
};

export const normalizeInvitationCode = (input: unknown): string | null => {
  if (typeof input !== 'string') return null;
  const code = input.trim().toUpperCase();
  return /^[A-Z0-9-]{4,32}$/.test(code) ? code : null;
};

export interface InvitationCode {
  id: string;
  code: string;
  max_uses: number;
  uses: number;
  expires_at: Date | null;
  revoked_at: Date | null;
  note: string | null;
  created_at: Date;
}

export const invitationRepository = {
  async create(opts: { maxUses?: number; expiresAt?: Date | null; note?: string | null } = {}): Promise<InvitationCode> {
    const maxUses = opts.maxUses ?? 1;
    if (!Number.isInteger(maxUses) || maxUses < 1) throw new Error('maxUses doit être un entier ≥ 1');
    const result = await query(
      `INSERT INTO invitation_codes (code, max_uses, expires_at, note)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [generateInvitationCode(), maxUses, opts.expiresAt ?? null, opts.note ?? null]
    );
    return result.rows[0];
  },

  // Consommation ATOMIQUE : la condition (valide, non expiré, non révoqué,
  // utilisations restantes) est évaluée dans l'UPDATE lui-même. Un code à
  // 1 utilisation ne peut donc servir qu'à UN compte, même avec 10 inscriptions
  // simultanées. À appeler dans la même transaction que la création du compte :
  // si l'inscription échoue, l'utilisation est annulée avec elle.
  // Renvoie l'id du code, ou null s'il est invalide/expiré/épuisé/révoqué.
  async consume(code: string, db: Queryable): Promise<string | null> {
    const result = await db.query(
      `UPDATE invitation_codes
       SET uses = uses + 1
       WHERE code = $1
         AND revoked_at IS NULL
         AND (expires_at IS NULL OR expires_at > NOW())
         AND uses < max_uses
       RETURNING id`,
      [code]
    );
    return result.rows[0]?.id ?? null;
  },

  // Lecture SEULE (ne consomme rien) : le code est-il utilisable ? Sert à prévenir tôt, avant la fin de l'inscription.
  async isUsable(code: string): Promise<boolean> {
    const result = await query(
      `SELECT 1 FROM invitation_codes
       WHERE code = $1 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW()) AND uses < max_uses`,
      [code]
    );
    return result.rows.length === 1;
  },

  async revoke(code: string): Promise<boolean> {
    const result = await query(
      `UPDATE invitation_codes SET revoked_at = NOW() WHERE code = $1 AND revoked_at IS NULL RETURNING id`,
      [code]
    );
    return result.rows.length === 1;
  },

  async list(): Promise<(InvitationCode & { users: string[] })[]> {
    const result = await query(
      `SELECT c.*, COALESCE(array_agg(u.email) FILTER (WHERE u.id IS NOT NULL), '{}') AS users
       FROM invitation_codes c LEFT JOIN users u ON u.invitation_code_id = c.id
       GROUP BY c.id ORDER BY c.created_at DESC`
    );
    return result.rows;
  },
};
