import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { hasDb, setupDb, teardownDb, createUser } from './helpers';
import { query } from '../src/utils/db';
import { encryptField, decryptField, isEncrypted } from '../src/utils/fieldCrypto';
import { generateVerificationCode } from '../src/utils/verificationCode';
import { userRepository } from '../src/repositories/userRepository';
import { auditLog } from '../src/services/auditService';
import { requireAdmin } from '../src/middleware/admin';

describe('chiffrement des champs sensibles (AES-256-GCM)', () => {
  it('aller-retour ; deux chiffrements du même texte diffèrent ; le texte clair n\'apparaît pas', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const a = encryptField(secret), b = encryptField(secret);
    expect(a).not.toBe(b);
    expect(isEncrypted(a)).toBe(true);
    expect(a).not.toContain(secret);
    expect(decryptField(a)).toBe(secret);
    expect(decryptField(b)).toBe(secret);
  });
  it('une valeur altérée est refusée (intégrité) ; un ancien texte en clair est lu tel quel', () => {
    const enc = encryptField('secret');
    const parts = enc.split(':');
    const tampered = [...parts.slice(0, 4), Buffer.from('autre-chose').toString('base64')].join(':');
    expect(() => decryptField(tampered)).toThrow();
    expect(decryptField('JBSWY3DPEHPK3PXP')).toBe('JBSWY3DPEHPK3PXP');
    expect(() => decryptField('enc:v1:seulement-un-morceau')).toThrow();
  });
  it('clé dédiée : elle change le résultat ; une clé mal formée est refusée', () => {
    const before = process.env.FIELD_ENCRYPTION_KEY;
    try {
      process.env.FIELD_ENCRYPTION_KEY = 'a'.repeat(64);
      const enc = encryptField('x');
      process.env.FIELD_ENCRYPTION_KEY = 'b'.repeat(64);
      expect(() => decryptField(enc)).toThrow();      // autre clé : illisible
      process.env.FIELD_ENCRYPTION_KEY = 'trop-court';
      expect(() => encryptField('x')).toThrow(/64 caractères/);
    } finally {
      if (before === undefined) delete process.env.FIELD_ENCRYPTION_KEY; else process.env.FIELD_ENCRYPTION_KEY = before;
    }
  });
});

describe('code de vérification', () => {
  it('toujours 6 chiffres, jamais constant', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const c = generateVerificationCode();
      expect(c).toMatch(/^[1-9][0-9]{5}$/);
      seen.add(c);
    }
    expect(seen.size).toBeGreaterThan(1900);
  });
});

describe.skipIf(!hasDb)('journal d\'audit, accès administrateur, secret 2FA en base', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);

  const fakeRes = () => { const r: any = { statusCode: 200, body: null }; r.status = (c: number) => { r.statusCode = c; return r; }; r.json = (b: any) => { r.body = b; return r; }; return r; };
  const admin = async (twoFactor: boolean) => { const id = await createUser({}); await query(`UPDATE users SET role = 'admin', enable_2fa = $2 WHERE id = $1`, [id, twoFactor]); return id; };

  it('le journal est en ajout seul : ajout possible, modification et suppression refusées', async () => {
    const uid = await createUser({});
    await auditLog({ userId: uid, action: 'test_action', entityType: 'user', entityId: uid, metadata: { a: 1 }, ip: '127.0.0.1' });
    const row = (await query(`SELECT * FROM audit_logs WHERE user_id = $1 AND action = 'test_action'`, [uid])).rows[0];
    expect(row.ip_address).toBe('127.0.0.1');
    await expect(query(`UPDATE audit_logs SET action = 'falsifie' WHERE id = $1`, [row.id])).rejects.toThrow(/ajout seul/);
    await expect(query(`UPDATE audit_logs SET metadata = '{}' WHERE id = $1`, [row.id])).rejects.toThrow(/ajout seul/);
    await expect(query(`DELETE FROM audit_logs WHERE id = $1`, [row.id])).rejects.toThrow(/ajout seul/);
  });

  it('suppression d\'un compte (RGPD) : les lignes d\'audit sont anonymisées, jamais supprimées', async () => {
    const uid = await createUser({});
    await auditLog({ userId: uid, action: 'avant_suppression', entityType: 'user', entityId: uid });
    await query('DELETE FROM users WHERE id = $1', [uid]);
    const row = (await query(`SELECT user_id, action FROM audit_logs WHERE action = 'avant_suppression' AND entity_id = $1`, [uid])).rows[0];
    expect(row).toEqual({ user_id: null, action: 'avant_suppression' });
  });

  it('un échec de journalisation ne casse pas l\'action (il est seulement signalé)', async () => {
    await expect(auditLog({ userId: '00000000-0000-0000-0000-000000000000', action: 'x' })).resolves.toBeUndefined();  // utilisateur inexistant : contrainte
  });

  it('administrateur : rôle lu en base ET 2FA obligatoire', async () => {
    const withFa = await admin(true), withoutFa = await admin(false), plain = await createUser({});
    const call = async (userId?: string) => { const res = fakeRes(); const ok = await requireAdmin({ user: userId ? { userId, email: 'x' } : undefined } as any, res); return { ok, res }; };
    expect((await call(withFa)).ok).toBe(true);
    const noFa = await call(withoutFa);
    expect(noFa.ok).toBe(false);
    expect(noFa.res.statusCode).toBe(403);
    expect(noFa.res.body.code).toBe('ADMIN_2FA_REQUIRED');
    expect((await call(plain)).res.statusCode).toBe(403);
    expect((await call()).res.statusCode).toBe(401);
  });

  it('le secret 2FA est stocké chiffré, relu à l\'identique ; un ancien secret en clair reste lisible', async () => {
    const uid = await createUser({});
    await userRepository.setPendingTotpSecret(uid, 'JBSWY3DPEHPK3PXP');
    const stored = (await query('SELECT totp_secret FROM users WHERE id = $1', [uid])).rows[0].totp_secret;
    expect(isEncrypted(stored)).toBe(true);
    expect(stored).not.toContain('JBSWY3DPEHPK3PXP');
    expect(decryptField(stored)).toBe('JBSWY3DPEHPK3PXP');
    await query(`UPDATE users SET totp_secret = 'ANCIENSECRETCLAIR' WHERE id = $1`, [uid]);
    expect(decryptField((await query('SELECT totp_secret FROM users WHERE id = $1', [uid])).rows[0].totp_secret)).toBe('ANCIENSECRETCLAIR');
  });
});
