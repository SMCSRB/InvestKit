import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { listRoutes } from '../src/utils/listRoutes';
import { buildOpenApiSpec } from '../src/openapi';

const toKey = (method: string, path: string) => `${method.toUpperCase()} ${path.replace(/\{(\w+)\}/g, ':$1')}`;

describe('OpenAPI', () => {
  const spec = buildOpenApiSpec();
  const documented = new Set<string>();
  for (const [path, ops] of Object.entries<any>(spec.paths)) {
    for (const method of Object.keys(ops)) documented.add(toKey(method, path));
  }
  const mounted = listRoutes(app).filter((r) => r.includes('/api/v1/') && !/\/api\/v1\/(openapi\.json|docs)$/.test(r));

  it('décrit toutes les routes /api/v1 réellement montées', () => {
    const missing = mounted.filter((r) => !documented.has(r));
    expect(missing).toEqual([]);
  });

  it('ne décrit aucune route qui n\'existe pas', () => {
    const extra = [...documented].filter((r) => !mounted.includes(r));
    expect(extra).toEqual([]);
  });

  it('le JSON est servi et le paramètre de chemin est déclaré', async () => {
    const r = await request(app).get('/api/v1/openapi.json');
    expect(r.status).toBe(200);
    expect(r.body.openapi).toMatch(/^3\./);
    const op = r.body.paths['/api/v1/bank/loans/{id}/repay'].post;
    expect(op.parameters[0].name).toBe('id');
  });

  it('la page Swagger UI est servie hors production', async () => {
    const r = await request(app).get('/api/v1/docs');
    expect(r.status).toBe(200);
    expect(r.text).toContain('swagger-ui');
  });
});
