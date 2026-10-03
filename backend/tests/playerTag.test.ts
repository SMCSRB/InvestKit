import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import app from '../src/app';
import { generateToken } from '../src/utils/jwt';
import { query } from '../src/utils/db';
import { fold, checkTagFormat, autoTagFor, parseIdentity, customTagVisible, identityOf } from '../src/engine/playerTag';
import { playerTagService } from '../src/services/playerTagService';
import { socialService } from '../src/services/socialService';
import { hasDb, setupDb, teardownDb, createUser } from './helpers';

describe('# du joueur : règles pures', () => {
  it('pliage des ressemblances : 0/o, 1/i/l, 5/s, accents et casse', () => {
    expect(fold('Adm1n')).toBe(fold('admin'));
    expect(fold('SUPP0RT')).toBe(fold('support'));
    expect(fold('Élodie')).toBe(fold('elodie'));
    expect(fold('b0b')).toBe(fold('Bob'));
  });
  it('format : 3 à 12 caractères, lettres sans accent et chiffres', () => {
    for (const bad of ['ab', 'a'.repeat(13), 'é12345', 'ab cd', 'ab-cd', '', null, 42 as unknown]) expect(checkTagFormat(bad).ok).toBe(false);
    for (const good of ['abc', 'Alpha2026', 'A'.repeat(12), '#Zeta99']) expect(checkTagFormat(good).ok).toBe(true);
    expect((checkTagFormat('#Zeta99') as any).tag).toBe('Zeta99');
  });
  it('mots réservés et insultes refusés, même déguisés', () => {
    for (const w of ['admin', 'Adm1n', 'support', 'SUPP0RT', 'investkit', '1nvestkit', 'xxadminxx', 'moderateur', 'staff', 'connard', 'C0nnard']) {
      const r = checkTagFormat(w);
      expect(r.ok, w).toBe(false);
    }
  });
  it('# automatique : 4 chiffres, stable pour un même joueur', () => {
    const id = '3f2b8c1e-aaaa-bbbb-cccc-1234567890ab';
    expect(autoTagFor(id)).toMatch(/^\d{4}$/);
    expect(autoTagFor(id)).toBe(autoTagFor(id));
    expect(autoTagFor(id, 1)).not.toBe(autoTagFor(id, 0));
  });
  it('lecture d\'un « Pseudo#tag » saisi pour chercher un ami', () => {
    expect(parseIdentity('Camille#4821')).toEqual({ name: 'Camille', tag: '4821' });
    expect(parseIdentity(' Camille Dupont #Alpha ')).toEqual({ name: 'Camille Dupont', tag: 'Alpha' });
    for (const bad of ['Camille', '#4821', 'Camille#', 'Camille#a b', 'x'.repeat(31) + '#1234', 42]) expect(parseIdentity(bad)).toBeNull();
    expect(identityOf('Camille', '4821')).toBe('Camille#4821');
  });
  it('le # choisi reste visible pendant la grâce après la fin du Pro, puis non', () => {
    const now = new Date('2026-06-01T00:00:00Z');
    expect(customTagVisible({ isPro: true, graceUntil: null }, now)).toBe(true);
    expect(customTagVisible({ isPro: false, graceUntil: new Date('2026-06-10T00:00:00Z') }, now)).toBe(true);
    expect(customTagVisible({ isPro: false, graceUntil: new Date('2026-05-30T00:00:00Z') }, now)).toBe(false);
  });
  it('les règles sont isolées dans config/tagRules.ts et marquées non sourcées', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'config', 'tagRules.ts'), 'utf8');
    expect(src).toMatch(/VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER/);
  });
});

const bearer = (id: string) => ({ Authorization: `Bearer ${generateToken(id, `${id}@test.local`)}` });
const named = async (username: string, opts: Parameters<typeof createUser>[0] = {}) => {
  const id = await createUser(opts);
  await query('UPDATE users SET username = $2 WHERE id = $1', [id, username]);
  await playerTagService.ensureTag(id);
  return id;
};
const agoDays = (col: string, id: string, days: number) => query(`UPDATE users SET ${col} = NOW() - make_interval(days => $2::int) WHERE id = $1`, [id, days]);
const rejects = async (p: Promise<unknown>) => { try { await p; return null; } catch (e: any) { return e; } };

describe.skipIf(!hasDb)('# personnalisé et badge Pro (base réelle)', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);

  it('tout joueur a un # automatique à 4 chiffres : Pseudo#1234', async () => {
    const id = await named('Camille');
    const t = await playerTagService.mine(id);
    expect(t.tag).toMatch(/^\d{4}$/);
    expect(t.identity).toBe(`Camille#${t.tag}`);
    expect(t.isCustom).toBe(false);
    expect(t.canCustomize).toBe(false);
  });

  it('un joueur gratuit ne peut pas choisir son # (403 côté serveur)', async () => {
    const id = await named('Gratuit1');
    const r = await request(app).post('/api/v1/social/tag').set(bearer(id)).send({ tag: 'MonTag' });
    expect(r.status).toBe(403);
    expect(r.body.reason).toBe('PRO_REQUIRED');
  });

  it('un Pro choisit son #, l\'historique est conservé, une seule fois par mois', async () => {
    const id = await named('Proche', { tier: 'pro' });
    const before = (await playerTagService.mine(id)).tag;
    const r = await request(app).post('/api/v1/social/tag').set(bearer(id)).send({ tag: 'Alpha26' });
    expect(r.status).toBe(200);
    expect(r.body.identity).toBe('Proche#Alpha26');
    expect(r.body.isCustom).toBe(true);
    const again = await request(app).post('/api/v1/social/tag').set(bearer(id)).send({ tag: 'Beta26' });
    expect(again.status).toBe(429);
    expect(again.body.reason).toBe('RATE');
    expect(again.body.nextChangeAt).toBeTruthy();
    await agoDays('tag_changed_at', id, 31);
    const third = await request(app).post('/api/v1/social/tag').set(bearer(id)).send({ tag: 'Beta26' });
    expect(third.status).toBe(200);
    const h = await request(app).get('/api/v1/social/tag/history').set(bearer(id));
    expect(h.body.history.map((x: any) => x.newTag)).toEqual(['Beta26', 'Alpha26']);
    expect(h.body.history[1].oldTag).toBe(before);
  });

  it('refus : format, mots réservés, insultes, ressemblance avec un autre joueur ou un administrateur', async () => {
    const pro = await named('Alice', { tier: 'pro' });
    await named('Bob');
    const admin = await named('Cheffe', {});
    await query(`UPDATE users SET role = 'admin' WHERE id = $1`, [admin]);
    const cases: [string, string][] = [['ab', 'FORMAT'], ['Adm1n77', 'RESERVED'], ['investkit', 'RESERVED'], ['connard', 'INSULT'], ['b0b', 'LOOKALIKE'], ['Cheffe', 'LOOKALIKE'], ['xCh3ffex', 'LOOKALIKE']];
    for (const [tag, reason] of cases) {
      const r = await request(app).post('/api/v1/social/tag').set(bearer(pro)).send({ tag });
      expect(r.status, tag).toBe(400);
      expect(r.body.reason, tag).toBe(reason);
    }
  });

  it('doublon : l\'unicité est garantie par la base (pseudo + # sans tenir compte de la casse ni des ressemblances)', async () => {
    const a = await named('Dupont', { tier: 'pro' });
    const b = await named('dupont', { tier: 'pro' }); // autre joueur dont le pseudo se plie pareil
    expect((await request(app).post('/api/v1/social/tag').set(bearer(a)).send({ tag: 'Zeta1' })).status).toBe(200);
    const r = await request(app).post('/api/v1/social/tag').set(bearer(b)).send({ tag: 'ZETA1' });
    expect(r.status).toBe(409);
    expect(r.body.reason).toBe('TAKEN');
    // la contrainte joue même sans passer par l'application
    const direct = await rejects(query(`UPDATE users SET player_tag = 'zeta1' WHERE id = $1`, [b]));
    expect(direct?.code).toBe('23505');
    const fooled = await rejects(query(`UPDATE users SET player_tag = 'Z3ta1' WHERE id = $1`, [b])); // 3 → e : même clé que Zeta1
    expect(fooled?.code).toBe('23505');
  });

  it('deux demandes simultanées pour le même # : une seule gagne', async () => {
    const a = await named('Course', { tier: 'pro' });
    const b = await named('course', { tier: 'pro' });
    const [ra, rb] = await Promise.all([
      request(app).post('/api/v1/social/tag').set(bearer(a)).send({ tag: 'Rapide7' }),
      request(app).post('/api/v1/social/tag').set(bearer(b)).send({ tag: 'Rapide7' }),
    ]);
    expect([ra.status, rb.status].sort()).toEqual([200, 409]);
  });

  it('deux demandes simultanées du même joueur : un seul changement', async () => {
    const id = await named('Double', { tier: 'pro' });
    const rs = await Promise.all([1, 2, 3].map((i) => request(app).post('/api/v1/social/tag').set(bearer(id)).send({ tag: `Essai${i}` })));
    expect(rs.filter((r) => r.status === 200)).toHaveLength(1);
    expect(rs.filter((r) => r.status === 429)).toHaveLength(2);
    expect((await query('SELECT COUNT(*)::int AS n FROM player_tag_history WHERE user_id = $1 AND reason = \'custom\'', [id])).rows[0].n).toBe(1);
  });

  it('ancien # : réservé à son ancien propriétaire pendant le délai, puis libéré', async () => {
    const a = await named('Libere', { tier: 'pro' });
    const b = await named('libere', { tier: 'pro' });
    await request(app).post('/api/v1/social/tag').set(bearer(a)).send({ tag: 'Ancien1' });
    await agoDays('tag_changed_at', a, 31);
    await request(app).post('/api/v1/social/tag').set(bearer(a)).send({ tag: 'Nouveau1' });
    const held = await request(app).post('/api/v1/social/tag').set(bearer(b)).send({ tag: 'Ancien1' });
    expect(held.status).toBe(409);
    expect(held.body.reason).toBe('HELD');
    await query(`UPDATE player_tag_history SET held_until = NOW() - interval '1 day' WHERE user_id = $1`, [a]);
    const free = await request(app).post('/api/v1/social/tag').set(bearer(b)).send({ tag: 'Ancien1' });
    expect(free.status).toBe(200);
  });

  it('on trouve un ami par « Pseudo#tag » exact ; les amis ne cassent JAMAIS quand le # change', async () => {
    const pro = await named('Ami', { tier: 'pro' });
    const other = await named('Chercheur');
    const t0 = (await playerTagService.mine(pro)).tag!;
    const wrong = await request(app).post('/api/v1/social/requests').set(bearer(other)).send({ friendCode: `Ami#${t0 === '0000' ? '1111' : '0000'}` });
    const unknown = await request(app).post('/api/v1/social/requests').set(bearer(other)).send({ friendCode: 'Personne#1234' });
    expect(wrong.status).toBe(404);
    expect(unknown.status).toBe(404);
    expect(wrong.body.error).toBe(unknown.body.error); // même réponse : aucune fuite
    const ok = await request(app).post('/api/v1/social/requests').set(bearer(other)).send({ friendCode: `ami#${t0}` });
    expect(ok.status).toBe(200);
    expect(ok.body.status).toBe('pending');
    const reqs = await request(app).get('/api/v1/social/requests').set(bearer(pro));
    await request(app).post(`/api/v1/social/requests/${reqs.body.incoming[0].id}/accept`).set(bearer(pro));
    // le Pro change de # : l'amitié est intacte, et l'ancien # ne fait plus trouver personne
    await request(app).post('/api/v1/social/tag').set(bearer(pro)).send({ tag: 'Nouveau99' });
    const friends = await request(app).get('/api/v1/social/friends').set(bearer(other));
    expect(friends.body.friends).toHaveLength(1);
    expect(friends.body.friends[0].identity).toBe('Ami#Nouveau99');
    const old = await request(app).post('/api/v1/social/requests').set(bearer(await named('Autre')) ).send({ friendCode: `Ami#${t0}` });
    expect(old.status).toBe(404);
  });

  it('badge Pro : simple booléen visible par les autres, jamais de détail d\'abonnement ; disparaît à la fin de l\'abonnement', async () => {
    const pro = await named('Dore', { tier: 'pro' });
    const free = await named('Simple');
    const viewer = await named('Voyeur');
    for (const u of [pro, free]) {
      await query('INSERT INTO friendships (user_low, user_high, requested_by, status) VALUES (LEAST($1::uuid,$2::uuid), GREATEST($1::uuid,$2::uuid), $1, \'accepted\')', [u, viewer]);
    }
    const list = async () => (await request(app).get('/api/v1/social/friends').set(bearer(viewer))).body.friends as any[];
    let f = await list();
    expect(f.find((x) => x.name === 'Dore').pro).toBe(true);
    expect(f.find((x) => x.name === 'Simple').pro).toBe(false);
    expect(Object.keys(f.find((x) => x.name === 'Dore')).sort()).toEqual(['identity', 'level', 'name', 'pro', 'since', 'tag', 'userId', 'xp']);
    await query(`UPDATE users SET subscription_tier = 'free' WHERE id = $1`, [pro]); // fin de l'abonnement
    f = await list();
    expect(f.find((x) => x.name === 'Dore').pro).toBe(false);
  });

  it('confidentialité : le joueur peut masquer son badge aux autres (il le voit toujours chez lui)', async () => {
    const pro = await named('Discret', { proOverride: true });
    const viewer = await named('Curieux');
    await query('INSERT INTO friendships (user_low, user_high, requested_by, status) VALUES (LEAST($1::uuid,$2::uuid), GREATEST($1::uuid,$2::uuid), $1, \'accepted\')', [pro, viewer]);
    const seen = async () => (await request(app).get('/api/v1/social/friends').set(bearer(viewer))).body.friends[0].pro;
    expect(await seen()).toBe(true);
    expect((await request(app).post('/api/v1/social/privacy').set(bearer(pro)).send({ showProBadge: false })).body.showProBadge).toBe(false);
    expect(await seen()).toBe(false);
    const own = await request(app).get('/api/v1/social/friends/ranking').set(bearer(pro));
    expect(own.body.entries.find((e: any) => e.isMe).pro).toBe(true);
    expect((await request(app).post('/api/v1/social/privacy').set(bearer(pro)).send({ showProBadge: 'oui' })).status).toBe(400);
  });

  it('fin d\'abonnement : # choisi gardé pendant la grâce, puis retour automatique ; rendu si re-abonnement ; amitiés intactes', async () => {
    const id = await named('Fin', { tier: 'pro' });
    const friend = await named('Compagnon');
    await query('INSERT INTO friendships (user_low, user_high, requested_by, status) VALUES (LEAST($1::uuid,$2::uuid), GREATEST($1::uuid,$2::uuid), $1, \'accepted\')', [id, friend]);
    await request(app).post('/api/v1/social/tag').set(bearer(id)).send({ tag: 'Garde77' });
    await query(`UPDATE users SET subscription_tier = 'free' WHERE id = $1`, [id]);

    await playerTagService.sweep(true);                                        // fin constatée : début de la grâce
    let m = await playerTagService.mine(id);
    expect(m.identity).toBe('Fin#Garde77');
    expect(m.graceUntil).toBeTruthy();
    expect(m.canCustomize).toBe(false);

    await agoDays('tag_grace_until', id, 1);                                    // grâce terminée
    await playerTagService.sweep(true);
    m = await playerTagService.mine(id);
    expect(m.isCustom).toBe(false);
    expect(m.tag).toMatch(/^\d{4}$/);
    expect(m.restorable).toBe('Garde77');
    const h = await request(app).get('/api/v1/social/tag/history').set(bearer(id));
    expect(h.body.history[0].reason).toBe('expired');
    const friends = await request(app).get('/api/v1/social/friends').set(bearer(friend));
    expect(friends.body.friends.map((x: any) => x.name)).toEqual(['Fin']);       // l'amitié n'a pas bougé

    await query(`UPDATE users SET subscription_tier = 'pro' WHERE id = $1`, [id]); // re-abonnement
    m = await playerTagService.mine(id);
    expect(m.identity).toBe('Fin#Garde77');
    expect(m.isCustom).toBe(true);
    expect(m.restorable).toBeNull();
  });

  it('fin d\'abonnement : le # mis de côté n\'est pas rendu s\'il a été pris entre-temps', async () => {
    const a = await named('Perdu', { tier: 'pro' });
    const b = await named('perdu', { tier: 'pro' });
    await request(app).post('/api/v1/social/tag').set(bearer(a)).send({ tag: 'Convoite' });
    await query(`UPDATE users SET subscription_tier = 'free', tag_grace_until = NOW() - interval '1 day' WHERE id = $1`, [a]);
    await playerTagService.sweep(true);
    await query(`UPDATE player_tag_history SET held_until = NOW() - interval '1 day' WHERE user_id = $1`, [a]);
    expect((await request(app).post('/api/v1/social/tag').set(bearer(b)).send({ tag: 'Convoite' })).status).toBe(200);
    await query(`UPDATE users SET subscription_tier = 'pro' WHERE id = $1`, [a]);
    const m = await playerTagService.mine(a);
    expect(m.isCustom).toBe(false); // pris par un autre : on ne casse rien, on reste en automatique
  });

  it('classement mondial : l\'entrée porte seulement l\'indicateur Pro', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'repositories', 'leaderboardRepository.ts'), 'utf8');
    expect(src).toMatch(/show_pro_badge/);
    expect(src).not.toMatch(/stripe|current_period_end|renewsAt/i);
  });

  it('jamais d\'e-mail ni de détail d\'abonnement dans les réponses sociales', async () => {
    const id = await named('Propre', { tier: 'pro' });
    const r = await request(app).get('/api/v1/social/me').set(bearer(id));
    expect(JSON.stringify(r.body)).not.toMatch(/@test\.local|stripe|renewsAt|endsAt/i);
    expect(typeof socialService.me).toBe('function');
  });
});
