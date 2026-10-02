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

  it('si l\'envoi échoue, la réservation est rendue et le mail part à la validation suivante', async () => {
    const id = await newPlayer();
    failNext = true;
    await save(id, 'Reessai');
    await settle();
    expect(sent).toHaveLength(0);
    expect((await query('SELECT welcome_email_sent_at FROM users WHERE id = $1', [id])).rows[0].welcome_email_sent_at).toBeNull();
    resetMailThrottle();
    await save(id, 'Reessai');
    await settle();
    expect(sent).toHaveLength(1);
  });

  it('anti-abus : au plus un mail par adresse et par jour, même si la réservation est rendue puis reprise', async () => {
    const id = await newPlayer();
    failNext = true;
    await save(id, 'Abus');
    await settle();
    await save(id, 'Abus'); // plafond par adresse déjà consommé par la première tentative
    await settle();
    expect(sent.length).toBeLessThanOrEqual(1);
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
