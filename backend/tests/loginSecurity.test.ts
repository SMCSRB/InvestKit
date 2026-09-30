import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../src/app';
import { checkPassword } from '../src/utils/passwordPolicy';
import { checkLock, recordFailure, recordSuccess } from '../src/services/loginThrottle';
import { LOGIN_THROTTLE } from '../src/config/securityRules';
import { query } from '../src/utils/db';
import { hasDb, setupDb, teardownDb, createUser } from './helpers';

describe('politique de mot de passe', () => {
  it('accepte un mot de passe correct', () => {
    expect(checkPassword('Soleil-2026x')).toBeNull();
  });
  it('refuse : trop court, sans majuscule/minuscule/chiffre, trop long, trop courant, contenant l\'e-mail', () => {
    expect(checkPassword('Ab1')).toMatch(/au moins 8/);
    expect(checkPassword('abcdefgh1')).toMatch(/majuscule/);
    expect(checkPassword('ABCDEFGH1')).toMatch(/majuscule/);
    expect(checkPassword('Abcdefghi')).toMatch(/chiffre/);
    expect(checkPassword('A1' + 'b'.repeat(200))).toMatch(/dépasser/);
    expect(checkPassword('Azerty123')).toMatch(/courant/);
    expect(checkPassword('Motdepasse1')).toMatch(/courant/);
    expect(checkPassword('Jeanmartin7X', 'jeanmartin@mail.fr')).toMatch(/e-mail/);
    expect(checkPassword(12345678 as any)).toBe('Mot de passe invalide');
  });
});

let ipCounter = 0;
// Chaque requête part d'une « IP » différente (le limiteur par IP est testé ailleurs) : on isole ici les mécanismes par compte.
const ipPost = (path: string, body: object) => request(app).post(path).set('X-Forwarded-For', `172.16.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`).send(body);

describe.skipIf(!hasDb)('anti credential-stuffing et réinitialisation du mot de passe (base réelle)', () => {
  let email: string; let userId: string;
  beforeAll(async () => {
    await setupDb();
    app.set('trust proxy', true);
    process.env.EXPOSE_RESET_TOKEN_FOR_TESTS = 'true';
    userId = await createUser({ balance: 10 });
    email = `${userId}@test.local`;
    await query('UPDATE users SET password_hash = $2 WHERE id = $1', [userId, await bcrypt.hash('Motdepasse!42', 4)]);
  });
  afterAll(async () => { app.set('trust proxy', false); delete process.env.EXPOSE_RESET_TOKEN_FOR_TESTS; await teardownDb(); });

  it('verrouillage temporaire après N échecs, même avec le bon mot de passe, puis progressif ; succès = remise à zéro', async () => {
    const key = `throttle-${userId}@test.local`;
    for (let i = 0; i < LOGIN_THROTTLE.maxFailures - 1; i++) expect(await recordFailure(key)).toBe(false);
    expect((await checkLock(key)).locked).toBe(false);
    expect(await recordFailure(key)).toBe(true);                       // le 8e échec verrouille
    const l1 = await checkLock(key);
    expect(l1.locked).toBe(true);
    expect(l1.retryAfterSeconds).toBeGreaterThan(14 * 60);
    expect(l1.retryAfterSeconds).toBeLessThanOrEqual(15 * 60);
    // expiration simulée puis deuxième verrouillage : durée doublée
    await query(`UPDATE login_throttle SET locked_until = NOW() - INTERVAL '1 second'`);
    expect((await checkLock(key)).locked).toBe(false);
    for (let i = 0; i < LOGIN_THROTTLE.maxFailures; i++) await recordFailure(key);
    const l2 = await checkLock(key);
    expect(l2.retryAfterSeconds).toBeGreaterThan(29 * 60);
    expect(l2.retryAfterSeconds).toBeLessThanOrEqual(30 * 60);
    await recordSuccess(key);
    expect((await checkLock(key)).locked).toBe(false);
  });

  it('la clé est insensible à la casse et ne stocke pas l\'e-mail en clair', async () => {
    await recordFailure('Personne@Exemple.FR');
    const rows = (await query('SELECT key_hash FROM login_throttle')).rows.map((r: any) => r.key_hash);
    expect(rows.every((h: string) => /^[0-9a-f]{64}$/.test(h))).toBe(true);
    expect(JSON.stringify(rows)).not.toContain('personne');
  });

  it('HTTP : 8 échecs répartis sur des IP différentes verrouillent le compte (429) ; même réponse pour un compte inexistant', async () => {
    const attempt = (mail: string, password: string, ip: string) =>
      request(app).post('/api/v1/auth/login').set('X-Forwarded-For', ip).send({ email: mail, password });
    // Le limiteur par IP ne bloque pas : chaque tentative vient d'une IP différente (attaque distribuée).
    const ghost = `fantome-${userId}@test.local`;
    for (const target of [email, ghost]) {
      let last: request.Response | undefined;
      for (let i = 0; i < LOGIN_THROTTLE.maxFailures; i++) last = await attempt(target, 'Mauvais-mdp1', `10.0.0.${i + (target === ghost ? 100 : 1)}`);
      expect(last!.status).toBe(401);
      const locked = await attempt(target, 'Motdepasse!42', '10.9.9.9');           // même le BON mot de passe est refusé
      expect(locked.status).toBe(429);
      expect(locked.body.code).toBe('LOGIN_LOCKED');
      expect(locked.headers['retry-after']).toBeTruthy();
    }
  });

  it('les échecs et verrouillages sont journalisés (audit), sans journaliser les comptes inconnus', async () => {
    const r = await query(`SELECT action FROM audit_logs WHERE user_id = $1 AND action IN ('login_failed','login_locked')`, [userId]);
    expect(r.rows.map((x: any) => x.action)).toContain('login_locked');
    const ghost = await query(`SELECT COUNT(*)::int AS n FROM audit_logs WHERE action LIKE 'login_%' AND user_id IS NULL`);
    expect(ghost.rows[0].n).toBe(0);
  });

  it('inscription : mot de passe faible refusé avant tout (400)', async () => {
    const r = await ipPost('/api/v1/auth/register', { email: 'nouveau@test.local', password: 'faible' });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/mot de passe/i);
  });

  it('mot de passe oublié : réponse identique compte existant / inexistant, jeton stocké haché, usage unique', async () => {
    const u = await createUser({ balance: 0 });
    const mail = `${u}@test.local`;
    const known = await ipPost('/api/v1/auth/forgot-password', { email: mail });
    const unknown = await ipPost('/api/v1/auth/forgot-password', { email: `nexistepas-${u}@test.local` });
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.body.message).toBe(unknown.body.message);
    expect(Object.keys(unknown.body)).toEqual(['success', 'message']);

    const token = known.body.resetToken as string;   // exposé seulement grâce à la variable de test
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    const stored = (await query('SELECT reset_token FROM users WHERE id = $1', [u])).rows[0].reset_token;
    expect(stored).not.toBe(token);                  // jamais en clair
    expect(stored).toMatch(/^[0-9a-f]{64}$/);

    const weak = await ipPost('/api/v1/auth/reset-password', { resetToken: token, newPassword: 'faible' });
    expect(weak.status).toBe(400);
    const ok = await ipPost('/api/v1/auth/reset-password', { resetToken: token, newPassword: 'Nouveau-Mdp-77' });
    expect(ok.status).toBe(200);
    const again = await ipPost('/api/v1/auth/reset-password', { resetToken: token, newPassword: 'Autre-Mdp-88x' });
    expect(again.status).toBe(400);                  // usage unique
    const hash = (await query('SELECT password_hash FROM users WHERE id = $1', [u])).rows[0].password_hash;
    expect(await bcrypt.compare('Nouveau-Mdp-77', hash)).toBe(true);
  });

  it('sans la variable de test, le jeton de réinitialisation n\'est jamais renvoyé par l\'API', async () => {
    delete process.env.EXPOSE_RESET_TOKEN_FOR_TESTS;
    const r = await ipPost('/api/v1/auth/forgot-password', { email });
    expect(r.body.resetToken).toBeUndefined();
    process.env.EXPOSE_RESET_TOKEN_FOR_TESTS = 'true';
  });
});
