import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { query } from '../src/utils/db';
import { hasDb, setupDb, teardownDb, createUser } from './helpers';

// Le captcha et les e-mails sortent sur Internet : on les remplace, et on compte les e-mails « compte existant ».
vi.mock('../src/utils/captcha', () => ({ verifyCaptcha: async () => true }));
const mails = vi.hoisted(() => ({ verification: [] as string[], exists: [] as string[] }));
vi.mock('../src/utils/email', async (orig) => {
  const real: any = await orig();
  return {
    ...real,
    sendVerificationEmail: async (to: string) => { mails.verification.push(to); },
    sendAccountExistsEmail: async (to: string) => { mails.exists.push(to); },
    sendPasswordResetEmail: async () => undefined,
  };
});
import app from '../src/app';
import { invitationRepository } from '../src/repositories/invitationRepository';

let n = 0;
const ip = () => `10.77.${Math.floor(n / 250)}.${(n++ % 250) + 1}`;
const post = (path: string, body: object) => request(app).post(path).set('X-Forwarded-For', ip()).send(body);
const PASS = 'Soleil-2026x';

describe.skipIf(!hasDb)('anti-énumération de comptes (base réelle)', () => {
  let existing: string;
  beforeAll(async () => {
    await setupDb();
    app.set('trust proxy', true);
    const id = await createUser({ balance: 10 });
    existing = `${id}@test.local`;
    await query('UPDATE users SET password_hash = $2 WHERE id = $1', [id, await bcrypt.hash(PASS, 4)]);
  });
  afterAll(async () => { app.set('trust proxy', false); await teardownDb(); });

  it('inscription : même statut et même message pour une adresse neuve et une adresse déjà inscrite', async () => {
    const a = await post('/api/v1/auth/register', { email: `neuf-${Date.now()}@test.local`, password: PASS, captchaToken: 'x', inviteCode: (await invitationRepository.create({ maxUses: 5 })).code });
    const b = await post('/api/v1/auth/register', { email: existing, password: PASS, captchaToken: 'x', inviteCode: (await invitationRepository.create({ maxUses: 5 })).code });
    expect(a.status).toBe(200);
    expect(b.status).toBe(a.status);
    expect(b.body.message).toBe(a.body.message);
    expect(Object.keys(b.body).filter((k) => k !== 'verificationCode').sort()).toEqual(Object.keys(a.body).filter((k) => k !== 'verificationCode').sort());
    expect(b.body.userId).toBeUndefined();
    expect(a.body.userId).toBeUndefined();
  });

  it('inscription avec une adresse existante : aucun compte créé ni modifié, code d\'invitation NON consommé, propriétaire prévenu par e-mail', async () => {
    const inv = await invitationRepository.create({ maxUses: 1 });
    const before = (await query('SELECT COUNT(*)::int AS c FROM users')).rows[0].c;
    mails.exists.length = 0;
    const r = await post('/api/v1/auth/register', { email: existing, password: 'Autre-mdp-2026x', captchaToken: 'x', inviteCode: inv.code });
    expect(r.status).toBe(200);
    expect((await query('SELECT COUNT(*)::int AS c FROM users')).rows[0].c).toBe(before);
    expect((await query('SELECT uses FROM invitation_codes WHERE code = $1', [inv.code])).rows[0].uses).toBe(0);
    expect(await bcrypt.compare(PASS, (await query('SELECT password_hash FROM users WHERE email = $1', [existing])).rows[0].password_hash)).toBe(true);
    await new Promise((res) => setTimeout(res, 20));
    expect(mails.exists).toContain(existing);
  });

  it('un mauvais code d\'invitation donne la même erreur pour une adresse neuve ou existante', async () => {
    const a = await post('/api/v1/auth/register', { email: `x-${Date.now()}@test.local`, password: PASS, captchaToken: 'x', inviteCode: 'ZZZZZ-ZZZZZ' });
    const b = await post('/api/v1/auth/register', { email: existing, password: PASS, captchaToken: 'x', inviteCode: 'ZZZZZ-ZZZZZ' });
    expect(a.status).toBe(403);
    expect(b.status).toBe(403);
    expect(b.body).toEqual(a.body);
  });

  it('durée minimale constante : les deux chemins prennent au moins la durée réglée', async () => {
    vi.resetModules();
    const { padResponse } = await import('../src/utils/timing');
    const t0 = Date.now();
    await padResponse(Date.now(), 120);
    expect(Date.now() - t0).toBeGreaterThanOrEqual(110);
    const t1 = Date.now();
    await padResponse(Date.now() - 500, 120); // déjà plus long : pas d'attente en plus
    expect(Date.now() - t1).toBeLessThan(50);
  });

  it('vérification du code : compte inconnu, mauvais code et code expiré donnent la même réponse', async () => {
    const unknown = await post('/api/v1/auth/verify-email', { email: 'inconnu@test.local', code: '123456' });
    const wrong = await post('/api/v1/auth/verify-email', { email: existing, code: '000000' });
    expect(unknown.status).toBe(400);
    expect(wrong.status).toBe(400);
    expect(wrong.body).toEqual(unknown.body);
    const id = await createUser({ balance: 0 });
    const mail = `${id}@test.local`;
    await query(`UPDATE users SET verified = FALSE, verification_code = '654321', verification_code_expires_at = NOW() - INTERVAL '1 minute' WHERE id = $1`, [id]);
    const expired = await post('/api/v1/auth/verify-email', { email: mail, code: '654321' });
    expect(expired.status).toBe(400);
    expect(expired.body).toEqual(unknown.body);
  });

  it('renvoi du code : réponse identique pour un compte inconnu, déjà vérifié ou en attente', async () => {
    const unknown = await post('/api/v1/auth/resend-code', { email: 'inconnu2@test.local' });
    const verified = await post('/api/v1/auth/resend-code', { email: existing });
    const id = await createUser({ balance: 0 });
    await query('UPDATE users SET verified = FALSE WHERE id = $1', [id]);
    const pending = await post('/api/v1/auth/resend-code', { email: `${id}@test.local` });
    for (const r of [unknown, verified, pending]) expect(r.status).toBe(200);
    expect(verified.body.message).toBe(unknown.body.message);
    expect(pending.body.message).toBe(unknown.body.message);
  });

  it('connexion : e-mail inconnu et mauvais mot de passe donnent exactement la même réponse', async () => {
    const unknown = await post('/api/v1/auth/login', { email: 'inconnu3@test.local', password: 'Nimporte-quoi1' });
    const wrong = await post('/api/v1/auth/login', { email: existing, password: 'Nimporte-quoi1' });
    expect(wrong.status).toBe(unknown.status);
    expect(wrong.body).toEqual(unknown.body);
  });

  it('mot de passe oublié : même réponse que le compte existe ou non', async () => {
    const unknown = await post('/api/v1/auth/forgot-password', { email: 'inconnu4@test.local' });
    const known = await post('/api/v1/auth/forgot-password', { email: existing });
    expect(known.status).toBe(unknown.status);
    expect(known.body).toEqual(unknown.body);
  });

  it('code d\'invitation : « valide » seulement, sans raison, et sans le consommer', async () => {
    const ok = await invitationRepository.create({ maxUses: 1 });
    const revoked = await invitationRepository.create({ maxUses: 1 });
    await invitationRepository.revoke(revoked.code);
    const good = await post('/api/v1/auth/validate-invite', { code: ok.code });
    const bad = await post('/api/v1/auth/validate-invite', { code: 'ZZZZZ-ZZZZZ' });
    const rev = await post('/api/v1/auth/validate-invite', { code: revoked.code });
    const junk = await post('/api/v1/auth/validate-invite', { code: { $ne: 1 } });
    expect(good.body).toEqual({ valid: true });
    expect(bad.body).toEqual({ valid: false });
    expect(rev.body).toEqual({ valid: false });
    expect(junk.body).toEqual({ valid: false });
    expect((await query('SELECT uses FROM invitation_codes WHERE code = $1', [ok.code])).rows[0].uses).toBe(0);
  });

  it('la vérification de code d\'invitation est limitée (15 par 15 min et par IP)', async () => {
    const same = '10.88.0.1';
    let last = 0;
    for (let i = 0; i < 17; i++) last = (await request(app).post('/api/v1/auth/validate-invite').set('X-Forwarded-For', same).send({ code: 'AAAAA-BBBBB' })).status;
    expect(last).toBe(429);
  });
});
