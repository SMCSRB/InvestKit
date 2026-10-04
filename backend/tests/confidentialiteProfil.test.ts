// 6a, PR 5 : confidentialité du profil (public / amis / privé) : « Joueur anonyme » dans les classements publics, introuvable par pseudo si privé.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { readFileSync } from 'fs';
import { join } from 'path';
import app from '../src/app';
import { hasDb, setupDb, teardownDb, createUser } from './helpers';
import { query } from '../src/utils/db';
import { generateToken } from '../src/utils/jwt';
import { leaderboardRepository, ANONYMOUS_NAME } from '../src/repositories/leaderboardRepository';
import { socialService as svc } from '../src/services/socialService';
import { playerTagService } from '../src/services/playerTagService';
import { RANKING_MIN_INVESTED, RANKING_MIN_ACTIVE_DAYS } from '../src/config/economy';

const root = join(__dirname, '../..');
const tok = (id: string) => `Bearer ${generateToken(id, `${id}@test.local`)}`;

describe.skipIf(!hasDb)('confidentialité du profil (base réelle)', () => {
  const domain = `vie-privee-${Date.now()}`;
  beforeAll(setupDb);
  afterAll(async () => { await query('DELETE FROM leaderboard_rankings WHERE domain = $1', [domain]); await teardownDb(); });

  const player = async (name: string, perf: number, visibility?: string) => {
    const id = await createUser({ activeDays: RANKING_MIN_ACTIVE_DAYS });
    await query('UPDATE users SET username = $2, avatar_id = $3, show_pro_badge = TRUE WHERE id = $1', [id, name, `av-${name}`]);
    if (visibility) await playerTagService.setProfileVisibility(id, visibility);
    await leaderboardRepository.upsertSnapshot({ query } as any, { userId: id, mode: 'test', domain, year: 2020, performancePct: perf, capitalCommitted: RANKING_MIN_INVESTED });
    return id;
  };
  const board = (callerId: string) => leaderboardRepository.getBoard({ mode: 'test', domain, year: 2020, minCapital: RANKING_MIN_INVESTED, limit: 20, callerId });

  it('par défaut tout le monde est public : rien ne change pour les joueurs existants', async () => {
    const u = await createUser();
    expect((await query('SELECT profile_visibility FROM users WHERE id = $1', [u])).rows[0].profile_visibility).toBe('public');
  });

  it('classement public : un profil « amis » ou « privé » apparaît « Joueur anonyme » avec son rang, sans nom ni photo ; les publics restent visibles', async () => {
    const pub = await player('Pia', 30, 'public');
    const amis = await player('Ami', 20, 'amis');
    const prive = await player('Pri', 10, 'prive');
    const spectator = await createUser();
    const b = await board(spectator);
    const byRank = b.entries.map((e) => ({ name: e.username, rank: e.rank, avatar: e.avatarId, anonymous: e.anonymous }));
    expect(byRank).toEqual([
      { name: 'Pia', rank: 1, avatar: 'av-Pia', anonymous: false },
      { name: ANONYMOUS_NAME, rank: 2, avatar: null, anonymous: true },
      { name: ANONYMOUS_NAME, rank: 3, avatar: null, anonymous: true },
    ]);
    expect(b.totalRanked).toBe(3);
    // La réponse ne contient aucun trace du vrai nom d'un profil non public
    expect(JSON.stringify(b)).not.toMatch(/Ami|Pri\b|av-Ami|av-Pri/);
    expect([pub, amis, prive].length).toBe(3);
  });

  it('le joueur privé voit son propre rang avec son vrai nom ; les autres le voient anonyme', async () => {
    const domain2 = `${domain}-b`;
    const me = await createUser({ activeDays: RANKING_MIN_ACTIVE_DAYS });
    await query('UPDATE users SET username = $2 WHERE id = $1', [me, 'MoiMeme']);
    await playerTagService.setProfileVisibility(me, 'prive');
    await leaderboardRepository.upsertSnapshot({ query } as any, { userId: me, mode: 'test', domain: domain2, year: 2020, performancePct: 12, capitalCommitted: RANKING_MIN_INVESTED });
    const mine = await leaderboardRepository.getBoard({ mode: 'test', domain: domain2, year: 2020, minCapital: RANKING_MIN_INVESTED, limit: 10, callerId: me });
    expect(mine.me).toMatchObject({ username: 'MoiMeme', isMe: true, anonymous: false, rank: 1 });
    const other = await leaderboardRepository.getBoard({ mode: 'test', domain: domain2, year: 2020, minCapital: RANKING_MIN_INVESTED, limit: 10, callerId: await createUser() });
    expect(other.entries[0]).toMatchObject({ username: ANONYMOUS_NAME, anonymous: true, avatarId: null, pro: false });
    await query('DELETE FROM leaderboard_rankings WHERE domain = $1', [domain2]);
  });

  it('l\'indicateur Pro d\'un profil non public n\'est pas montré aux autres', async () => {
    const domain3 = `${domain}-c`;
    const p = await createUser({ activeDays: RANKING_MIN_ACTIVE_DAYS, tier: 'pro' });
    await query('UPDATE users SET username = $2, show_pro_badge = TRUE WHERE id = $1', [p, 'ProCache']);
    await leaderboardRepository.upsertSnapshot({ query } as any, { userId: p, mode: 'test', domain: domain3, year: 2020, performancePct: 5, capitalCommitted: RANKING_MIN_INVESTED });
    const vue = async () => (await leaderboardRepository.getBoard({ mode: 'test', domain: domain3, year: 2020, minCapital: RANKING_MIN_INVESTED, limit: 10, callerId: await createUser() })).entries[0];
    expect((await vue()).pro).toBe(true);
    await playerTagService.setProfileVisibility(p, 'amis');
    expect((await vue()).pro).toBe(false);
    await query('DELETE FROM leaderboard_rankings WHERE domain = $1', [domain3]);
  });

  it('recherche par pseudo : un profil privé est introuvable (même message qu\'un inconnu), mais joignable par son code ami', async () => {
    const searcher = await createUser();
    const target = await createUser();
    await query('UPDATE users SET username = $2 WHERE id = $1', [target, `Cible${Date.now() % 100000}`]);
    const identity = (await playerTagService.mine(target))!.identity!;
    const code = (await svc.me(target)).friendCode;
    await playerTagService.setProfileVisibility(target, 'prive');
    await expect(svc.sendRequest(searcher, identity)).rejects.toMatchObject({ message: 'Aucun joueur avec cet identifiant' });
    const viaCode = await svc.sendRequest(searcher, code);
    expect(viaCode).toBeTruthy();
    // « amis » reste trouvable par pseudo
    const searcher2 = await createUser();
    await playerTagService.setProfileVisibility(target, 'amis');
    expect(await svc.sendRequest(searcher2, identity)).toBeTruthy();
  });

  it('réglage : valeurs d\'une liste fermée, authentification obligatoire, effet visible dans /social/me', async () => {
    const u = await createUser();
    expect((await request(app).post('/api/v1/social/visibility').send({ visibility: 'amis' })).status).toBe(401);
    for (const bad of ['', 'PUBLIC', 'ami', null, 1, {}, undefined, 'prive; DROP TABLE users']) {
      const res = await request(app).post('/api/v1/social/visibility').set('Authorization', tok(u)).send({ visibility: bad });
      expect(res.status, JSON.stringify(bad)).toBe(400);
    }
    expect((await query('SELECT profile_visibility FROM users WHERE id = $1', [u])).rows[0].profile_visibility).toBe('public');
    const ok = await request(app).post('/api/v1/social/visibility').set('Authorization', tok(u)).send({ visibility: 'prive' });
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual({ profileVisibility: 'prive' });
    const me = await request(app).get('/api/v1/social/me').set('Authorization', tok(u));
    expect(me.body.profileVisibility).toBe('prive');
    // On ne peut pas changer le réglage d'un autre joueur : la route n'accepte aucun identifiant
    const v = await createUser();
    await request(app).post('/api/v1/social/visibility').set('Authorization', tok(u)).send({ visibility: 'amis', userId: v });
    expect((await query('SELECT profile_visibility FROM users WHERE id = $1', [v])).rows[0].profile_visibility).toBe('public');
  });

  it('le classement de trading renvoie « Joueur anonyme » par la vraie route publique', async () => {
    const id = await createUser({ activeDays: RANKING_MIN_ACTIVE_DAYS });
    await query('UPDATE users SET username = $2 WHERE id = $1', [id, 'Discret']);
    await playerTagService.setProfileVisibility(id, 'amis');
    await leaderboardRepository.upsertSnapshot({ query } as any, { userId: id, mode: 'accelerated', domain: 'stocks', year: 2010, performancePct: 9999, capitalCommitted: RANKING_MIN_INVESTED });
    const res = await request(app).get('/api/v1/trading/leaderboard?domain=stocks&year=2010').set('Authorization', tok(await createUser()));
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain('Discret');
    expect(res.body.entries[0]).toMatchObject({ username: ANONYMOUS_NAME, anonymous: true });
    await query(`DELETE FROM leaderboard_rankings WHERE user_id = $1`, [id]);
  });

  it('export de compte : contient le réglage', async () => {
    const u = await createUser();
    await playerTagService.setProfileVisibility(u, 'amis');
    const { exportUserData } = await import('../src/services/accountService');
    expect(((await exportUserData(u)) as any).profile.profile_visibility).toBe('amis');
  });
});

describe('interface : réglage de confidentialité sur la page Profil', () => {
  it('trois choix, texte simple, effet enregistré par le serveur', () => {
    const c = readFileSync(join(root, 'app/components/profile/ProfileVisibility.jsx'), 'utf8');
    for (const id of ['public', 'amis', 'prive']) expect(c).toContain(`id: '${id}'`);
    expect(c).toContain('Joueur anonyme');
    expect(c).toContain('data-testid="profile-visibility"');
    expect(readFileSync(join(root, 'app/profile/page.jsx'), 'utf8')).toContain('<ProfileVisibility />');
    expect(readFileSync(join(root, 'app/lib/social.js'), 'utf8')).toContain("'/visibility'");
  });
});
