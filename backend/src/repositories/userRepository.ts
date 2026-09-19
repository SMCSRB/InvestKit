import { query } from '../utils/db';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  verified: boolean;
  verification_code?: string;
  reset_token?: string;
  reset_token_expires_at?: Date;
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
  }): Promise<User> {
    const result = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, verification_code, verified)
       VALUES ($1, $2, $3, $4, $5, FALSE)
       RETURNING *`,
      [
        data.email,
        data.password_hash,
        data.first_name,
        data.last_name,
        data.verification_code,
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
};
