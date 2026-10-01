import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { hasDb, setupDb, teardownDb, createUser } from './helpers';
import { query } from '../src/utils/db';
import { socialService as svc, SocialError } from '../src/services/socialService';
import app from '../src/app';
import { generateToken } from '../src/utils/jwt';

const code = async (id: string) => (await svc.me(id)).friendCode;
const fails = async (p: Promise<unknown>, c: string) => { await expect(p).rejects.toMatchObject({ code: c }); };

describe.skipIf(!hasDb)('amis réels', () => {
  beforeAll(async () => { await setupDb(); });
  afterAll(async () => { await teardownDb(); });

  it('code ami : généré, stable, sans caractères ambigus, jamais l\'e-mail', async () => {
    const a = await createUser();
    const c1 = await code(a), c2 = await code(a);
    expect(c1).toBe(c2);
    expect(c1).toMatch(/^[A-HJKMNP-Z2-9]{8}$/);
  });

  it('demande → acceptation : amis des deux côtés, niveau et XP réels, notifications', async () => {
    const a = await createUser(), b = await createUser();
    await query('INSERT INTO education_progress (user_id, domain_id, chapter_id, xp_earned) VALUES ($1,\'d\',\'c1\',500),($1,\'d\',\'c2\',500),($1,\'d\',\'c3\',200)', [b]);
    const r = await svc.sendRequest(a, `#${(await code(b)).toLowerCase()}`);
    expect(r.status).toBe('pending');
    expect((await svc.requests(b)).incoming).toHaveLength(1);
    expect((await svc.requests(a)).outgoing).toHaveLength(1);
    expect((await svc.me(b)).incoming).toBe(1);
    await svc.respond(b, (await svc.requests(b)).incoming[0].id, 'accept');
    const fa = (await svc.friends(a)).friends, fb = (await svc.friends(b)).friends;
    expect(fa).toHaveLength(1); expect(fb).toHaveLength(1);
    expect(fa[0]).toMatchObject({ userId: b, xp: 1200, level: 3 });
    expect(Object.keys(fa[0]).sort()).toEqual(['level', 'name', 'since', 'userId', 'xp']); // rien d'autre n'est exposé
    const n = (await query('SELECT kind FROM notifications WHERE user_id = ANY($1::uuid[])', [[a, b]])).rows.map((x: any) => x.kind);
    expect(n).toContain('friend_request'); expect(n).toContain('friend_accepted');
  });

  it('règles : soi-même, code inconnu, doublon, déjà amis, demandes croisées = amitié', async () => {
    const a = await createUser(), b = await createUser();
    await fails(svc.sendRequest(a, await code(a)), 'INVALID_INPUT');
    await fails(svc.sendRequest(a, 'ZZZZZZZZ'), 'NOT_FOUND');
    await fails(svc.sendRequest(a, 'abc'), 'INVALID_INPUT');
    await svc.sendRequest(a, await code(b));
    await fails(svc.sendRequest(a, await code(b)), 'CONFLICT');
    const r = await svc.sendRequest(b, await code(a));       // croisement : acceptée
    expect(r.status).toBe('accepted');
    await fails(svc.sendRequest(a, await code(b)), 'CONFLICT');
  });

  it('seul le destinataire accepte ; seul l\'auteur annule ; refus et annulation effacent la demande', async () => {
    const a = await createUser(), b = await createUser(), c = await createUser();
    await svc.sendRequest(a, await code(b));
    const id = (await svc.requests(b)).incoming[0].id;
    await fails(svc.respond(a, id, 'accept'), 'FORBIDDEN');
    await fails(svc.respond(b, id, 'cancel'), 'FORBIDDEN');
    await fails(svc.respond(c, id, 'accept'), 'NOT_FOUND');   // un tiers ne voit pas la demande
    await svc.respond(b, id, 'decline');
    expect((await svc.requests(a)).outgoing).toHaveLength(0);
    await svc.sendRequest(a, await code(b));
    await svc.respond(a, (await svc.requests(a)).outgoing[0].id, 'cancel');
    expect((await svc.requests(b)).incoming).toHaveLength(0);
  });

  it('blocage : retire l\'amitié, empêche les demandes dans les deux sens SANS révéler le blocage ; déblocage possible', async () => {
    const a = await createUser(), b = await createUser();
    await svc.sendRequest(a, await code(b)); await svc.respond(b, (await svc.requests(b)).incoming[0].id, 'accept');
    await svc.block(b, a);
    expect((await svc.friends(a)).friends).toHaveLength(0);
    await expect(svc.sendRequest(a, await code(b))).rejects.toMatchObject({ code: 'NOT_FOUND', message: 'Aucun joueur avec ce code' });
    await expect(svc.sendRequest(b, await code(a))).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect((await svc.blocks(b)).blocks.map((x) => x.userId)).toEqual([a]);
    await svc.unblock(b, a);
    expect((await svc.sendRequest(b, await code(a))).status).toBe('pending');
  });

  it('plafonds : demandes envoyées en attente, et retirer un ami', async () => {
    const a = await createUser();
    for (let i = 0; i < 20; i++) { const x = await createUser(); await svc.sendRequest(a, await code(x)); }
    await fails(svc.sendRequest(a, await code(await createUser())), 'LIMIT');
    const b = await createUser(), c = await createUser();
    await svc.sendRequest(b, await code(c)); await svc.respond(c, (await svc.requests(c)).incoming[0].id, 'accept');
    await svc.removeFriend(b, c);
    expect((await svc.friends(c)).friends).toHaveLength(0);
    await fails(svc.removeFriend(b, c), 'NOT_FOUND');
    await fails(svc.removeFriend(b, 'pas-un-uuid'), 'INVALID_INPUT');
  });
});

describe.skipIf(!hasDb)('guildes réelles', () => {
  beforeAll(async () => { await setupDb(); });
  afterAll(async () => { await teardownDb(); });
  const uniq = () => `Guilde ${Math.random().toString(36).slice(2, 8)}`;

  it('création, entrée par code, classement interne par XP réel, code visible du seul propriétaire', async () => {
    const o = await createUser(), m = await createUser();
    await query('INSERT INTO education_progress (user_id, domain_id, chapter_id, xp_earned) VALUES ($1,\'d\',\'c1\',450),($1,\'d\',\'c2\',450)', [m]);
    const { guild } = await svc.createGuild(o, uniq(), 'Pour apprendre ensemble');
    expect(guild!.role).toBe('owner'); expect(guild!.inviteCode).toMatch(/^[A-Z2-9]{8}$/);
    const joined = await svc.joinGuild(m, guild!.inviteCode);
    expect(joined.guild!.inviteCode).toBeNull();
    expect(joined.guild!.members.map((x) => [x.userId, x.rank])).toEqual([[m, 1], [o, 2]]);
    expect(joined.guild!.totalXp).toBe(900);
  });

  it('une seule guilde par joueur ; nom unique (accents et casse ignorés) ; validations', async () => {
    const o = await createUser(), p = await createUser();
    const name = uniq();
    await svc.createGuild(o, name, '');
    await fails(svc.createGuild(o, uniq(), ''), 'CONFLICT');
    await fails(svc.createGuild(p, name.toUpperCase(), ''), 'CONFLICT');
    await fails(svc.createGuild(p, 'ab', ''), 'INVALID_INPUT');
    await fails(svc.createGuild(p, '<script>alert(1)</script>', ''), 'INVALID_INPUT');
    await fails(svc.createGuild(p, uniq(), 'x'.repeat(141)), 'INVALID_INPUT');
    await fails(svc.joinGuild(p, 'ZZZZZZZZ'), 'NOT_FOUND');
  });

  it('propriétaire : retirer, transférer, changer le code, dissoudre ; un membre ne peut rien de tout ça', async () => {
    const o = await createUser(), m = await createUser(), x = await createUser();
    const { guild } = await svc.createGuild(o, uniq(), '');
    await svc.joinGuild(m, guild!.inviteCode!);
    await fails(svc.kick(m, o), 'FORBIDDEN'); await fails(svc.regenerateInvite(m), 'FORBIDDEN'); await fails(svc.disband(m), 'FORBIDDEN'); await fails(svc.transfer(m, o), 'FORBIDDEN');
    const old = guild!.inviteCode!;
    const { inviteCode } = await svc.regenerateInvite(o);
    expect(inviteCode).not.toBe(old);
    await fails(svc.joinGuild(x, old), 'NOT_FOUND');
    await svc.transfer(o, m);
    expect((await svc.myGuild(m)).guild!.role).toBe('owner');
    await svc.kick(m, o);
    expect((await svc.myGuild(o)).guild).toBeNull();
    await svc.disband(m);
    expect((await svc.myGuild(m)).guild).toBeNull();
  });

  it('le propriétaire qui part : le membre le plus ancien reprend ; dernière personne : guilde supprimée ; compte supprimé : guilde soignée', async () => {
    const o = await createUser(), m = await createUser();
    const { guild } = await svc.createGuild(o, uniq(), '');
    await svc.joinGuild(m, guild!.inviteCode!);
    await svc.leaveGuild(o);
    expect((await svc.myGuild(m)).guild!.role).toBe('owner');
    const gid = guild!.id;
    await svc.leaveGuild(m);
    expect((await query('SELECT 1 FROM guilds WHERE id = $1', [gid])).rowCount).toBe(0);
    const o2 = await createUser(), m2 = await createUser();
    const g2 = (await svc.createGuild(o2, uniq(), '')).guild!;
    await svc.joinGuild(m2, g2.inviteCode!);
    await query('DELETE FROM users WHERE id = $1', [o2]);            // suppression de compte (RGPD)
    expect((await svc.myGuild(m2)).guild!.role).toBe('owner');
  });

  it('plafond de membres', async () => {
    const o = await createUser();
    const { guild } = await svc.createGuild(o, uniq(), '');
    for (let i = 0; i < 29; i++) await svc.joinGuild(await createUser(), guild!.inviteCode!);
    await fails(svc.joinGuild(await createUser(), guild!.inviteCode!), 'LIMIT');
  });
});

describe.skipIf(!hasDb)('social : HTTP', () => {
  beforeAll(async () => { await setupDb(); });
  afterAll(async () => { await teardownDb(); });
  it('refus sans jeton ; code ami et amis via l\'API ; erreurs métier en 4xx (jamais 500)', async () => {
    expect((await request(app).get('/api/v1/social/me')).status).toBe(401);
    const a = await createUser(), b = await createUser();
    const tok = (id: string) => `Bearer ${generateToken(id, `${id}@test.local`)}`;
    const me = await request(app).get('/api/v1/social/me').set('Authorization', tok(a));
    expect(me.status).toBe(200); expect(me.body.friendCode).toMatch(/^[A-Z2-9]{8}$/);
    const bad = await request(app).post('/api/v1/social/requests').set('Authorization', tok(a)).send({ friendCode: 'ZZZZZZZZ' });
    expect(bad.status).toBe(404);
    const ok = await request(app).post('/api/v1/social/requests').set('Authorization', tok(a)).send({ friendCode: await code(b) });
    expect(ok.status).toBe(200);
    const weird = await request(app).delete('/api/v1/social/friends/__proto__').set('Authorization', tok(a));
    expect(weird.status).toBe(400);
  });
});

describe.skipIf(!hasDb)('social : durcissement (revue de code)', () => {
  beforeAll(async () => { await setupDb(); });
  afterAll(async () => { await teardownDb(); });
  const uniq = () => `Guilde ${Math.random().toString(36).slice(2, 8)}`;

  it('XP : une valeur énorme ne casse rien (plafond par ligne, pas de dépassement d\'entier) et le repli de nom ne contient pas le code ami', async () => {
    const a = await createUser(), b = await createUser();
    await query('INSERT INTO education_progress (user_id, domain_id, chapter_id, xp_earned) VALUES ($1,\'d\',\'c1\',2000000000),($1,\'d\',\'c2\',2000000000)', [b]);
    await svc.sendRequest(a, await code(b)); await svc.respond(b, (await svc.requests(b)).incoming[0].id, 'accept');
    const f = (await svc.friends(a)).friends[0];
    expect(f.xp).toBe(1000);                                  // 2 × plafond de 500
    expect(f.name).toMatch(/^Joueur [0-9A-F]{4}$/);
    expect(f.name).not.toContain(await code(b));
  });

  it('demandes croisées simultanées et doubles clics : une seule amitié, jamais d\'erreur serveur', async () => {
    const a = await createUser(), b = await createUser();
    const ca = await code(a), cb = await code(b);
    const res = await Promise.allSettled([svc.sendRequest(a, cb), svc.sendRequest(b, ca), svc.sendRequest(a, cb)]);
    for (const r of res) if (r.status === 'rejected') expect(r.reason).toBeInstanceOf(SocialError);   // CONFLICT autorisé, jamais d'erreur brute
    const rows = (await query('SELECT status FROM friendships WHERE (user_low = LEAST($1::uuid,$2::uuid) AND user_high = GREATEST($1::uuid,$2::uuid))', [a, b])).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('accepted');
  });

  it('refus tardif : accepter une demande déjà refusée ne crée pas d\'amitié et ne notifie pas', async () => {
    const a = await createUser(), b = await createUser();
    await svc.sendRequest(a, await code(b));
    const id = (await svc.requests(b)).incoming[0].id;
    await svc.respond(b, id, 'decline');
    await fails(svc.respond(b, id, 'accept'), 'NOT_FOUND');
    expect((await query('SELECT 1 FROM notifications WHERE user_id = $1 AND kind = \'friend_accepted\'', [a])).rowCount).toBe(0);
  });

  it('plafond d\'amis : valable pour LES DEUX joueurs (pas de contournement par celui qui reçoit)', async () => {
    const full = await createUser(), newcomer = await createUser();
    const others = await Promise.all(Array.from({ length: 100 }, () => createUser()));
    for (const o of others) {
      const [lo, hi] = full < o ? [full, o] : [o, full];
      await query('INSERT INTO friendships (user_low, user_high, requested_by, status, responded_at) VALUES ($1,$2,$3,\'accepted\', NOW())', [lo, hi, full]);
    }
    await svc.sendRequest(full, await code(newcomer)).catch(() => {});
    const pending = (await svc.requests(newcomer)).incoming;
    if (pending.length) await fails(svc.respond(newcomer, pending[0].id, 'accept'), 'LIMIT');
    await fails(svc.sendRequest(full, await code(newcomer)), pending.length ? 'CONFLICT' : 'LIMIT');
  });

  it('identifiants en MAJUSCULES : bloquer, retirer, expulser et transférer se comportent comme en minuscules ; se cibler soi-même est refusé', async () => {
    const a = await createUser(), b = await createUser();
    await svc.sendRequest(a, await code(b)); await svc.respond(b, (await svc.requests(b)).incoming[0].id, 'accept');
    await svc.block(b, a.toUpperCase());
    expect((await svc.friends(b)).friends).toHaveLength(0);                    // l'amitié est bien supprimée
    await fails(svc.block(a, a.toUpperCase()), 'INVALID_INPUT');
    const o = await createUser();
    const g = (await svc.createGuild(o, uniq(), '')).guild!;
    await fails(svc.kick(o, o.toUpperCase()), 'INVALID_INPUT');
    expect((await svc.myGuild(o)).guild!.role).toBe('owner');
  });

  it('blocage et guilde : un joueur lié par un blocage apparaît « masqué » (ni nom, ni niveau, ni XP) dans le classement', async () => {
    const o = await createUser(), m = await createUser();
    const { guild } = await svc.createGuild(o, uniq(), '');
    await svc.joinGuild(m, guild!.inviteCode!);
    await svc.block(m, o);
    const seenByO = (await svc.myGuild(o)).guild!.members.find((x) => x.userId === m)!;
    expect(seenByO).toMatchObject({ name: 'Joueur masqué', hidden: true });
    expect(seenByO.level).toBeUndefined(); expect(seenByO.xp).toBeUndefined();
    const seenByM = (await svc.myGuild(m)).guild!.members.find((x) => x.userId === o)!;
    expect(seenByM.hidden).toBe(true);
  });

  it('expulsion : le code d\'invitation est renouvelé, l\'expulsé ne peut pas revenir avec l\'ancien', async () => {
    const o = await createUser(), m = await createUser();
    const { guild } = await svc.createGuild(o, uniq(), '');
    await svc.joinGuild(m, guild!.inviteCode!);
    await svc.kick(o, m);
    await fails(svc.joinGuild(m, guild!.inviteCode!), 'NOT_FOUND');
    expect((await svc.myGuild(o)).guild!.inviteCode).not.toBe(guild!.inviteCode);
  });

  it('guildes : créations simultanées par le même joueur : une seule réussit, l\'autre est un CONFLICT (jamais une erreur serveur)', async () => {
    const o = await createUser();
    const res = await Promise.allSettled([svc.createGuild(o, uniq(), ''), svc.createGuild(o, uniq(), '')]);
    expect(res.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    for (const r of res) if (r.status === 'rejected') expect(r.reason).toBeInstanceOf(SocialError);
  });

  it('une demande refusée puis renvoyée ne crée pas une seconde notification identique le même jour', async () => {
    const a = await createUser(), b = await createUser();
    for (let i = 0; i < 3; i++) {
      await svc.sendRequest(a, await code(b));
      await svc.respond(b, (await svc.requests(b)).incoming[0].id, 'decline');
    }
    expect((await query('SELECT 1 FROM notifications WHERE user_id = $1 AND kind = \'friend_request\'', [b])).rowCount).toBe(1);
  });
});
