import bcrypt from 'bcrypt';
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { query, getClient } from '../utils/db';
import { userRepository } from '../repositories/userRepository';
import { auditLog } from './auditService';
import { processAvatar } from '../utils/avatarImage';
import { consumeBackupCode, verifyTotpCode } from '../utils/totp';
import { decryptField } from '../utils/fieldCrypto';
import { allowMail, mailRecorded } from '../utils/mailThrottle';
import { sendEmailChangeCode, sendEmailChangeNotice } from '../utils/email';

// ─────────────────────────────────────────────────────────────────────────
// PROFIL : nom, bio, photo, changement d'adresse e-mail.
// Règles : le serveur est la seule source ; un champ ABSENT de la requête n'est jamais touché (une sauvegarde « à vide » ne change rien) ;
// un champ VIDE reste vide (aucune valeur d'exemple n'est jamais enregistrée) ; l'e-mail ne se modifie PAS par cette route.
// ─────────────────────────────────────────────────────────────────────────
export type ProfileErrorCode = 'INVALID_INPUT' | 'BAD_CREDENTIALS' | 'TWO_FACTOR_REQUIRED' | 'NOT_FOUND' | 'RATE_LIMIT';
export class ProfileError extends Error {
  constructor(public code: ProfileErrorCode, message: string) { super(message); this.name = 'ProfileError'; }
}

export const NAME_MAX = 80;
export const BIO_MAX = 280;
const PLACEHOLDER = /^(user|unknown)$/i;   // valeurs de remplissage enregistrées à l'inscription : ce n'est pas un nom
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} '’.-]*$/u;

// Nettoyage : caractères de contrôle et marques de direction retirés, espaces réduits, chevrons retirés (le texte est toujours affiché
// en texte brut, jamais comme HTML ; on retire quand même ce qui pourrait y ressembler).
export const cleanText = (v: string): string =>
  v.normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g, ' ').replace(/[<>]/g, '').replace(/[ \t]+/g, ' ').trim();

export const validateFullName = (v: unknown): string => {
  if (typeof v !== 'string') throw new ProfileError('INVALID_INPUT', 'Le nom doit être du texte.');
  const name = cleanText(v).replace(/\s*\n\s*/g, ' ');
  if (name === '') return '';
  if (name.length > NAME_MAX) throw new ProfileError('INVALID_INPUT', `Nom trop long (${NAME_MAX} caractères maximum).`);
  if (!NAME_RE.test(name)) throw new ProfileError('INVALID_INPUT', 'Le nom ne peut contenir que des lettres, espaces, apostrophes, points et traits d\'union.');
  return name;
};

export const validateBio = (v: unknown): string => {
  if (typeof v !== 'string') throw new ProfileError('INVALID_INPUT', 'La bio doit être du texte.');
  const bio = cleanText(v.replace(/\r\n?/g, ' ').replace(/\n/g, ' '));
  if (bio.length > BIO_MAX) throw new ProfileError('INVALID_INPUT', `Bio trop longue (${BIO_MAX} caractères maximum).`);
  return bio;
};

export const fullNameOf = (u: { first_name?: string | null; last_name?: string | null }): string =>
  [u.first_name, u.last_name].map((x) => (x ?? '').trim()).filter((x) => x && !PLACEHOLDER.test(x)).join(' ');

const splitName = (full: string): { first: string; last: string } => {
  const i = full.indexOf(' ');
  return i < 0 ? { first: full, last: '' } : { first: full.slice(0, i), last: full.slice(i + 1) };
};

const view = (u: any) => ({
  fullName: fullNameOf(u),
  bio: u.bio ?? '',
  email: u.email,
  username: u.username ?? null,
  avatarId: u.avatar_id ?? null,
});

export const profileService = {
  async get(userId: string) {
    const u = await userRepository.findById(userId);
    if (!u) throw new ProfileError('NOT_FOUND', 'Compte introuvable');
    return view(u);
  },

  // Mise à jour partielle : seuls `fullName` et `bio` sont lus. Toute autre clé (dont `email`) est ignorée.
  async update(userId: string, body: any, ip?: string | null) {
    const b = body && typeof body === 'object' ? body : {};
    const sets: string[] = [];
    const params: any[] = [userId];
    const changed: string[] = [];
    if (Object.prototype.hasOwnProperty.call(b, 'fullName')) {
      const name = validateFullName(b.fullName);
      const { first, last } = splitName(name);
      params.push(first, last); sets.push(`first_name = $${params.length - 1}`, `last_name = $${params.length}`); changed.push('fullName');
    }
    if (Object.prototype.hasOwnProperty.call(b, 'bio')) {
      const bio = validateBio(b.bio);
      params.push(bio === '' ? null : bio); sets.push(`bio = $${params.length}`); changed.push('bio');
    }
    if (sets.length) {
      const r = await query(`UPDATE users SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`, params);
      if (!r.rows[0]) throw new ProfileError('NOT_FOUND', 'Compte introuvable');
      await auditLog({ userId, action: 'profile_update', entityType: 'user', entityId: userId, metadata: { fields: changed }, ip });
      return view(r.rows[0]);
    }
    return this.get(userId);
  },

  // ── Photo ─────────────────────────────────────────────────────────────
  async setAvatar(userId: string, raw: unknown, ip?: string | null) {
    const { image, contentType } = await processAvatar(raw);   // lève AvatarError
    const avatarId = randomBytes(18).toString('hex');           // 36 caractères hexadécimaux : non devinable
    const client = await getClient();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO user_avatars (user_id, image, content_type, updated_at) VALUES ($1,$2,$3,NOW())
         ON CONFLICT (user_id) DO UPDATE SET image = EXCLUDED.image, content_type = EXCLUDED.content_type, updated_at = NOW()`,
        [userId, image, contentType]
      );
      const r = await client.query('UPDATE users SET avatar_id = $2 WHERE id = $1', [userId, avatarId]);
      if (!r.rowCount) throw new ProfileError('NOT_FOUND', 'Compte introuvable');
      await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
    await auditLog({ userId, action: 'avatar_set', entityType: 'user', entityId: userId, metadata: { bytes: image.length }, ip });
    return { avatarId };
  },

  async removeAvatar(userId: string, ip?: string | null) {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM user_avatars WHERE user_id = $1', [userId]);
      await client.query('UPDATE users SET avatar_id = NULL WHERE id = $1', [userId]);
      await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
    await auditLog({ userId, action: 'avatar_removed', entityType: 'user', entityId: userId, ip });
    return { avatarId: null };
  },

  // Lecture publique par identifiant secret : l'identifiant n'est donné que dans les réponses qui montrent déjà ce joueur.
  async avatarImage(avatarId: string): Promise<{ image: Buffer; contentType: string } | null> {
    if (!/^[0-9a-f]{36}$/.test(avatarId)) return null;
    const r = await query(
      'SELECT a.image, a.content_type FROM users u JOIN user_avatars a ON a.user_id = u.id WHERE u.avatar_id = $1',
      [avatarId]
    );
    return r.rows[0] ? { image: r.rows[0].image, contentType: r.rows[0].content_type } : null;
  },

  // ── Changement d'adresse e-mail ───────────────────────────────────────
  // Étape 1 : mot de passe (+ code 2FA si activée) → code envoyé à la NOUVELLE adresse, ancienne adresse prévenue.
  // La réponse est la même quelle que soit la nouvelle adresse (déjà prise ou non) : aucune fuite sur l'existence d'un compte.
  async requestEmailChange(userId: string, input: { newEmail?: unknown; password?: unknown; code?: unknown }, ip?: string | null) {
    const user = await userRepository.findById(userId);
    if (!user) throw new ProfileError('NOT_FOUND', 'Compte introuvable');
    if (typeof input.password !== 'string' || !input.password) throw new ProfileError('INVALID_INPUT', 'Mot de passe requis.');
    if (typeof input.newEmail !== 'string') throw new ProfileError('INVALID_INPUT', 'Adresse e-mail requise.');
    const newEmail = input.newEmail.trim().toLowerCase();
    if (newEmail.length > 254 || !/^[^\s@<>"',;:]+@[^\s@<>"',;:]+\.[^\s@<>"',;:]{2,}$/.test(newEmail)) throw new ProfileError('INVALID_INPUT', 'Adresse e-mail invalide.');
    if (!(await bcrypt.compare(input.password, user.password_hash))) throw new ProfileError('BAD_CREDENTIALS', 'Mot de passe incorrect.');
    if (user.enable_2fa) {
      const code = typeof input.code === 'string' ? input.code.trim() : '';
      if (!code) throw new ProfileError('TWO_FACTOR_REQUIRED', 'Ton compte a la double authentification : indique ton code (ou un code de secours).');
      let ok = !!user.totp_secret && verifyTotpCode(code, decryptField(user.totp_secret));
      if (!ok && user.totp_backup_codes?.length) ok = (await consumeBackupCode(code, user.totp_backup_codes)) !== null;
      if (!ok) throw new ProfileError('BAD_CREDENTIALS', 'Code de double authentification invalide.');
    }
    const neutral = { ok: true, message: 'Si cette adresse peut être utilisée, un code de confirmation vient d\'y être envoyé (valable 15 minutes).' };
    if (newEmail === user.email.toLowerCase()) return neutral;
    const taken = (await query('SELECT 1 FROM users WHERE lower(email) = $1 AND id <> $2', [newEmail, userId])).rows.length > 0;
    if (taken) { await auditLog({ userId, action: 'email_change_refused_taken', entityType: 'user', entityId: userId, ip }); return neutral; }
    if (!allowMail('email-change', newEmail, 3, 60 * 60 * 1000) || !allowMail('email-change-user', userId, 5, 60 * 60 * 1000)) {
      throw new ProfileError('RATE_LIMIT', 'Trop de demandes. Réessaie dans une heure.');
    }
    const code = String(randomInt(100000, 1000000));
    await query(
      `INSERT INTO email_change_requests (user_id, new_email, code_hash, attempts, expires_at, created_at) VALUES ($1,$2,$3,0, NOW() + INTERVAL '15 minutes', NOW())
       ON CONFLICT (user_id) DO UPDATE SET new_email = EXCLUDED.new_email, code_hash = EXCLUDED.code_hash, attempts = 0, expires_at = EXCLUDED.expires_at, created_at = NOW()`,
      [userId, newEmail, hashCode(code)]
    );
    const name = fullNameOf(user) || user.username || null;
    void Promise.resolve(sendEmailChangeCode(newEmail, name, code)).catch((e) => console.error('Email sending error:', e));
    void Promise.resolve(sendEmailChangeNotice(user.email, name, 'requested')).catch(() => undefined);
    mailRecorded('email-change-sent', userId, 60 * 60 * 1000);
    await auditLog({ userId, action: 'email_change_requested', entityType: 'user', entityId: userId, ip });
    return neutral;
  },

  // Étape 2 : le code reçu sur la nouvelle adresse. 5 essais, 15 minutes, usage unique.
  async confirmEmailChange(userId: string, codeIn: unknown, ip?: string | null) {
    if (typeof codeIn !== 'string' || !/^\d{6}$/.test(codeIn.trim())) throw new ProfileError('INVALID_INPUT', 'Le code a 6 chiffres.');
    const client = await getClient();
    let oldEmail = ''; let newEmail = ''; let name: string | null = null;
    try {
      await client.query('BEGIN');
      const r = await client.query('SELECT * FROM email_change_requests WHERE user_id = $1 FOR UPDATE', [userId]);
      const req = r.rows[0];
      if (!req || new Date(req.expires_at) < new Date()) {
        if (req) await client.query('DELETE FROM email_change_requests WHERE user_id = $1', [userId]);
        await client.query('COMMIT');
        throw new ProfileError('INVALID_INPUT', 'Code expiré ou aucune demande en cours : refais la demande.');
      }
      if (req.attempts >= 5) {
        await client.query('DELETE FROM email_change_requests WHERE user_id = $1', [userId]);
        await client.query('COMMIT');
        throw new ProfileError('RATE_LIMIT', 'Trop d\'essais : refais la demande.');
      }
      const good = safeEqual(hashCode(codeIn.trim()), req.code_hash);
      if (!good) {
        await client.query('UPDATE email_change_requests SET attempts = attempts + 1 WHERE user_id = $1', [userId]);
        await client.query('COMMIT');
        throw new ProfileError('BAD_CREDENTIALS', 'Code incorrect.');
      }
      const u = (await client.query('SELECT email, username, first_name, last_name FROM users WHERE id = $1 FOR UPDATE', [userId])).rows[0];
      oldEmail = u.email; newEmail = req.new_email; name = fullNameOf(u) || u.username || null;
      try {
        await client.query('UPDATE users SET email = $2, verified = TRUE, updated_at = NOW() WHERE id = $1', [userId, newEmail]);
      } catch (e: any) {
        if (e.code === '23505') {
          await client.query('ROLLBACK');
          throw new ProfileError('INVALID_INPUT', 'Cette adresse ne peut pas être utilisée.');
        }
        throw e;
      }
      await client.query('DELETE FROM email_change_requests WHERE user_id = $1', [userId]);
      await client.query('COMMIT');
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch { /* déjà validé ou annulé */ }
      throw e;
    } finally { client.release(); }
    void Promise.resolve(sendEmailChangeNotice(oldEmail, name, 'done')).catch(() => undefined);
    await auditLog({ userId, action: 'email_changed', entityType: 'user', entityId: userId, ip });
    return { ok: true, email: newEmail };
  },
};

const hashCode = (code: string) => createHash('sha256').update(`email-change:${code}`).digest('hex');
const safeEqual = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
