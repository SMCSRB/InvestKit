import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';

const sent: { to: string; name: string | null | undefined }[] = [];
let failNext = false;
vi.mock('../src/utils/email', async (orig) => {
  const real = await orig<typeof import('../src/utils/email')>();
  return {
    ...real,
    sendWelcomeEmail: async (to: string, name?: string | null) => {
      if (failNext) { failNext = false; return { error: 'panne simulée' }; }
      sent.push({ to, name });
      return { ok: true };
    },
  };
});

import app from '../src/app';
import { generateToken } from '../src/utils/jwt';
import { csrfTokenFor } from '../src/utils/session';
import { query, getClient } from '../src/utils/db';
import { userRepository } from '../src/repositories/userRepository';
import { resetMailThrottle } from '../src/utils/mailThrottle';
import { hasDb, setupDb, teardownDb, createUser } from './helpers';

const asBrowser = (id: string) => {
  const jwt = generateToken(id, `${id}@test.local`); const csrf = csrfTokenFor(jwt);
  return { Cookie: `ik_session=${jwt}; ik_csrf=${csrf}`, 'X-CSRF-Token': csrf };
};
const save = (id: string, username: string) =>
  request(app).post('/api/v1/auth/save-preferences').set(asBrowser(id)).send({ username, accountType: 'beginner', interests: [], language: 'fr' });
const newPlayer = async () => { const id = await createUser({ verified: true }); await query('UPDATE users SET welcome_email_sent_at = NULL WHERE id = $1', [id]); return id; };
const settle = () => new Promise((r) => setTimeout(r, 150));

describe.skipIf(!hasDb)('mail de bienvenue : une seule fois, fin d\'onboarding (base réelle)', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);
  beforeEach(() => { sent.length = 0; failNext = false; resetMailThrottle(); });

  it('envoyé à la fin de l\'onboarding avec le pseudo, jamais une seconde fois', async () => {
    const id = await newPlayer();
    expect((await save(id, 'Camille')).status).toBe(200);
    await settle();
    expect(sent).toEqual([{ to: `${id}@test.local`, name: 'Camille' }]);
    expect((await save(id, 'CamilleBis')).status).toBe(200);
    await settle();
    expect(sent).toHaveLength(1);
    expect((await query('SELECT welcome_email_sent_at FROM users WHERE id = $1', [id])).rows[0].welcome_email_sent_at).not.toBeNull();
  });

  it('deux requêtes simultanées : un seul mail', async () => {
    const id = await newPlayer();
    await Promise.all([save(id, 'Double1'), save(id, 'Double1'), save(id, 'Double1')]);
    await settle();
    expect(sent).toHaveLength(1);
  });

  it('un compte déjà servi (compte existant) ne reçoit rien', async () => {
    const id = await createUser({ verified: true });
    await query('UPDATE users SET welcome_email_sent_at = NOW() - interval \'30 days\' WHERE id = $1', [id]);
    await save(id, 'Ancien');
    await settle();
    expect(sent).toHaveLength(0);
  });

  it('pas de mail sans e-mail vérifié ni sans pseudo (réservation refusée)', async () => {
    const unverified = await createUser({ verified: false, code: '123456' });
    expect(await userRepository.claimWelcomeEmail(unverified)).toBeNull();
    const noName = await newPlayer();
    await query('UPDATE users SET username = NULL WHERE id = $1', [noName]);
    expect(await userRepository.claimWelcomeEmail(noName)).toBeNull();
  });

  it('ni connexion, ni nouvelle validation du code ne déclenchent le mail', async () => {
    const id = await createUser({ verified: false, code: '777666' });
    await query(`UPDATE users SET verification_code_expires_at = NOW() + interval '10 minutes', welcome_email_sent_at = NULL WHERE id = $1`, [id]);
    await request(app).post('/api/v1/auth/verify-email').send({ email: `${id}@test.local`, code: '777666' });
    await settle();
    expect(sent).toHaveLength(0);
  });

  const ageLastAttempt = (id: string, minutes: number) =>
    query(`UPDATE users SET welcome_email_last_attempt_at = NOW() - make_interval(mins => $2::int) WHERE id = $1`, [id, minutes]);

  it('échec d\'envoi : réservation rendue, le joueur est réessayé au prochain appel légitime APRÈS le délai', async () => {
    const id = await newPlayer();
    failNext = true;
    await save(id, 'Reessai');
    await settle();
    expect(sent).toHaveLength(0);
    const row = (await query('SELECT welcome_email_sent_at, welcome_email_attempts FROM users WHERE id = $1', [id])).rows[0];
    expect(row.welcome_email_sent_at).toBeNull();
    expect(row.welcome_email_attempts).toBe(1);

    await save(id, 'Reessai'); // trop tôt : moins de 5 minutes depuis l'essai raté
    await settle();
    expect(sent).toHaveLength(0);

    await ageLastAttempt(id, 6); // 6 minutes plus tard
    await save(id, 'Reessai');
    await settle();
    expect(sent).toHaveLength(1);
    await ageLastAttempt(id, 60);
    await save(id, 'Reessai');
    await settle();
    expect(sent).toHaveLength(1); // une fois réussi, plus jamais
  });

  it('nombre d\'essais maximum : après 3 échecs, on n\'insiste plus', async () => {
    const id = await newPlayer();
    for (let i = 0; i < 3; i += 1) {
      failNext = true;
      await save(id, 'TropEssais');
      await settle();
      await ageLastAttempt(id, 10);
    }
    expect((await query('SELECT welcome_email_attempts FROM users WHERE id = $1', [id])).rows[0].welcome_email_attempts).toBe(3);
    await save(id, 'TropEssais');
    await settle();
    expect(sent).toHaveLength(0);
    expect((await query('SELECT welcome_email_attempts FROM users WHERE id = $1', [id])).rows[0].welcome_email_attempts).toBe(3);
  });

  it('le plafond par adresse ne compte que les envois RÉUSSIS (un échec ne consomme rien)', async () => {
    const { mailAllowed, mailRecorded } = await import('../src/utils/mailThrottle');
    const day = 24 * 3600 * 1000;
    expect(mailAllowed('welcome', 'a@b.fr', 1, day)).toBe(true);
    expect(mailAllowed('welcome', 'a@b.fr', 1, day)).toBe(true); // regarder ne compte pas
    mailRecorded('welcome', 'a@b.fr', day);                      // un envoi réussi
    expect(mailAllowed('welcome', 'a@b.fr', 1, day)).toBe(false);
    expect(mailAllowed('welcome', 'a@b.fr', 1, day, Date.now() + day + 1000)).toBe(true); // le lendemain, c'est à nouveau permis

    const id = await newPlayer();
    failNext = true;
    await save(id, 'PlafondOk');
    await settle();
    const { MAIL_THROTTLE } = await import('../src/config/securityRules');
    const email = `${id}@test.local`;
    expect(mailAllowed('welcome', email, MAIL_THROTTLE.welcome.max, MAIL_THROTTLE.welcome.windowMs)).toBe(true); // l'échec n'a rien consommé
    await ageLastAttempt(id, 10);
    await save(id, 'PlafondOk');
    await settle();
    expect(sent).toHaveLength(1);
    expect(mailAllowed('welcome', email, MAIL_THROTTLE.welcome.max, MAIL_THROTTLE.welcome.windowMs)).toBe(false); // le succès, lui, compte
  });

  it('migration : les comptes existants sont marqués à la création de la colonne, et JAMAIS aux redémarrages suivants', async () => {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'migrations', '039_welcome_email.sql'), 'utf8');
    const waiting = await newPlayer();
    await query(sql); // rejouée alors que la colonne existe : rien ne change
    expect((await query('SELECT welcome_email_sent_at FROM users WHERE id = $1', [waiting])).rows[0].welcome_email_sent_at).toBeNull();

    const client = await getClient();
    try {
      await client.query('BEGIN');
      await client.query('ALTER TABLE users DROP COLUMN welcome_email_sent_at');
      await client.query(sql); // première application : colonne créée, comptes existants marqués
      const r = await client.query('SELECT COUNT(*)::int AS n, COUNT(welcome_email_sent_at)::int AS marked FROM users');
      expect(r.rows[0].n).toBeGreaterThan(0);
      expect(r.rows[0].marked).toBe(r.rows[0].n);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });
});
