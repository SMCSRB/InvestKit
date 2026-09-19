import { query } from '../utils/db';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
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
  }): Promise<User> {
    const result = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, verification_code, verification_code_expires_at, verified)
       VALUES ($1, $2, $3, $4, $5, $6, FALSE)
       RETURNING *`,
      [
        data.email,
        data.password_hash,
        data.first_name,
        data.last_name,
        data.verification_code,
        data.verification_code_expires_at,
      ]
    );
    return result.rows[0];
  },

  async verifyEmail(id: string): Promise<void> {
    await query(
      `UPDATE users
       SET verified = TRUE, verification_code = NULL, updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
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
      account_type?: string;
      interests?: string;
      language?: string;
      enable_2fa?: boolean;
    }
  ): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];

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
};
