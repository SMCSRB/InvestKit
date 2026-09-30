import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../src/app';
import { generateToken } from '../src/utils/jwt';
import { evaluateFlag, bucketOf, clearFlagCache } from '../src/services/featureFlagService';
import { clearUserStatusCache } from '../src/utils/userStatus';
import { query } from '../src/utils/db';
import { hasDb, setupDb, teardownDb, createUser, balanceOf } from './helpers';

describe('drapeaux de fonctionnalité : règle d\'évaluation', () => {
  it('désactivé = personne ; 100 % = tout le monde ; 0 % = personne', () => {
    expect(evaluateFlag({ key: 'x', enabled: false, rollout_percentage: 100 }, 'u1')).toBe(false);
    expect(evaluateFlag({ key: 'x', enabled: true, rollout_percentage: 100 }, 'u1')).toBe(true);
    expect(evaluateFlag({ key: 'x', enabled: true, rollout_percentage: 100 })).toBe(true);
    expect(evaluateFlag({ key: 'x', enabled: true, rollout_percentage: 0 }, 'u1')).toBe(false);
    expect(evaluateFlag({ key: 'x', enabled: true, rollout_percentage: 50 })).toBe(false); // sans utilisateur, pas de tirage
  });
  it('déploiement progressif : stable par utilisateur et proche du pourcentage demandé', () => {
    const ids = Array.from({ length: 4000 }, (_, i) => `user-${i}`);
    const on = ids.filter((id) => evaluateFlag({ key: 'nouveaute', enabled: true, rollout_percentage: 25 }, id)).length;
    expect(on / ids.length).toBeGreaterThan(0.21);
    expect(on / ids.length).toBeLessThan(0.29);
    expect(bucketOf('nouveaute', 'user-1')).toBe(bucketOf('nouveaute', 'user-1'));
    // croissant : un utilisateur inclus à 25 % l'est encore à 50 %
    for (const id of ids.slice(0, 300)) {
      if (evaluateFlag({ key: 'nouveaute', enabled: true, rollout_percentage: 25 }, id)) expect(evaluateFlag({ key: 'nouveaute', enabled: true, rollout_percentage: 50 }, id)).toBe(true);
    }
    // deux drapeaux différents ne ciblent pas les mêmes utilisateurs
    const a = ids.filter((id) => bucketOf('a', id) < 50), b = ids.filter((id) => bucketOf('b', id) < 50);
    expect(a.filter((x) => b.includes(x)).length).toBeLessThan(a.length * 0.65);
  });
});

describe.skipIf(!hasDb)('administration : API (HTTP, base réelle)', () => {
  let adminId: string, admin2Id: string, userId: string, targetId: string, noTwoFaAdminId: string;
  let adminTok: string, userTok: string, noTwoFaTok: string;
  const tok = (id: string) => generateToken(id, `${id}@test.local`);
  const as = (t: string, method: 'get' | 'post' | 'put' | 'delete', path: string, body?: object) => {
    const r = request(app)[method](`/api/v1${path}`).set('Authorization', `Bearer ${t}`);
    return body ? r.send(body) : r;
  };

  beforeAll(async () => {
    await setupDb();
    adminId = await createUser({ balance: 100 });
    admin2Id = await createUser({ balance: 0 });
    noTwoFaAdminId = await createUser({ balance: 0 });
    userId = await createUser({ balance: 50 });
    targetId = await createUser({ balance: 200, tier: 'free' });
    await query(`UPDATE users SET role = 'admin', enable_2fa = TRUE WHERE id = ANY($1)`, [[adminId, admin2Id]]);
    await query(`UPDATE users SET role = 'admin', enable_2fa = FALSE WHERE id = $1`, [noTwoFaAdminId]);
    await query(`UPDATE users SET username = $2 WHERE id = $1`, [targetId, `cible_${targetId.slice(0, 6)}`]);
    adminTok = tok(adminId); userTok = tok(userId); noTwoFaTok = tok(noTwoFaAdminId);
  });
  afterAll(teardownDb);

  const ADMIN_ROUTES: ['get' | 'post' | 'put' | 'delete', string][] = [
    ['get', '/admin/users'], ['get', `/admin/users/${'0'.repeat(8)}-0000-0000-0000-${'0'.repeat(12)}`], ['post', '/admin/users/x/pro'], ['post', '/admin/users/x/disable'],
    ['post', '/admin/users/x/enable'], ['post', '/admin/users/x/coins'], ['get', '/admin/audit'], ['get', '/admin/stats'], ['get', '/admin/billing'],
    ['get', '/admin/alerts'], ['get', '/admin/system'], ['get', '/admin/flags'], ['put', '/admin/flags/test_flag'], ['delete', '/admin/flags/test_flag'],
  ];

  it('toutes les routes admin : 401 sans jeton, 403 pour un non-admin, 403 « 2FA obligatoire » pour un admin sans 2FA', async () => {
    for (const [m, p] of ADMIN_ROUTES) {
      expect((await request(app)[m](`/api/v1${p}`)).status, `${m} ${p} sans jeton`).toBe(401);
      expect((await as(userTok, m, p)).status, `${m} ${p} non-admin`).toBe(403);
      const r = await as(noTwoFaTok, m, p);
      expect(r.status, `${m} ${p} sans 2FA`).toBe(403);
      expect(r.body.code).toBe('ADMIN_2FA_REQUIRED');
    }
  });

  it('liste des utilisateurs : recherche, filtres, pagination, jokers SQL neutralisés, aucun secret', async () => {
    const r = await as(adminTok, 'get', `/admin/users?q=${encodeURIComponent(targetId.slice(0, 8))}`);
    expect(r.status).toBe(200);
    expect(r.body.users.map((u: any) => u.id)).toContain(targetId);
    const txt = JSON.stringify(r.body);
    expect(txt).not.toMatch(/password_hash|totp_secret|reset_token|verification_code|stripe_customer_id/);
    const all = await as(adminTok, 'get', '/admin/users?pageSize=2&page=1');
    expect(all.body.users).toHaveLength(2);
    expect(all.body.total).toBeGreaterThan(4);
    const wild = await as(adminTok, 'get', `/admin/users?q=${encodeURIComponent('%')}`);
    expect(wild.body.total).toBe(0); // « % » est cherché littéralement, pas comme joker
    const inj = await as(adminTok, 'get', `/admin/users?q=${encodeURIComponent("'; DROP TABLE users; --")}`);
    expect(inj.status).toBe(200);
    expect((await as(adminTok, 'get', '/admin/users?status=admin')).body.users.every((u: any) => u.role === 'admin')).toBe(true);
  });

  it('fiche utilisateur : données utiles sans secret ; identifiant invalide refusé ; la consultation est tracée', async () => {
    const r = await as(adminTok, 'get', `/admin/users/${targetId}`);
    expect(r.status).toBe(200);
    expect(r.body.user.balance).toBe(200);
    expect(JSON.stringify(r.body)).not.toMatch(/password_hash|totp_secret|reset_token/);
    expect((await as(adminTok, 'get', '/admin/users/pas-un-uuid')).status).toBe(400);
    expect((await as(adminTok, 'get', `/admin/users/11111111-1111-1111-1111-111111111111`)).status).toBe(404);
    const audit = await query(`SELECT COUNT(*)::int AS n FROM audit_logs WHERE action = 'admin_view_user' AND user_id = $1 AND entity_id = $2`, [adminId, targetId]);
    expect(audit.rows[0].n).toBeGreaterThan(0);
  });

  it('statut Pro manuel : validé et tracé', async () => {
    expect((await as(adminTok, 'post', `/admin/users/${targetId}/pro`, { proOverride: 'oui' })).status).toBe(400);
    expect((await as(adminTok, 'post', `/admin/users/${targetId}/pro`, { proOverride: true })).status).toBe(200);
    expect((await query('SELECT pro_override FROM users WHERE id = $1', [targetId])).rows[0].pro_override).toBe(true);
    expect((await as(adminTok, 'post', `/admin/users/${targetId}/pro`, { proOverride: false })).status).toBe(200);
    expect((await query(`SELECT COUNT(*)::int AS n FROM audit_logs WHERE action = 'admin_set_pro_override' AND entity_id = $1`, [targetId])).rows[0].n).toBe(2);
  });

  it('suspension : motif obligatoire, pas soi-même, pas un admin ; le compte suspendu ne peut plus se connecter NI utiliser son jeton ; réactivation', async () => {
    const victim = await createUser({ balance: 10 });
    await query('UPDATE users SET password_hash = $2 WHERE id = $1', [victim, await bcrypt.hash('Motdepasse!42', 4)]);
    const vt = tok(victim);
    expect((await as(vt, 'get', '/economy/balance')).status).toBe(200);

    expect((await as(adminTok, 'post', `/admin/users/${victim}/disable`, {})).status).toBe(400);
    expect((await as(adminTok, 'post', `/admin/users/${adminId}/disable`, { reason: 'test' })).status).toBe(403);
    expect((await as(adminTok, 'post', `/admin/users/${admin2Id}/disable`, { reason: 'test' })).status).toBe(403);

    expect((await as(adminTok, 'post', `/admin/users/${victim}/disable`, { reason: 'comportement abusif' })).status).toBe(200);
    const after = await as(vt, 'get', '/economy/balance');
    expect(after.status).toBe(403);
    expect(after.body.code).toBe('ACCOUNT_DISABLED');
    const login = await request(app).post('/api/v1/auth/login').set('X-Forwarded-For', '10.20.30.40').send({ email: `${victim}@test.local`, password: 'Motdepasse!42' });
    expect(login.status).toBe(403);
    expect(login.body.code).toBe('ACCOUNT_DISABLED');

    expect((await as(adminTok, 'post', `/admin/users/${victim}/enable`)).status).toBe(200);
    expect((await as(vt, 'get', '/economy/balance')).status).toBe(200);
    const actions = (await query(`SELECT action FROM audit_logs WHERE entity_id = $1 AND action LIKE 'admin_%able_user'`, [victim])).rows.map((r: any) => r.action);
    expect(actions).toEqual(expect.arrayContaining(['admin_disable_user', 'admin_enable_user']));
  });

  it('ajustement de pièces : motif obligatoire, montant borné, registre (création/destruction), refus si solde insuffisant, tracé', async () => {
    const t = await createUser({ balance: 100 });
    const base = `/admin/users/${t}/coins`;
    for (const body of [{ amount: 10 }, { amount: 0, reason: 'x x' }, { amount: 1.5, reason: 'test' }, { amount: '10', reason: 'test' }, { amount: 100001, reason: 'test' }, { amount: -100001, reason: 'test' }]) {
      expect((await as(adminTok, 'post', base, body)).status, JSON.stringify(body)).toBe(400);
    }
    expect((await as(adminTok, 'post', base, { amount: 40, reason: 'geste commercial' })).body.balance).toBe(140);
    expect((await as(adminTok, 'post', base, { amount: -30, reason: 'correction erreur' })).body.balance).toBe(110);
    expect((await as(adminTok, 'post', base, { amount: -500, reason: 'trop' })).status).toBe(400);
    expect(await balanceOf(t)).toBe(110);
    const led = (await query(`SELECT amount, nature FROM investcoins_transactions WHERE user_id = $1 AND reason = 'admin_adjustment' ORDER BY amount DESC`, [t])).rows;
    expect(led).toEqual([{ amount: 40, nature: 'creation' }, { amount: -30, nature: 'destruction' }]);
    expect((await query(`SELECT COUNT(*)::int AS n FROM audit_logs WHERE action = 'admin_adjust_coins' AND entity_id = $1`, [t])).rows[0].n).toBe(2);
  });

  it('drapeaux : création, validation, évaluation côté joueur, déploiement progressif, suppression ; tracés', async () => {
    const key = 'nouveau_tableau_de_bord';
    expect((await as(adminTok, 'put', '/admin/flags/Mauvaise-Cle', { enabled: true })).status).toBe(400);
    expect((await as(adminTok, 'put', `/admin/flags/${key}`, { enabled: 'oui' })).status).toBe(400);
    expect((await as(adminTok, 'put', `/admin/flags/${key}`, { enabled: true, rolloutPercentage: 150 })).status).toBe(400);
    expect((await as(adminTok, 'put', `/admin/flags/${key}`, { enabled: true, rolloutPercentage: 100, description: 'Nouveau tableau de bord' })).status).toBe(200);
    clearFlagCache();
    expect((await as(userTok, 'get', '/flags')).body.flags[key]).toBe(true);
    await as(adminTok, 'put', `/admin/flags/${key}`, { enabled: true, rolloutPercentage: 0 });
    expect((await as(userTok, 'get', '/flags')).body.flags[key]).toBe(false);
    await as(adminTok, 'put', `/admin/flags/${key}`, { enabled: false });
    expect((await as(adminTok, 'get', '/admin/flags')).body.flags.map((f: any) => f.key)).toContain(key);
    expect((await as(adminTok, 'delete', `/admin/flags/${key}`)).status).toBe(200);
    expect((await as(adminTok, 'delete', `/admin/flags/${key}`)).status).toBe(404);
    expect((await as(userTok, 'get', '/flags')).body.flags[key]).toBeUndefined();
    expect((await query(`SELECT COUNT(*)::int AS n FROM audit_logs WHERE action IN ('admin_set_flag','admin_delete_flag')`)).rows[0].n).toBeGreaterThanOrEqual(4);
  });

  it('journal d\'audit : filtres et pagination', async () => {
    const r = await as(adminTok, 'get', '/admin/audit?action=admin_adjust_coins&pageSize=5');
    expect(r.status).toBe(200);
    expect(r.body.entries.length).toBeGreaterThan(0);
    expect(r.body.entries.every((e: any) => e.action === 'admin_adjust_coins')).toBe(true);
    expect(r.body.actions.length).toBeGreaterThan(0);
    expect((await as(adminTok, 'get', '/admin/audit?userId=nope')).status).toBe(400);
    expect((await as(adminTok, 'get', '/admin/audit?action=%27%3B--')).status).toBe(200); // action invalide ignorée
  });

  it('statistiques, facturation, système', async () => {
    const s = await as(adminTok, 'get', '/admin/stats');
    expect(s.status).toBe(200);
    expect(s.body.users.total).toBeGreaterThan(4);
    expect(s.body.signupsLast30Days).toHaveLength(30);
    expect(s.body.coins.inCirculation).toBeGreaterThan(0);
    const b = await as(adminTok, 'get', '/admin/billing');
    expect(b.status).toBe(200);
    expect(Array.isArray(b.body.subscriptions)).toBe(true);
    const sys = await as(adminTok, 'get', '/admin/system');
    expect(sys.body.database.ok).toBe(true);
    expect(sys.body.config.length).toBeGreaterThan(5);
    expect(JSON.stringify(sys.body)).not.toMatch(/sk_(live|test)|whsec_|JWT_SECRET=/);   // aucun secret dans l'état du système
  });

  it('alertes : un solde différent du registre est signalé', async () => {
    const t = await createUser({ balance: 500 });
    await query(`INSERT INTO investcoins_transactions (user_id, amount, reason, nature) VALUES ($1, 10, 'test', 'creation')`, [t]); // registre = 10, solde = 500
    const a = await as(adminTok, 'get', '/admin/alerts');
    expect(a.status).toBe(200);
    expect(a.body.alerts.map((x: any) => x.code)).toContain('LEDGER_MISMATCH');
    await query('DELETE FROM investcoins_balance WHERE user_id = $1', [t]);
  });
});
