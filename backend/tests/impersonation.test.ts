import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { generateToken, verifyToken } from '../src/utils/jwt';
import { csrfTokenFor } from '../src/utils/session';
import { query } from '../src/utils/db';
import { clearUserStatusCache } from '../src/utils/userStatus';
import { hasDb, setupDb, teardownDb, createUser } from './helpers';

const cookiesOf = (res: request.Response): string[] => ([] as string[]).concat((res.headers['set-cookie'] as unknown as string[]) ?? []);
const val = (cookies: string[], name: string) => { const c = cookies.find((x) => x.startsWith(`${name}=`)); return c ? decodeURIComponent(c.split(';')[0].split('=').slice(1).join('=')) : undefined; };

describe.skipIf(!hasDb)('administration : impersonation en lecture seule (HTTP, base réelle)', () => {
  let adminId: string, admin2Id: string, noTwoFaId: string, userId: string;
  let adminTok: string;

  beforeAll(async () => {
    await setupDb();
    adminId = await createUser({ balance: 10 });
    admin2Id = await createUser({ balance: 10 });
    noTwoFaId = await createUser({ balance: 10 });
    userId = await createUser({ balance: 123 });
    await query(`UPDATE users SET role = 'admin', enable_2fa = TRUE WHERE id = ANY($1)`, [[adminId, admin2Id]]);
    await query(`UPDATE users SET role = 'admin', enable_2fa = FALSE WHERE id = $1`, [noTwoFaId]);
    adminTok = generateToken(adminId, `${adminId}@test.local`);
  });
  afterAll(teardownDb);

  const start = (tok: string, id: string) => request(app).post(`/api/v1/admin/users/${id}/impersonate`).set('Authorization', `Bearer ${tok}`);

  it('refus : non-admin, admin sans 2FA, autre administrateur, soi-même, inconnu, identifiant invalide', async () => {
    const userTok = generateToken(userId, `${userId}@test.local`);
    expect((await start(userTok, userId)).status).toBe(403);
    expect((await start(generateToken(noTwoFaId, `${noTwoFaId}@test.local`), userId)).status).toBe(403);
    expect((await start(adminTok, admin2Id)).status).toBe(403);
    expect((await start(adminTok, adminId)).status).toBe(403);
    expect((await start(adminTok, '11111111-1111-1111-1111-111111111111')).status).toBe(404);
    expect((await start(adminTok, 'x')).status).toBe(400);
  });

  it('démarrage, lecture seule, pas d\'export RGPD, pas d\'accès admin, sortie et retour à la session administrateur ; tout est tracé', async () => {
    const r = await start(adminTok, userId);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ success: true, readOnly: true, minutes: 15, target: { id: userId } });
    const cookies = cookiesOf(r);
    const imp = val(cookies, 'ik_session')!;
    const backup = val(cookies, 'ik_admin_backup')!;
    const csrf = val(cookies, 'ik_csrf')!;
    expect(cookies.find((c) => c.startsWith('ik_session='))).toMatch(/HttpOnly/i);
    expect(cookies.find((c) => c.startsWith('ik_admin_backup='))).toMatch(/HttpOnly/i);

    // jeton d'impersonation : identité de l'utilisateur, court (15 min), marqué par l'administrateur
    const payload = verifyToken(imp)!;
    expect(payload).toMatchObject({ userId, impersonatedBy: adminId });
    expect(payload.exp! - payload.iat!).toBe(15 * 60);
    expect(csrf).toBe(csrfTokenFor(imp));
    expect(verifyToken(backup)!.userId).toBe(adminId);

    const jar = `ik_session=${imp}; ik_csrf=${csrf}; ik_admin_backup=${backup}`;
    const me = await request(app).get('/api/v1/auth/me').set('Cookie', jar);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(`${userId}@test.local`);
    expect(me.body.impersonatedBy).toBe(adminId);
    expect((await request(app).get('/api/v1/economy/balance').set('Cookie', jar)).body.balance).toBe(123); // il voit ce que voit le joueur

    // aucune écriture
    const write = await request(app).post('/api/v1/economy/daily-reward').set('Cookie', jar).set('X-CSRF-Token', csrf);
    expect(write.status).toBe(403);
    expect(write.body.code).toBe('IMPERSONATION_READ_ONLY');
    expect((await request(app).post('/api/v1/trading/buy').set('Cookie', jar).set('X-CSRF-Token', csrf).send({ domain: 'stocks', symbol: 'TTE', quantity: 1 })).status).toBe(403);
    expect((await request(app).post('/api/v1/auth/me/delete').set('Cookie', jar).set('X-CSRF-Token', csrf).send({})).status).toBe(403);
    // pas d'export de données personnelles
    expect((await request(app).get('/api/v1/auth/me/export').set('Cookie', jar)).body.code).toBe('IMPERSONATION_READ_ONLY');
    // pas d'accès admin avec l'identité du joueur
    expect((await request(app).get('/api/v1/admin/users').set('Cookie', jar)).status).toBe(403);

    // sortie
    const noBackup = await request(app).post('/api/v1/auth/impersonation/stop').set('Cookie', `ik_session=${imp}; ik_csrf=${csrf}`).set('X-CSRF-Token', csrf);
    expect(noBackup.status).toBe(400);                                    // sans la session mise de côté : refusé
    const stop = await request(app).post('/api/v1/auth/impersonation/stop').set('Cookie', jar).set('X-CSRF-Token', csrf);
    expect(stop.status).toBe(200);
    const restored = val(cookiesOf(stop), 'ik_session')!;
    expect(verifyToken(restored)!.userId).toBe(adminId);
    expect(verifyToken(restored)!.impersonatedBy).toBeUndefined();
    const again = await request(app).get('/api/v1/admin/stats').set('Cookie', `ik_session=${restored}`);
    expect(again.status).toBe(200);                                       // redevenu administrateur

    const acts = (await query(`SELECT action FROM audit_logs WHERE user_id = $1 AND action LIKE 'admin_impersonate_%'`, [adminId])).rows.map((x: any) => x.action);
    expect(acts).toEqual(expect.arrayContaining(['admin_impersonate_start', 'admin_impersonate_stop']));
  });

  it('une session d\'impersonation ne peut pas servir à « sortir » vers un compte qui n\'est plus administrateur', async () => {
    const r = await start(adminTok, userId);
    const cookies = cookiesOf(r);
    const imp = val(cookies, 'ik_session')!, backup = val(cookies, 'ik_admin_backup')!, csrf = val(cookies, 'ik_csrf')!;
    await query(`UPDATE users SET role = 'user' WHERE id = $1`, [adminId]);
    const stop = await request(app).post('/api/v1/auth/impersonation/stop').set('Cookie', `ik_session=${imp}; ik_csrf=${csrf}; ik_admin_backup=${backup}`).set('X-CSRF-Token', csrf);
    expect(stop.status).toBe(403);
    await query(`UPDATE users SET role = 'admin' WHERE id = $1`, [adminId]);
  });

  it('un faux cookie de sauvegarde (jeton d\'un autre utilisateur) est refusé', async () => {
    const r = await start(adminTok, userId);
    const cookies = cookiesOf(r);
    const imp = val(cookies, 'ik_session')!, csrf = val(cookies, 'ik_csrf')!;
    const fake = generateToken(admin2Id, `${admin2Id}@test.local`);          // un autre admin, mais pas celui qui a lancé l'impersonation
    const stop = await request(app).post('/api/v1/auth/impersonation/stop').set('Cookie', `ik_session=${imp}; ik_csrf=${csrf}; ik_admin_backup=${fake}`).set('X-CSRF-Token', csrf);
    expect(stop.status).toBe(400);
  });

  it('le compte visé, s\'il est suspendu, reste inaccessible même en impersonation', async () => {
    const t = await createUser({ balance: 1 });
    const r = await start(adminTok, t);
    const imp = val(cookiesOf(r), 'ik_session')!;
    await query('UPDATE users SET disabled_at = NOW() WHERE id = $1', [t]);
    clearUserStatusCache();
    expect((await request(app).get('/api/v1/auth/me').set('Cookie', `ik_session=${imp}`)).status).toBe(403);
  });
});
