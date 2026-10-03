import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';

const mails: { to: string; stage: string }[] = [];
vi.mock('../src/utils/email', async (orig) => {
  const real = await orig<typeof import('../src/utils/email')>();
  return { ...real, sendAccountDeletionNotice: async (to: string, _n: unknown, stage: string) => { mails.push({ to, stage }); return { ok: true }; } };
});

import app from '../src/app';
import { generateToken } from '../src/utils/jwt';
import { csrfTokenFor } from '../src/utils/session';
import { query } from '../src/utils/db';
import { deleteAccount } from '../src/services/accountService';
import { investcoinsRepository } from '../src/repositories/investcoinsRepository';
import { auditLog } from '../src/services/auditService';
import { hasDb, setupDb, teardownDb, createUser, balanceOf } from './helpers';
import fs from 'fs';
import path from 'path';

const PASSWORD = 'MotDePasse-Test-123';
const tok = (id: string) => `Bearer ${generateToken(id, `${id}@test.local`)}`;
const browser = (id: string) => { const jwt = generateToken(id, `${id}@test.local`); const csrf = csrfTokenFor(jwt); return { Cookie: `ik_session=${jwt}; ik_csrf=${csrf}`, 'X-CSRF-Token': csrf }; };
let ip = 100; const ipH = () => ({ 'X-Forwarded-For': `10.9.${Math.floor(ip / 250)}.${ip++ % 250}` });
const settle = () => new Promise((r) => setTimeout(r, 120));
const RUN = Math.random().toString(36).slice(2, 8);
const noCancel = { cancelSubscription: async () => undefined };

describe.skipIf(!hasDb)('suppression de compte : conservation légale, anonymisation, guildes, jetons (base réelle)', () => {
  beforeAll(async () => { await setupDb(); app.set('trust proxy', true); });
  afterAll(async () => { app.set('trust proxy', false); await teardownDb(); });
  beforeEach(() => { mails.length = 0; });
  const uniq = () => Math.random().toString(36).slice(2, 8);

  const player = async (name: string, balance = 500) => {
    const id = await createUser({ balance, verified: true });
    await query('UPDATE users SET username = $2, password_hash = $3 WHERE id = $1', [id, name, await bcrypt.hash(PASSWORD, 4)]);
    return id;
  };
  const del = (id: string, deps = noCancel) => deleteAccount(id, { password: PASSWORD, confirm: 'SUPPRIMER' }, deps, '203.0.113.9');
  const stats = async () => JSON.stringify(await investcoinsRepository.ledgerStatsByDomain());

  it('a) abonnement payant : trace comptable minimale SANS lien avec le profil ; abonnement sans identifiant de paiement : rien conservé', async () => {
    const id = await player('Payeur');
    await query(`INSERT INTO subscriptions (user_id, tier, status, payment_provider, external_subscription_id, started_at, current_period_end) VALUES ($1,'pro','active','stripe','sub_TEST_${RUN}', NOW() - INTERVAL '40 days', NOW() + INTERVAL '20 days')`, [id]);
    const before = (await query('SELECT COUNT(*)::int AS n FROM billing_records_archive')).rows[0].n;
    await del(id);
    const rows = (await query(`SELECT * FROM billing_records_archive WHERE external_subscription_id = 'sub_TEST_${RUN}'`)).rows;
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0]).sort()).toEqual(['archived_at', 'canceled_at', 'current_period_end', 'external_subscription_id', 'id', 'payment_provider', 'retain_until', 'started_at', 'tier']);   // aucune colonne user_id / e-mail
    expect(new Date(rows[0].retain_until).getFullYear()).toBeGreaterThanOrEqual(new Date().getFullYear() + 9);
    expect((await query('SELECT COUNT(*)::int AS n FROM billing_records_archive')).rows[0].n).toBe(before + 1);
    const free = await player('Gratuit');
    await query(`INSERT INTO subscriptions (user_id, tier, status) VALUES ($1,'free','active')`, [free]);
    await del(free);
    expect((await query('SELECT COUNT(*)::int AS n FROM billing_records_archive')).rows[0].n).toBe(before + 1);
  });

  it('b) registre des pièces : lignes du joueur effacées, totaux par domaine IDENTIQUES (archive anonyme) ; journal d\'audit sans IP, sans identifiant, sans e-mail', async () => {
    const keep = await player('Reste');
    const id = await player('Part', 0);
    await investcoinsRepository.applyTransaction(id, 300, 'daily_reward', { s: 1 });
    await investcoinsRepository.applyTransaction(id, -40, 'trading_fee', { s: 1 }).catch(() => undefined);
    await investcoinsRepository.applyTransaction(keep, 60, 'daily_reward', {});
    await auditLog({ userId: id, action: 'login', entityType: 'user', entityId: id, metadata: { email: 'part@test.local', username: 'Part', keep: 'ok' }, ip: '198.51.100.7' });
    await auditLog({ userId: keep, action: 'admin_set_pro_override', entityType: 'user', entityId: id, metadata: { value: true, target: 'part@test.local' }, ip: '192.0.2.50' });
    const before = await stats();
    const total = (await query(`SELECT COALESCE(SUM(amount),0)::int AS s FROM investcoins_transactions`)).rows[0].s;
    await del(id);
    expect(await stats()).toBe(before);                                              // statistiques identiques
    expect((await query('SELECT COUNT(*)::int AS n FROM investcoins_transactions WHERE user_id = $1', [id])).rows[0].n).toBe(0);
    const archived = (await query('SELECT COALESCE(SUM(credited - debited),0)::int AS s FROM investcoins_ledger_archive')).rows[0].s;
    expect(archived).toBeGreaterThanOrEqual(260);
    expect((await query(`SELECT COALESCE(SUM(amount),0)::int AS s FROM investcoins_transactions`)).rows[0].s + archived).toBeGreaterThanOrEqual(total);
    expect(await balanceOf(keep)).toBe(560);                                          // un autre joueur : intact
    const rows = (await query(`SELECT * FROM audit_logs WHERE action IN ('login','admin_set_pro_override') AND user_id IS DISTINCT FROM $1::uuid ORDER BY id DESC LIMIT 2`, [id])).rows;
    const json = JSON.stringify((await query(`SELECT * FROM audit_logs WHERE created_at > NOW() - INTERVAL '1 minute'`)).rows);
    expect(json).not.toContain(id);
    expect(json).not.toContain('part@test.local');
    expect(json).not.toContain('198.51.100.7');
    expect(json).not.toContain('"username":"Part"');
    expect(json).toContain('"keep":"ok"');                                            // le reste des détails (non identifiant) est conservé
    expect(rows.length).toBeGreaterThan(0);
    expect(json).toContain('192.0.2.50');                                            // l'IP de l'administrateur, elle, n'est pas touchée
  });

  it('b) le journal d\'audit reste en ajout seul : suppression et autres modifications toujours interdites', async () => {
    const id = await player('Audit');
    await auditLog({ userId: id, action: 'test_guard', entityType: 'user', entityId: id, metadata: { a: 1 }, ip: '1.2.3.4' });
    await expect(query(`DELETE FROM audit_logs WHERE action = 'test_guard'`)).rejects.toThrow(/ajout seul/);
    await expect(query(`UPDATE audit_logs SET action = 'autre' WHERE action = 'test_guard'`)).rejects.toThrow(/ajout seul/);
    await expect(query(`UPDATE audit_logs SET metadata = '{"a":2}' WHERE action = 'test_guard'`)).rejects.toThrow(/ajout seul/);
    await del(id);
    const r = (await query(`SELECT user_id, entity_id, ip_address, metadata FROM audit_logs WHERE action = 'test_guard'`)).rows[0];
    expect(r).toEqual({ user_id: null, entity_id: null, ip_address: null, metadata: { a: 1 } });
  });

  it('c) amis, demandes, classements : le joueur disparaît ; son pseudo n\'apparaît plus dans les notifications des autres', async () => {
    const a = await player('Disparu'); const b = await player('Ami');
    await query(`INSERT INTO friendships (user_low, user_high, requested_by, status, responded_at) VALUES (LEAST($1::uuid,$2::uuid), GREATEST($1::uuid,$2::uuid), $1, 'accepted', NOW())`, [a, b]);
    await query(`INSERT INTO notifications (user_id, kind, title, body) VALUES ($1,'friend_accepted','Demande acceptée','Disparu est maintenant ton ami.'), ($1,'quiz','Autre','Disparu(e) dans un autre texte')`, [b]);
    await query(`INSERT INTO leaderboard_rankings (user_id, mode, domain, period, performance_pct, capital_committed) VALUES ($1,'accelerated','stocks','2010',5,100)`, [a]).catch(() => undefined);
    await del(a);
    expect((await request(app).get('/api/v1/social/friends').set('Authorization', tok(b))).body.friends).toEqual([]);
    expect((await query(`SELECT COUNT(*)::int AS n FROM friendships WHERE user_low = $1 OR user_high = $1`, [a])).rows[0].n).toBe(0);
    expect((await query(`SELECT COUNT(*)::int AS n FROM leaderboard_rankings WHERE user_id = $1`, [a])).rows[0].n).toBe(0);
    const notes = (await query(`SELECT kind FROM notifications WHERE user_id = $1`, [b])).rows.map((r: any) => r.kind);
    expect(notes).toEqual(['quiz']);                                                  // seules les notifications de relation qui nomment le joueur sont retirées
  });

  it('c) chef de guilde : le membre le plus ancien reprend ; guilde dont il est le seul membre : supprimée', async () => {
    const chef = await player('Chef'); const m1 = await player('Ancien'); const m2 = await player('Recent');
    const g = (await query(`INSERT INTO guilds (name, name_key, description, invite_code) VALUES ($1, $2, '', $3) RETURNING id`, [`Equipe ${RUN}`, `equipe-${RUN}`, `EQ${RUN}`.toUpperCase()])).rows[0].id;
    await query(`INSERT INTO guild_members (guild_id, user_id, role, joined_at) VALUES ($1,$2,'owner', NOW() - INTERVAL '10 days'), ($1,$3,'member', NOW() - INTERVAL '5 days'), ($1,$4,'member', NOW() - INTERVAL '1 day')`, [g, chef, m1, m2]);
    const solo = await player('Solo');
    const g2 = (await query(`INSERT INTO guilds (name, name_key, description, invite_code) VALUES ($1, $2, '', $3) RETURNING id`, [`Seul ${RUN}`, `seul-${RUN}`, `SO${RUN}`.toUpperCase()])).rows[0].id;
    await query(`INSERT INTO guild_members (guild_id, user_id, role) VALUES ($1,$2,'owner')`, [g2, solo]);
    await del(chef); await del(solo);
    const owners = (await query(`SELECT user_id FROM guild_members WHERE guild_id = $1 AND role = 'owner'`, [g])).rows;
    expect(owners).toEqual([{ user_id: m1 }]);
    expect((await query('SELECT COUNT(*)::int AS n FROM guild_members WHERE guild_id = $1', [g])).rows[0].n).toBe(2);
    expect((await query('SELECT COUNT(*)::int AS n FROM guilds WHERE id = $1', [g2])).rows[0].n).toBe(0);
  });

  it('d) photo, codes, jetons, invitations, retours : tout est supprimé ; un jeton encore valide est refusé (401) ; rien d\'un autre compte n\'est touché', async () => {
    const id = await player('Complet'); const other = await player('Autre');
    await query(`INSERT INTO user_avatars (user_id, image, content_type) VALUES ($1, 'x'::bytea, 'image/webp'), ($2, 'y'::bytea, 'image/webp')`, [id, other]);
    await query(`UPDATE users SET avatar_id = 'a'||repeat('0',35), reset_token = 'secret-reset', verification_code = '123456', bio = 'ma bio' WHERE id = $1`, [id]);
    await query(`INSERT INTO email_change_requests (user_id, new_email, code_hash, expires_at) VALUES ($1,'n@x.org','h', NOW() + INTERVAL '1 hour')`, [id]);
    await query(`INSERT INTO feedback (user_id, kind, rating, message) VALUES ($1,'idea',1,'mon avis avec mon nom'), ($2,'idea',-1,'avis autre')`, [id, other]);
    const token = tok(id);
    expect((await request(app).get('/api/v1/auth/me').set('Authorization', token)).status).toBe(200);
    await del(id);
    expect((await query('SELECT COUNT(*)::int AS n FROM users WHERE id = $1', [id])).rows[0].n).toBe(0);
    for (const t of ['user_avatars', 'email_change_requests', 'feedback', 'notifications']) {
      expect((await query(`SELECT COUNT(*)::int AS n FROM ${t} WHERE user_id = $1`, [id])).rows[0].n, t).toBe(0);
    }
    expect((await query('SELECT COUNT(*)::int AS n FROM user_avatars WHERE user_id = $1', [other])).rows[0].n).toBe(1);
    expect((await query('SELECT COUNT(*)::int AS n FROM feedback WHERE user_id = $1', [other])).rows[0].n).toBe(1);
    const after = await request(app).get('/api/v1/auth/me').set('Authorization', token);
    expect(after.status).toBe(401);
    expect(after.body.code).toBe('ACCOUNT_GONE');
    const viaCookie = await request(app).get('/api/v1/economy/balance').set(browser(id));
    expect(viaCookie.status).toBe(401);
    expect((await request(app).get(`/api/v1/profile/avatar/a${'0'.repeat(35)}`)).status).toBe(404);
  });

  it('f) e-mail de prévenance AVANT puis APRÈS, à l\'adresse du compte ; refus (mauvais mot de passe) : aucun e-mail « après », compte conservé', async () => {
    const id = await player('Prevenu');
    await expect(deleteAccount(id, { password: 'faux', confirm: 'SUPPRIMER' }, noCancel)).rejects.toThrow();
    await settle();
    expect(mails).toEqual([]);                                                        // refus avant tout : aucune prévenance
    await del(id); await settle();
    expect(mails.map((m) => m.stage)).toEqual(['requested', 'done']);
    expect(mails.every((m) => m.to === `${id}@test.local`)).toBe(true);
    // abonnement impossible à annuler : prévenance « en cours » envoyée, mais pas « supprimé », et le compte reste
    const sub = await player('Abonne'); mails.length = 0;
    await query(`INSERT INTO subscriptions (user_id, tier, status, payment_provider, external_subscription_id) VALUES ($1,'pro','active','stripe','sub_FAIL')`, [sub]);
    await expect(deleteAccount(sub, { password: PASSWORD, confirm: 'SUPPRIMER' }, { cancelSubscription: async () => { throw new Error('panne'); } })).rejects.toThrow(/n'a pas été supprimé/);
    await settle();
    expect(mails.map((m) => m.stage)).toEqual(['requested']);
    expect((await query('SELECT COUNT(*)::int AS n FROM users WHERE id = $1', [sub])).rows[0].n).toBe(1);
  });

  it('f) limitation de débit : 5 demandes par heure et par IP', async () => {
    const id = await player('Limite');
    const fixed = '203.0.113.200'; const codes: number[] = [];
    for (let i = 0; i < 7; i++) codes.push((await request(app).post('/api/v1/auth/me/delete').set(browser(id)).set('X-Forwarded-For', fixed).send({ password: 'faux', confirm: 'SUPPRIMER' })).status);
    expect(codes.slice(0, 5).every((c) => c === 401)).toBe(true);
    expect(codes[5]).toBe(429);
    expect((await query('SELECT COUNT(*)::int AS n FROM users WHERE id = $1', [id])).rows[0].n).toBe(1);
  });
});

describe('suppression de compte : politique de confidentialité', () => {
  it('la page de confidentialité décrit ce qui est conservé et la durée dans les sauvegardes', () => {
    const t = fs.readFileSync(path.join(__dirname, '..', '..', 'app/privacy/page.jsx'), 'utf8');
    expect(t).toMatch(/sauvegardes/i);
    expect(t).toMatch(/14 jours/);
    expect(t).toMatch(/comptab/i);
  });
});
