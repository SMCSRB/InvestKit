import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { spawnSync } from 'child_process';
import { join } from 'path';
import app from '../src/app';
import { hasDb, setupDb, teardownDb, createUser, balanceOf } from './helpers';
import { query } from '../src/utils/db';
import { generateToken } from '../src/utils/jwt';
import { EDUCATION_CATALOG } from '../src/data/educationCatalog';

describe('éducation : le serveur décide (catalogue)', () => {
  it('le catalogue généré est à jour avec le contenu pédagogique (node scripts/gen-education-catalog.mjs)', () => {
    const r = spawnSync('node', ['scripts/gen-education-catalog.mjs', '--check'], { cwd: join(__dirname, '..') });
    expect(r.status, 'relancer : node scripts/gen-education-catalog.mjs').toBe(0);
    expect(Object.keys(EDUCATION_CATALOG).length).toBeGreaterThan(0);
  });
});

describe.skipIf(!hasDb)('éducation : récompenses', () => {
  beforeAll(async () => { await setupDb(); });
  afterAll(async () => { await teardownDb(); });
  const auth = (id: string) => `Bearer ${generateToken(id, `${id}@test.local`)}`;

  it('les anciennes routes « j\'ai fini » ne récompensent plus rien (410) : plus de pièces sans preuve', async () => {
    const u = await createUser({ balance: 0 });
    for (const path of ['complete-chapter', 'complete-domain']) {
      const r = await request(app).post(`/api/v1/education/${path}`).set('Authorization', auth(u)).send({ domainId: 'crypto', chapterId: 1, score: 100, xpEarned: 2000000000 });
      expect(r.status).toBe(410);
    }
    expect(await balanceOf(u)).toBe(0);
    expect((await query('SELECT COUNT(*)::int AS n FROM education_progress WHERE user_id = $1', [u])).rows[0].n).toBe(0);
  });
});
