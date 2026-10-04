// Disposition du tableau de bord (6g, G4) : le serveur valide, le droit Pro est lu en base, chaque joueur ne touche que la sienne.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { hasDb, setupDb, teardownDb, createUser } from './helpers';
import { generateToken } from '../src/utils/jwt';
import { query } from '../src/utils/db';
import { validateWidgets, DASHBOARD_TEMPLATES, DASHBOARD_WIDGETS } from '../src/config/dashboardLayout';

const tok = (id: string) => `Bearer ${generateToken(id, `${id}@test.local`)}`;
const put = (u: string, body: any) => request(app).put('/api/v1/dashboard-layout').set('Authorization', tok(u)).send(body);
const get = (u: string) => request(app).get('/api/v1/dashboard-layout').set('Authorization', tok(u));

describe('validation des blocs (règle pure)', () => {
  it('accepte une liste blanche sans doublon, refuse le reste', () => {
    expect(validateWidgets(['wealth', 'wallet']).ok).toBe(true);
    for (const bad of [[], 'wealth', null, {}, ['wealth', 'wealth'], ['<script>'], [1], ['inconnu'], [...DASHBOARD_WIDGETS, 'wealth']]) expect(validateWidgets(bad).ok).toBe(false);
  });
  it('les modèles de départ ne contiennent que des blocs valides', () => {
    for (const w of Object.values(DASHBOARD_TEMPLATES)) expect(validateWidgets(w).ok).toBe(true);
  });
});

describe.skipIf(!hasDb)('API disposition', () => {
  beforeAll(setupDb);
  afterAll(teardownDb);

  it('authentification obligatoire', async () => {
    expect((await request(app).get('/api/v1/dashboard-layout')).status).toBe(401);
    expect((await request(app).put('/api/v1/dashboard-layout').send({ template: 'complet' })).status).toBe(401);
  });

  it('par défaut : modèle débutant ; un compte gratuit choisit un modèle', async () => {
    const u = await createUser();
    const d = (await get(u)).body;
    expect(d.template).toBe('debutant'); expect(d.canCustomize).toBe(false);
    const r = await put(u, { template: 'complet' });
    expect(r.status).toBe(200); expect(r.body.widgets).toEqual(DASHBOARD_TEMPLATES.complet); expect(r.body.version).toBe(1);
    expect((await put(u, { template: 'investisseur' })).body.version).toBe(2);
  });

  it('un compte gratuit ne peut pas envoyer sa propre liste ; modèle inconnu refusé', async () => {
    const u = await createUser();
    const r = await put(u, { widgets: ['wealth'] });
    expect(r.status).toBe(403); expect(r.body.code).toBe('PRO_REQUIRED');
    expect((await put(u, { template: 'nimporte' })).status).toBe(400);
    expect((await put(u, { template: '__proto__' })).status).toBe(400);
    expect((await put(u, {})).status).toBe(400);
    expect((await get(u)).body.template).toBe('debutant');
  });

  it('un compte Pro réorganise librement, avec validation', async () => {
    const u = await createUser({ tier: 'pro' });
    const ok = await put(u, { widgets: ['crypto', 'wealth'] });
    expect(ok.status).toBe(200); expect(ok.body.widgets).toEqual(['crypto', 'wealth']); expect(ok.body.template).toBe('personnalise'); expect(ok.body.canCustomize).toBe(true);
    for (const bad of [[], ['wealth', 'wealth'], ['<img src=x>'], 'wealth']) expect((await put(u, { widgets: bad })).status).toBe(400);
    expect((await get(u)).body.widgets).toEqual(['crypto', 'wealth']);
  });

  it('le droit Pro vient de la base, pas de la requête', async () => {
    const u = await createUser();
    expect((await put(u, { widgets: ['wealth'], tier: 'pro', isPro: true })).status).toBe(403);
  });

  it('un joueur ne modifie que sa disposition ; un bloc retiré du catalogue est ignoré', async () => {
    const a = await createUser(); const b = await createUser();
    await put(a, { template: 'complet' });
    await put(b, { template: 'investisseur', userId: a });
    expect((await get(a)).body.template).toBe('complet');
    await query(`UPDATE dashboard_layouts SET layout = '["wealth","ancien_bloc"]'::jsonb WHERE user_id = $1`, [a]);
    expect((await get(a)).body.widgets).toEqual(['wealth']);
  });

  it('suppression du compte : disposition effacée', async () => {
    const u = await createUser();
    await put(u, { template: 'complet' });
    await query('DELETE FROM users WHERE id = $1', [u]);
    expect(Number((await query('SELECT COUNT(*)::int AS n FROM dashboard_layouts WHERE user_id = $1', [u])).rows[0].n)).toBe(0);
  });
});
