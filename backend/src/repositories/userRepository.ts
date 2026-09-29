import { query } from '../utils/db';
import type { Queryable } from './investcoinsRepository';
import { encryptField } from '../utils/fieldCrypto';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  username?: string;
  role: 'user' | 'admin';
  subscription_tier: 'free' | 'pro';
  free_domain?: string | null;
  pro_override?: boolean;
  free_domain_change_allowed?: boolean;
  stripe_customer_id?: string;
  totp_secret?: string;
  totp_backup_codes?: string[];
  daily_streak: number;
  last_daily_claim_at?: Date;
  referral_code?: string;
  referred_by_user_id?: string;
  invitation_code_id?: string | null;
  verified: boolean;
  verification_code?: string;
  verification_code_expires_at?: Date;
  reset_token?: string;
  reset_token_expires_at?: Date;
  account_type?: string;
  interests?: string;
  language?: string;
  enable_2fa?: boolean;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export const userRepository = {
  async findByEmail(email: string): Promise<User | null> {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  },

  async findById(id: string): Promise<User | null> {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findByVerificationCode(code: string): Promise<User | null> {
    const result = await query(
      'SELECT * FROM users WHERE verification_code = $1',
      [code]
    );
    return result.rows[0] || null;
  },

  async create(data: {
    email: string;
    password_hash: string;
    first_name: string;
    last_name: string;
    verification_code: string;
    verification_code_expires_at?: Date;
    referral_code: string;
    referred_by_user_id?: string;
    invitation_code_id?: string | null;
  }, db: Queryable = { query }): Promise<User> {
    const result = await db.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, verification_code, verification_code_expires_at, referral_code, referred_by_user_id, invitation_code_id, verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE)
       RETURNING *`,
      [
        data.email,
        data.password_hash,
        data.first_name,
        data.last_name,
        data.verification_code,
        data.verification_code_expires_at,
        data.referral_code,
        data.referred_by_user_id || null,
        data.invitation_code_id || null,
      ]
    );
    return result.rows[0];
  },

  async findByReferralCode(code: string): Promise<User | null> {
    const result = await query('SELECT * FROM users WHERE referral_code = $1', [code]);
    return result.rows[0] || null;
  },

  // Activation ATOMIQUE : la condition (non vérifié + bon code) est évaluée
  // dans l'UPDATE lui-même. Deux requêtes simultanées avec le même code ne
  // peuvent donc pas réussir toutes les deux. Renvoie true pour une seule.
  async verifyEmailAtomic(id: string, code: string, db: Queryable = { query }): Promise<boolean> {
    const result = await db.query(
      `UPDATE users
       SET verified = TRUE, verification_code = NULL, updated_at = NOW()
       WHERE id = $1 AND verified = FALSE AND verification_code = $2
       RETURNING id`,
      [id, code]
    );
    return result.rows.length === 1;
  },

  async updateLastLogin(id: string): Promise<void> {
    await query(
      `UPDATE users
       SET last_login_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
  },

  async updateResetToken(
    id: string,
    resetToken: string,
    expiresAt: Date
  ): Promise<void> {
    await query(
      `UPDATE users
       SET reset_token = $1, reset_token_expires_at = $2, updated_at = NOW()
       WHERE id = $3`,
      [resetToken, expiresAt, id]
    );
  },

  async findByResetToken(token: string): Promise<User | null> {
    const result = await query(
      `SELECT * FROM users
       WHERE reset_token = $1
       AND reset_token_expires_at > NOW()`,
      [token]
    );
    return result.rows[0] || null;
  },

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await query(
      `UPDATE users
       SET password_hash = $1, reset_token = NULL, reset_token_expires_at = NULL, updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, id]
    );
  },

  async updateVerificationCode(
    id: string,
    code: string,
    expiresAt: Date
  ): Promise<void> {
    await query(
      `UPDATE users
       SET verification_code = $1, verification_code_expires_at = $2, updated_at = NOW()
       WHERE id = $3`,
      [code, expiresAt, id]
    );
  },

  async updatePreferences(
    id: string,
    preferences: {
      username?: string;
      account_type?: string;
      interests?: string;
      language?: string;
      enable_2fa?: boolean;
    }
  ): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];

    if (preferences.username !== undefined) {
      updates.push(`username = $${updates.length + 1}`);
      values.push(preferences.username);
    }

    if (preferences.account_type !== undefined) {
      updates.push(`account_type = $${updates.length + 1}`);
      values.push(preferences.account_type);
    }

    if (preferences.interests !== undefined) {
      updates.push(`interests = $${updates.length + 1}`);
      values.push(preferences.interests);
    }

    if (preferences.language !== undefined) {
      updates.push(`language = $${updates.length + 1}`);
      values.push(preferences.language);
    }

    if (preferences.enable_2fa !== undefined) {
      updates.push(`enable_2fa = $${updates.length + 1}`);
      values.push(preferences.enable_2fa);
    }

    if (updates.length === 0) return;

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = $${values.length}`;
    await query(sql, values);
  },

  async findByStripeCustomerId(customerId: string): Promise<User | null> {
    const result = await query('SELECT * FROM users WHERE stripe_customer_id = $1', [customerId]);
    return result.rows[0] || null;
  },

  async setStripeCustomerId(id: string, stripeCustomerId: string): Promise<void> {
    await query(
      `UPDATE users SET stripe_customer_id = $1, updated_at = NOW() WHERE id = $2`,
      [stripeCustomerId, id]
    );
  },

  async setSubscriptionTier(id: string, tier: 'free' | 'pro'): Promise<void> {
    await query(
      `UPDATE users SET subscription_tier = $1, updated_at = NOW() WHERE id = $2`,
      [tier, id]
    );
  },

  // Choix UNIQUE : ne réussit que si aucun domaine n'a encore été choisi.
  // Sans ça, on pourrait changer de domaine gratuit à volonté et contourner
  // l'abonnement Pro. Renvoie false si un domaine était déjà choisi.
  async setFreeDomainOnce(id: string, domain: string): Promise<boolean> {
    const result = await query(
      `UPDATE users SET free_domain = $1, updated_at = NOW()
       WHERE id = $2 AND free_domain IS NULL
       RETURNING id`,
      [domain, id]
    );
    return result.rows.length === 1;
  },

  // Changement UNIQUE, réservé aux comptes qui avaient déjà choisi avant que
  // le choix devienne définitif. Consomme le droit dans le même UPDATE.
  async changeFreeDomainOnce(id: string, domain: string): Promise<boolean> {
    const result = await query(
      `UPDATE users
       SET free_domain = $1, free_domain_change_allowed = FALSE, updated_at = NOW()
       WHERE id = $2 AND free_domain IS NOT NULL AND free_domain <> $1
         AND free_domain_change_allowed = TRUE
       RETURNING id`,
      [domain, id]
    );
    return result.rows.length === 1;
  },

  // Stocke un secret TOTP "en attente" (2FA pas encore activée tant que
  // l'utilisateur n'a pas confirmé un code valide via enableTwoFactor).
  async setPendingTotpSecret(id: string, secret: string): Promise<void> {
    await query(
      `UPDATE users SET totp_secret = $1, updated_at = NOW() WHERE id = $2`,
      [encryptField(secret), id] // secret 2FA chiffré au repos (AES-256-GCM)
    );
  },

  async enableTwoFactor(id: string, hashedBackupCodes: string[]): Promise<void> {
    await query(
      `UPDATE users SET enable_2fa = TRUE, totp_backup_codes = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(hashedBackupCodes), id]
    );
  },

  async disableTwoFactor(id: string): Promise<void> {
    await query(
      `UPDATE users
       SET enable_2fa = FALSE, totp_secret = NULL, totp_backup_codes = NULL, updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
  },

  async updateBackupCodes(id: string, hashedBackupCodes: string[]): Promise<void> {
    await query(
      `UPDATE users SET totp_backup_codes = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(hashedBackupCodes), id]
    );
  },

  async setDailyStreak(id: string, streak: number, claimedAt: Date): Promise<void> {
    await query(
      `UPDATE users SET daily_streak = $1, last_daily_claim_at = $2, updated_at = NOW() WHERE id = $3`,
      [streak, claimedAt, id]
    );
  },
};
