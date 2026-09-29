import type { Express } from 'express';

// Liste les routes réellement montées ("GET /api/v1/auth/me"). Sert au test
// qui vérifie que la spécification OpenAPI décrit toutes les routes.
export const listRoutes = (app: Express): string[] => {
  const out: string[] = [];
  const walk = (stack: any[], prefix: string) => {
    for (const layer of stack) {
      if (layer.route) {
        for (const m of Object.keys(layer.route.methods)) out.push(`${m.toUpperCase()} ${prefix}${layer.route.path}`);
      } else if (layer.name === 'router' && layer.handle?.stack) {
        const src = String(layer.regexp.source)
          .replace('^\\/', '/')
          .replace('\\/?(?=\\/|$)', '')
          .replace(/\\\//g, '/')
          .replace(/\$$/, '');
        walk(layer.handle.stack, prefix + src);
      }
    }
  };
  walk((app as any)._router.stack, '');
  return out;
};
