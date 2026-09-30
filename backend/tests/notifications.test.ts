import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { generateToken } from '../src/utils/jwt';
import { query } from '../src/utils/db';
import { notify, notifyRealEstateEvent, notificationService } from '../src/services/notificationService';
import { logBankEvent } from '../src/services/bankService';
import { adminService } from '../src/services/adminService';
import { hasDb, setupDb, teardownDb, createUser } from './helpers';

describe.skipIf(!hasDb)('notifications réelles (base réelle)', () => {
  let a: string, b: string, ta: string, tb: string;
  const get = (t: string, q = '') => request(app).get(`/api/v1/notifications${q}`).set('Authorization', `Bearer ${t}`);
  const read = (t: string, body: object) => request(app).post('/api/v1/notifications/read').set('Authorization', `Bearer ${t}`).send(body);

  beforeAll(async () => {
    await setupDb();
    a = await createUser({ balance: 100 }); b = await createUser({ balance: 100 });
    ta = generateToken(a, `${a}@test.local`); tb = generateToken(b, `${b}@test.local`);
  });
  afterAll(teardownDb);

  it('authentification requise ; liste vide au départ', async () => {
    expect((await request(app).get('/api/v1/notifications')).status).toBe(401);
    expect((await request(app).post('/api/v1/notifications/read').send({ all: true })).status).toBe(401);
    const r = await get(ta);
    expect(r.body).toEqual({ notifications: [], unread: 0 });
  });

  it('création, ordre (récent d\'abord), compteur de non lues, chacun voit les siennes', async () => {
    await notify({ query }, a, { kind: 'test', title: 'Première', body: 'un' });
    await notify({ query }, a, { kind: 'test', title: 'Deuxième', body: 'deux', link: '/banque' });
    await notify({ query }, b, { kind: 'test', title: 'Pour B' });
    const r = await get(ta);
    expect(r.body.notifications.map((n: any) => n.title)).toEqual(['Deuxième', 'Première']);
    expect(r.body.unread).toBe(2);
    expect(r.body.notifications[0]).toMatchObject({ link: '/banque', read: false, kind: 'test' });
    expect(JSON.stringify((await get(tb)).body)).not.toContain('Première');
    expect((await get(ta, '?limit=1')).body.notifications).toHaveLength(1);
    expect((await get(ta, '?limit=abc')).status).toBe(200);
  });

  it('lecture : par identifiants ou tout ; impossible de marquer celles d\'un autre ; validation', async () => {
    const mine = (await get(ta)).body.notifications;
    const theirs = (await get(tb)).body.notifications[0].id;
    const cross = await read(ta, { ids: [theirs] });
    expect(cross.body.updated).toBe(0);                                   // la notification de B n'est pas modifiable par A
    expect((await get(tb)).body.unread).toBe(1);
    const one = await read(ta, { ids: [mine[0].id] });
    expect(one.body.updated).toBe(1);
    expect((await get(ta)).body.unread).toBe(1);
    expect((await get(ta, '?unread=true')).body.notifications).toHaveLength(1);
    for (const bad of [{}, { ids: [] }, { ids: ['abc'] }, { ids: [1] }, { ids: 'x' }, { all: 'oui' }, { ids: Array(201).fill('1') }]) {
      expect((await read(ta, bad)).status, JSON.stringify(bad)).toBe(400);
    }
    expect((await read(ta, { all: true })).body.updated).toBe(1);
    expect((await get(ta)).body.unread).toBe(0);
  });

  it('conservation des 200 dernières notifications', async () => {
    const u = await createUser({ balance: 1 });
    for (let i = 0; i < 205; i++) await notify({ query }, u, { kind: 'bulk', title: `N${i}` });
    const n = (await query('SELECT COUNT(*)::int AS n FROM notifications WHERE user_id = $1', [u])).rows[0].n;
    expect(n).toBe(200);
    const list = await notificationService.list(u, 100);
    expect(list.notifications[0].title).toBe('N204');
    expect((await query('SELECT MIN(title) FROM notifications WHERE user_id = $1 AND title = $2', [u, 'N0'])).rows[0].min).toBeNull();
  });

  it('sources : événements bancaires importants, événements Immobilier importants, ajustement admin, sécurité', async () => {
    const u = await createUser({ balance: 10 });
    await logBankEvent({ query } as any, u, null, 'margin_call', 'APPEL DE MARGE : rembourse ou ajoute des titres.');
    await logBankEvent({ query } as any, u, null, 'loan_opened', 'Prêt accordé.');                       // pas de notification : simple information
    await notifyRealEstateEvent({ query }, u, 'default_started', 'Le locataire ne paie plus.');
    await notifyRealEstateEvent({ query }, u, 'late_payment', 'Loyer en retard.');                        // pas de notification : trop fréquent
    const adminId = await createUser({ balance: 0 });
    await adminService.adjustCoins(adminId, u, 25, 'geste commercial');
    const titles = (await notificationService.list(u)).notifications.map((n) => n.title);
    expect(titles).toEqual(expect.arrayContaining(['Appel de marge', 'Loyers impayés']));
    expect(titles.some((t) => t.includes('25'))).toBe(true);
    expect(titles).not.toContain('Prêt accordé');
    expect(titles).toHaveLength(3);
    const firstBank = (await notificationService.list(u)).notifications.find((n) => n.kind === 'bank_margin_call')!;
    expect(firstBank).toMatchObject({ link: '/banque' });
    expect(firstBank.body).toContain('APPEL DE MARGE');
  });

  it('suppression du compte : les notifications sont supprimées avec lui (RGPD)', async () => {
    const u = await createUser({ balance: 1 });
    await notify({ query }, u, { kind: 'x', title: 'à supprimer' });
    await query('DELETE FROM users WHERE id = $1', [u]);
    expect((await query('SELECT COUNT(*)::int AS n FROM notifications WHERE user_id = $1', [u])).rows[0].n).toBe(0);
  });
});
