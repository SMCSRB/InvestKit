import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import sharp from 'sharp';
import { authenticator } from 'otplib';

const codes: { to: string; code: string }[] = [];
const notices: { to: string; stage: string }[] = [];
vi.mock('../src/utils/email', async (orig) => {
  const real = await orig<typeof import('../src/utils/email')>();
  return {
    ...real,
    sendEmailChangeCode: async (to: string, _n: unknown, code: string) => { codes.push({ to, code }); return { ok: true }; },
    sendEmailChangeNotice: async (to: string, _n: unknown, stage: string) => { notices.push({ to, stage }); return { ok: true }; },
  };
});

import app from '../src/app';
import { generateToken } from '../src/utils/jwt';
import { csrfTokenFor } from '../src/utils/session';
import { query } from '../src/utils/db';
import { resetMailThrottle } from '../src/utils/mailThrottle';
import { encryptField } from '../src/utils/fieldCrypto';
import { hasDb, setupDb, teardownDb, createUser } from './helpers';

const PASSWORD = 'MotDePasse-Test-123';
let ipCounter = 10;
const ip = () => `10.${Math.floor(ipCounter / 250)}.${ipCounter++ % 250}.1`;   // chaque requête a « sa » adresse : les limiteurs de débit ne se gênent pas entre tests
const asBrowser = (id: string) => {
  const jwt = generateToken(id, `${id}@test.local`); const csrf = csrfTokenFor(jwt);
  return { Cookie: `ik_session=${jwt}; ik_csrf=${csrf}`, 'X-CSRF-Token': csrf };
};
const as = (id: string) => ({ ...asBrowser(id), 'X-Forwarded-For': ip() });
const settle = () => new Promise((r) => setTimeout(r, 120));

// Vraies images de test : une photo avec métadonnées (EXIF : copyright, GPS) et une orientation, pour vérifier le nettoyage.
const photo = (w = 600, h = 400) => sharp({ create: { width: w, height: h, channels: 3, background: { r: 200, g: 80, b: 40 } } })
  .withExif({ IFD0: { Copyright: 'SECRET-COPYRIGHT', Artist: 'Quelqu\'un' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '48/1 51/1 24/1', GPSLongitudeRef: 'E', GPSLongitude: '2/1 21/1 8/1' } })
  .jpeg().toBuffer();
const upload = (id: string, body: Buffer | string, type = 'image/jpeg') =>
  request(app).post('/api/v1/profile/avatar').set(as(id)).set('Content-Type', type).send(body as any);

describe.skipIf(!hasDb)('profil : photo, nom, bio, changement d\'e-mail (base réelle)', () => {
  beforeAll(async () => { await setupDb(); app.set('trust proxy', true); });
  afterAll(async () => { app.set('trust proxy', false); await teardownDb(); });
  beforeEach(() => { codes.length = 0; notices.length = 0; resetMailThrottle(); });

  const player = async (opts: { username?: string } = {}) => {
    const id = await createUser({ verified: true });
    await query('UPDATE users SET username = $2, password_hash = $3, first_name = $4, last_name = $4 WHERE id = $1', [id, opts.username ?? `pl${id.slice(0, 6)}`, await bcrypt.hash(PASSWORD, 4), 'Unknown']);
    return id;
  };

  // ───────── Photo ─────────
  it('PHOTO : envoyée, ré-encodée en WebP 256 x 256, SANS métadonnées (EXIF, GPS), nom généré, visible partout tout de suite', async () => {
    const me = await player(); const friend = await player();
    const original = await photo();
    expect((await sharp(original).metadata()).exif).toBeTruthy();               // la photo de départ contient bien un EXIF
    const r = await upload(me, original);
    expect(r.status).toBe(200);
    expect(r.body.avatarId).toMatch(/^[0-9a-f]{36}$/);
    const img = await request(app).get(`/api/v1/profile/avatar/${r.body.avatarId}`).set('X-Forwarded-For', ip()).buffer(true).parse((res, cb) => { const c: Buffer[] = []; res.on('data', (d: Buffer) => c.push(d)); res.on('end', () => cb(null, Buffer.concat(c))); });
    expect(img.status).toBe(200);
    expect(img.headers['content-type']).toBe('image/webp');
    expect(img.headers['x-content-type-options']).toBe('nosniff');
    expect(img.headers['cross-origin-resource-policy']).toBe('cross-origin');
    const meta = await sharp(img.body as Buffer).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(['webp', 256, 256]);
    expect(meta.exif).toBeUndefined();
    expect((img.body as Buffer).includes(Buffer.from('SECRET-COPYRIGHT'))).toBe(false);
    expect((img.body as Buffer).length).toBeLessThan(original.length);
    // « partout » : /auth/me (en-tête, menu), liste d'amis du voisin, classement des amis
    expect((await request(app).get('/api/v1/auth/me').set(as(me))).body.user.avatarId).toBe(r.body.avatarId);
    expect((await request(app).get('/api/v1/profile').set(as(me))).body.avatarId).toBe(r.body.avatarId);
    await query(`INSERT INTO friendships (user_low, user_high, requested_by, status, responded_at) VALUES (LEAST($1::uuid,$2::uuid), GREATEST($1::uuid,$2::uuid), $1, 'accepted', NOW())`, [me, friend]);
    const fl = (await request(app).get('/api/v1/social/friends').set(as(friend))).body.friends.find((f: any) => f.userId === me);
    expect(fl.avatarId).toBe(r.body.avatarId);
    const rk = (await request(app).get('/api/v1/social/friends/ranking').set(as(friend))).body.entries.find((e: any) => e.userId === me);
    expect(rk.avatarId).toBe(r.body.avatarId);
  });

  it('PHOTO : le vrai format est lu dans le fichier, pas dans l\'extension ni dans le type annoncé', async () => {
    const id = await player();
    const fakes: [string, Buffer | string, string][] = [
      ['texte déguisé en png', 'ceci n\'est pas une image', 'image/png'],
      ['script déguisé en jpeg', '<script>alert(1)</script>', 'image/jpeg'],
      ['svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', 'image/svg+xml'],
      ['gif', Buffer.from('474946383961010001000000002c00000000010001000002024401003b', 'hex'), 'image/jpeg'],
      ['exécutable', Buffer.from('4d5a90000300000004000000ffff0000', 'hex'), 'image/png'],
    ];
    for (const [label, body, type] of fakes) {
      const r = await upload(id, body, type);
      expect(r.status, label).toBe(415);
      expect(r.body.error).toMatch(/JPG, PNG ou WebP/);
    }
    expect((await query('SELECT avatar_id FROM users WHERE id = $1', [id])).rows[0].avatar_id).toBeNull();
    // un vrai JPEG tronqué (début valide, reste absent) est refusé proprement, pas une erreur serveur
    const cut = (await photo()).subarray(0, 40);
    expect((await upload(id, cut)).status).toBe(422);
    expect((await upload(id, Buffer.alloc(0))).status).toBe(400);
    // le type annoncé n'a aucune importance : un vrai PNG envoyé en « text/plain » est accepté
    const png = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#123456' } }).png().toBuffer();
    expect((await upload(id, png, 'text/plain')).status).toBe(200);
  });

  it('PHOTO : un corps JSON (tableau, texte, objet) à la place des octets est refusé proprement, rien n\'est enregistré', async () => {
    const id = await player();
    for (const body of [['a', 'b'], 'texte', { avatar: 'x' }, [1, 2, 3], 42]) {
      const r = await request(app).post('/api/v1/profile/avatar').set(as(id)).set('Content-Type', 'application/json').send(JSON.stringify(body));
      expect(r.status, JSON.stringify(body)).toBe(400);
      expect(['EMPTY', 'entity.parse.failed']).toContain(r.body.code);   // tableau/objet : notre contrôle ; texte ou nombre nu : refusé plus tôt par l'analyseur JSON
    }
    expect((await query('SELECT avatar_id FROM users WHERE id = $1', [id])).rows[0].avatar_id).toBeNull();
  });

  it('PHOTO : fichier trop lourd refusé (413) ; image « bombe » (trop de pixels) refusée (422)', async () => {
    const id = await player();
    const big = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(3 * 1024 * 1024 + 10, 1)]);
    const r = await upload(id, big);
    expect(r.status).toBe(413);
    const bomb = await sharp({ create: { width: 7000, height: 7000, channels: 3, background: { r: 128, g: 128, b: 128 } } }).png({ compressionLevel: 9 }).toBuffer();
    expect(bomb.length).toBeLessThan(3 * 1024 * 1024);
    const b = await upload(id, bomb);
    expect(b.status).toBe(422);
  });

  it('PHOTO : suppression, identifiant renouvelé à chaque envoi (l\'ancienne adresse meurt), jamais de photo d\'un autre', async () => {
    const a = await player(); const b = await player();
    const a1 = (await upload(a, await photo())).body.avatarId;
    const b1 = (await upload(b, await photo(300, 300))).body.avatarId;
    const a2 = (await upload(a, await photo(500, 500))).body.avatarId;
    expect(a2).not.toBe(a1);
    expect((await request(app).get(`/api/v1/profile/avatar/${a1}`)).status).toBe(404);
    expect((await request(app).get(`/api/v1/profile/avatar/${a2}`)).status).toBe(200);
    // anti-IDOR : agir comme A ne touche jamais B
    await request(app).delete('/api/v1/profile/avatar').set(as(a));
    expect((await request(app).get(`/api/v1/profile/avatar/${b1}`)).status).toBe(200);
    expect((await request(app).get(`/api/v1/profile/avatar/${a2}`)).status).toBe(404);
    expect((await request(app).get('/api/v1/auth/me').set(as(a))).body.user.avatarId).toBeNull();
    expect((await query('SELECT COUNT(*)::int AS n FROM user_avatars WHERE user_id = $1', [a])).rows[0].n).toBe(0);
    // identifiants impossibles à deviner ou à utiliser pour autre chose : 404 net
    for (const bad of ['1', 'x'.repeat(36), a, '../../etc/passwd', '0'.repeat(36), b1.toUpperCase()]) {
      expect((await request(app).get(`/api/v1/profile/avatar/${encodeURIComponent(bad)}`)).status, bad).toBe(404);
    }
    expect((await request(app).post('/api/v1/profile/avatar').set('Content-Type', 'image/jpeg').send(await photo())).status).toBe(401);
    expect((await request(app).delete('/api/v1/profile/avatar')).status).toBe(401);
  });

  it('PHOTO : joueur masqué (bloqué) dans une guilde = pas de photo exposée ; classement mondial expose la photo des joueurs classés', async () => {
    const me = await player(); const other = await player();
    const oid = (await upload(other, await photo())).body.avatarId;
    const g = await request(app).post('/api/v1/social/guilds').set(as(me)).send({ name: `Guilde ${me.slice(0, 5)}`, description: 'Test' });
    expect(g.status).toBeLessThan(300);
    const code = (await request(app).get('/api/v1/social/guild').set(as(me))).body.guild?.inviteCode;
    if (code) await request(app).post('/api/v1/social/guilds/join').set(as(other)).send({ code });
    await request(app).post('/api/v1/social/blocks').set(as(me)).send({ userId: other });
    const guild = (await request(app).get('/api/v1/social/guild').set(as(me))).body.guild;
    const m = guild?.members?.find((x: any) => x.userId === other);
    if (m) { expect(m.hidden).toBe(true); expect(m.avatarId).toBeNull(); }
    expect(JSON.stringify((await request(app).get('/api/v1/social/guild').set(as(me))).body)).not.toContain(oid);
  });

  it('PHOTO : limitation de débit (10 envois par heure)', async () => {
    const id = await player();
    const fixedIp = '203.0.113.77';
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) statuses.push((await request(app).post('/api/v1/profile/avatar').set(asBrowser(id)).set('X-Forwarded-For', fixedIp).set('Content-Type', 'image/jpeg').send('x')).status);
    expect(statuses.slice(0, 10).every((s) => s === 415)).toBe(true);
    expect(statuses[10]).toBe(429);
  });

  // ───────── Nom et bio ─────────
  it('PROFIL : lit les vraies données (jamais d\'exemple), « Unknown » n\'est pas un nom, le pseudo n\'est pas le nom', async () => {
    const id = await player({ username: 'MonPseudo' });
    const p = (await request(app).get('/api/v1/profile').set(as(id))).body;
    expect(p.email).toBe(`${id}@test.local`);
    expect(p.fullName).toBe('');                       // « Unknown » enregistré à l'inscription n'est pas affiché
    expect(p.bio).toBe('');
    expect(p.username).toBe('MonPseudo');
    expect(JSON.stringify(p)).not.toMatch(/jean\.dupont|Passionné par/i);
  });

  it('PROFIL : enregistrer sans rien changer ne change rien ; un champ vide reste vide ; un champ absent n\'est pas touché', async () => {
    const id = await player();
    await request(app).patch('/api/v1/profile').set(as(id)).send({ fullName: 'Léa Martin', bio: 'J\'apprends.' });
    const before = (await query('SELECT email, first_name, last_name, bio, username, avatar_id FROM users WHERE id = $1', [id])).rows[0];
    expect(before).toMatchObject({ first_name: 'Léa', last_name: 'Martin', bio: 'J\'apprends.' });
    for (const body of [{}, null, [], 'texte']) {
      expect((await request(app).patch('/api/v1/profile').set(as(id)).send(body as any)).status).toBe(200);
    }
    expect((await query('SELECT email, first_name, last_name, bio, username, avatar_id FROM users WHERE id = $1', [id])).rows[0]).toEqual(before);
    await request(app).patch('/api/v1/profile').set(as(id)).send({ bio: 'Nouvelle bio' });          // le nom, absent, n'est pas touché
    expect((await query('SELECT first_name, last_name, bio FROM users WHERE id = $1', [id])).rows[0]).toEqual({ first_name: 'Léa', last_name: 'Martin', bio: 'Nouvelle bio' });
    const empty = await request(app).patch('/api/v1/profile').set(as(id)).send({ bio: '', fullName: '   ' });
    expect(empty.body).toMatchObject({ bio: '', fullName: '' });                                      // vide reste vide
    expect((await query('SELECT first_name, last_name, bio FROM users WHERE id = $1', [id])).rows[0]).toEqual({ first_name: '', last_name: '', bio: null });
  });

  it('PROFIL : l\'e-mail ne se modifie JAMAIS par une sauvegarde de profil (même si on l\'envoie)', async () => {
    const id = await player();
    const r = await request(app).patch('/api/v1/profile').set(as(id)).send({ email: 'pirate@example.com', fullName: 'Nom Valide', username: 'volé', avatarId: 'abc', role: 'admin', subscription_tier: 'pro' });
    expect(r.status).toBe(200);
    const u = (await query('SELECT email, username, role, subscription_tier, avatar_id FROM users WHERE id = $1', [id])).rows[0];
    expect(u.email).toBe(`${id}@test.local`);
    expect(u.username).not.toBe('volé');
    expect(u).toMatchObject({ role: 'user', subscription_tier: 'free', avatar_id: null });
  });

  it('PROFIL : validation et nettoyage côté serveur (longueur, caractères, balises, contrôle)', async () => {
    const id = await player();
    const bad = async (body: object) => (await request(app).patch('/api/v1/profile').set(as(id)).send(body)).status;
    expect(await bad({ fullName: 'x'.repeat(81) })).toBe(400);
    expect(await bad({ fullName: 'Jean123' })).toBe(400);
    expect(await bad({ fullName: 'Robert\'); DROP TABLE users;--' })).toBe(400);
    expect(await bad({ fullName: 42 })).toBe(400);
    expect(await bad({ fullName: { a: 1 } })).toBe(400);
    expect(await bad({ bio: 'x'.repeat(281) })).toBe(400);
    expect(await bad({ bio: ['a'] })).toBe(400);
    const r = await request(app).patch('/api/v1/profile').set(as(id)).send({ bio: '  Salut <script>alert(1)</script>\u0000 ‮ toi  \n  ok ', fullName: '  Anne-Marie   O\'Neil  ' });
    expect(r.status).toBe(200);
    expect(r.body.bio).toBe('Salut scriptalert(1)/script toi ok');
    expect(r.body.bio).not.toMatch(/[<>\u0000‮]/);
    expect(r.body.fullName).toBe('Anne-Marie O\'Neil');
    expect((await request(app).patch('/api/v1/profile').set({ 'X-Forwarded-For': ip() }).send({ bio: 'a' })).status).toBe(401);
  });

  it('PROFIL : anti-IDOR, un joueur ne modifie que son propre profil (aucun identifiant accepté dans la requête)', async () => {
    const a = await player(); const b = await player();
    await request(app).patch('/api/v1/profile').set(as(b)).send({ bio: 'bio de B' });
    await request(app).patch('/api/v1/profile').set(as(a)).send({ bio: 'bio de A', userId: b, id: b });
    expect((await query('SELECT bio FROM users WHERE id = $1', [b])).rows[0].bio).toBe('bio de B');
    expect((await query('SELECT bio FROM users WHERE id = $1', [a])).rows[0].bio).toBe('bio de A');
  });

  // ───────── Changement d'e-mail ─────────
  it('E-MAIL : mot de passe obligatoire ; réponse neutre (adresse prise ou libre) ; e-mail inchangé tant que le code n\'est pas saisi', async () => {
    const me = await player(); const other = await player();
    const post = (body: object) => request(app).post('/api/v1/profile/email/request').set(as(me)).send(body);
    expect((await post({ newEmail: 'nouveau@example.org' })).status).toBe(400);
    expect((await post({ newEmail: 'nouveau@example.org', password: 'faux' })).status).toBe(401);
    expect((await post({ newEmail: 'pas-une-adresse', password: PASSWORD })).status).toBe(400);
    expect(codes).toHaveLength(0);
    const taken = await post({ newEmail: `${other}@test.local`.toUpperCase(), password: PASSWORD });
    const free = await post({ newEmail: 'Nouveau@Example.org', password: PASSWORD });
    expect(taken.status).toBe(200); expect(free.status).toBe(200);
    expect(taken.body).toEqual(free.body);                                   // aucune fuite : même réponse
    await settle();
    expect(codes).toHaveLength(1);                                           // pas de code vers l'adresse déjà prise
    expect(codes[0].to).toBe('nouveau@example.org');
    expect(notices.filter((n) => n.stage === 'requested').map((n) => n.to)).toEqual([`${me}@test.local`]);   // l'ancienne adresse est prévenue
    expect((await query('SELECT email FROM users WHERE id = $1', [me])).rows[0].email).toBe(`${me}@test.local`);
    const stored = (await query('SELECT code_hash FROM email_change_requests WHERE user_id = $1', [me])).rows[0].code_hash;
    expect(stored).not.toContain(codes[0].code);                             // code stocké haché
  });

  it('E-MAIL : code envoyé à la nouvelle adresse → adresse changée, ancienne adresse prévenue, code à usage unique', async () => {
    const me = await player();
    await request(app).post('/api/v1/profile/email/request').set(as(me)).send({ newEmail: 'bravo@example.org', password: PASSWORD });
    await settle();
    const code = codes[0].code;
    const wrong = code === '123456' ? '654321' : '123456';
    expect((await request(app).post('/api/v1/profile/email/confirm').set(as(me)).send({ code: wrong })).status).toBe(401);
    expect((await request(app).post('/api/v1/profile/email/confirm').set(as(me)).send({ code: 'abc' })).status).toBe(400);
    const ok = await request(app).post('/api/v1/profile/email/confirm').set(as(me)).send({ code });
    expect(ok.status).toBe(200);
    expect((await query('SELECT email, verified FROM users WHERE id = $1', [me])).rows[0]).toEqual({ email: 'bravo@example.org', verified: true });
    await settle();
    expect(notices.some((n) => n.stage === 'done' && n.to === `${me}@test.local`)).toBe(true);
    expect((await request(app).post('/api/v1/profile/email/confirm').set(as(me)).send({ code })).status).toBe(400);   // usage unique
  });

  it('E-MAIL : 5 mauvais essais bloquent la demande ; un code expiré est refusé ; un autre compte ne peut pas confirmer', async () => {
    const me = await player(); const intruder = await player();
    await request(app).post('/api/v1/profile/email/request').set(as(me)).send({ newEmail: 'verrou@example.org', password: PASSWORD });
    await settle();
    const code = codes[0].code; const wrong = code === '111111' ? '222222' : '111111';
    expect((await request(app).post('/api/v1/profile/email/confirm').set(as(intruder)).send({ code })).status).toBe(400);   // pas de demande pour lui
    expect((await query('SELECT email FROM users WHERE id = $1', [intruder])).rows[0].email).toBe(`${intruder}@test.local`);
    for (let i = 0; i < 5; i++) await request(app).post('/api/v1/profile/email/confirm').set(as(me)).send({ code: wrong });
    const locked = await request(app).post('/api/v1/profile/email/confirm').set(as(me)).send({ code });
    expect(locked.status).toBe(429);                                         // même le bon code ne marche plus
    expect((await query('SELECT email FROM users WHERE id = $1', [me])).rows[0].email).toBe(`${me}@test.local`);
    await request(app).post('/api/v1/profile/email/request').set(as(me)).send({ newEmail: 'expire@example.org', password: PASSWORD });
    await settle();
    await query(`UPDATE email_change_requests SET expires_at = NOW() - INTERVAL '1 minute' WHERE user_id = $1`, [me]);
    expect((await request(app).post('/api/v1/profile/email/confirm').set(as(me)).send({ code: codes[codes.length - 1].code })).status).toBe(400);
  });

  it('E-MAIL : double authentification exigée si activée ; demandes limitées par adresse', async () => {
    const me = await player();
    const secret = authenticator.generateSecret();
    await query('UPDATE users SET enable_2fa = TRUE, totp_secret = $2 WHERE id = $1', [me, encryptField(secret)]);
    const req = (body: object) => request(app).post('/api/v1/profile/email/request').set(as(me)).send(body);
    const base = { newEmail: 'deux@example.org', password: PASSWORD };
    expect((await req(base)).status).toBe(401);
    expect((await req({ ...base, code: '000000' })).status).toBe(401);
    expect((await req({ ...base, code: authenticator.generate(secret) })).status).toBe(200);
    // plafond d'envois : 3 demandes par heure vers la même adresse
    const other = await player();
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) statuses.push((await request(app).post('/api/v1/profile/email/request').set(as(other)).send({ newEmail: 'cible@example.org', password: PASSWORD })).status);
    expect(statuses).toEqual([200, 200, 200, 429]);
  });

  it('RGPD : l\'export contient la bio mais ni la photo binaire ni les codes', async () => {
    const me = await player();
    await request(app).patch('/api/v1/profile').set(as(me)).send({ bio: 'ma bio exportée' });
    const exp = (await request(app).get('/api/v1/auth/me/export').set(as(me))).body;
    expect(exp.profile.bio).toBe('ma bio exportée');
    expect(JSON.stringify(exp)).not.toMatch(/code_hash|email_change/);
  });
});

// ───────── Interface (analyse des fichiers, sans base) ─────────
import fs from 'fs';
import path from 'path';
const root = path.join(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('profil : interface sans valeur d\'exemple, photo partout, e-mail non modifiable en direct', () => {
  it('plus aucune valeur factice (e-mail, bio, pseudo) dans les écrans de profil', () => {
    for (const f of ['app/dashboard/page.jsx', 'app/profile/page.jsx', 'app/context/UserContext.jsx', 'app/components/profile/ProfileForm.jsx']) {
      const t = read(f);
      expect(t, f).not.toMatch(/jean\.dupont|Passionné par l.investissement|Investisseur Premium|InvestKitUser/);
    }
  });
  it('le formulaire n\'envoie que les champs modifiés, jamais l\'e-mail ; l\'e-mail passe par la procédure sécurisée', () => {
    const f = read('app/components/profile/ProfileForm.jsx');
    expect(f).toContain('if (dirtyName) body.fullName');
    expect(f).toContain('if (dirtyBio) body.bio');
    expect(f).toMatch(/id="pf-email"[^>]*readOnly/);
    expect(f).toContain('requestEmailChange');
    expect(f).toContain('confirmEmailChange');
    expect(f).not.toMatch(/saveProfile\(\{[^}]*email/);
    expect(read('app/dashboard/page.jsx')).toContain('<ProfileForm />');
    expect(read('app/dashboard/page.jsx')).not.toMatch(/localStorage\.(set|get)Item\('(userEmail|userFullName|profilePhoto)'/);
  });
  it('la photo apparaît partout tout de suite : évènement après envoi, en-tête et listes la lisent du serveur', () => {
    const api = read('app/lib/profileApi.js');
    expect(api).toMatch(/uploadAvatar[\s\S]*announceUserChanged/);
    expect(api).toMatch(/removeAvatar[\s\S]*announceUserChanged/);
    expect(read('app/components/shell/useShellData.js')).toMatch(/onUserChanged\(refreshUser\)/);
    expect(read('app/components/shell/Topbar.jsx')).toContain('<Avatar avatarId={user?.avatarId}');
    expect(read('app/components/social/PlayerName.jsx')).toContain('avatarId');
    for (const f of ['app/classements/page.jsx', 'app/components/social/SocialHub.jsx']) expect(read(f), f).toContain('avatarId={');
    expect(read('app/components/social/Avatar.jsx')).toContain('onError');   // la lettre initiale reste le secours
    expect(read('next.config.js')).toMatch(/img-src[^\n]*apiOrigin/);
  });
});
