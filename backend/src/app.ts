import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { authRoutes } from './routes/auth';
import { billingRoutes } from './routes/billing';
import { economyRoutes } from './routes/economy';
import { educationRoutes } from './routes/education';
import { tradingRoutes } from './routes/trading';
import { realEstateRoutes } from './routes/realEstate';
import { bankRoutes } from './routes/bank';
import { adminRoutes } from './routes/admin';
import { flagsRoutes } from './routes/flags';
import { contentRoutes } from './routes/content';
import { toolsRoutes, riskRoutes } from './routes/risk';
import { buildOpenApiSpec } from './openapi';
import { apiLimiter } from './middleware/rateLimiter';

const app = express();
app.set('trust proxy', env.trustProxy);

// Middleware
app.use(helmet());

// Le webhook Stripe a besoin du corps brut (Buffer) pour vérifier la
// signature - il doit donc être monté AVANT express.json(), qui sinon
// parserait/consommerait le corps en JSON avant que Stripe puisse le
// re-vérifier en bytes.
app.use(['/api/v1/billing/webhook', '/api/billing/webhook'], express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || env.corsOrigins.includes('*') || env.corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(Object.assign(new Error('Origine non autorisée par CORS'), { status: 403 }));
    }
  },
  credentials: true,
}));
app.use('/api', apiLimiter);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Documentation de l'API : JSON toujours disponible, page Swagger UI hors production
// (ou si DOCS_ENABLED=true). La page charge Swagger UI depuis un CDN : on assouplit
// la CSP uniquement pour cette route.
app.get('/api/v1/openapi.json', (_req: Request, res: Response) => {
  res.json(buildOpenApiSpec());
});
if (!env.isProd || process.env.DOCS_ENABLED === 'true') {
  app.get('/api/v1/docs', (_req: Request, res: Response) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https:; connect-src 'self'"
    );
    res.type('html').send(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>InvestKit API</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css"></head>
<body><div id="ui"></div><script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({ url: '/api/v1/openapi.json', dom_id: '#ui' });</script></body></html>`);
  });
}

// API routes (versionnées dès le départ - /api/v1/...)
// /api/auth reste disponible en alias pour ne pas casser un frontend
// déjà déployé pointant vers l'ancienne URL le temps de la transition.
app.use('/api/v1/auth', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/v1/billing', billingRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/v1/economy', economyRoutes);
app.use('/api/economy', economyRoutes);
app.use('/api/v1/education', educationRoutes);
app.use('/api/education', educationRoutes);
app.use('/api/v1/trading', tradingRoutes);
app.use('/api/trading', tradingRoutes);
app.use('/api/v1/realestate', realEstateRoutes);
app.use('/api/realestate', realEstateRoutes);
app.use('/api/v1/bank', bankRoutes);
app.use('/api/bank', bankRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/flags', flagsRoutes);
app.use('/api/v1', contentRoutes);
app.use('/api/v1/tools', toolsRoutes);
app.use('/api/v1/risk', riskRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Error handler (4 paramètres obligatoires pour qu'Express le reconnaisse comme tel)
app.use((err: Error & { status?: number; statusCode?: number; type?: string }, _req: Request, res: Response, _next: NextFunction) => {
  // Erreurs du client (JSON invalide, corps trop gros, type non géré, origine CORS refusée) : un refus propre 4xx, jamais une « erreur serveur ».
  const status = err.status ?? err.statusCode;
  if (status && status >= 400 && status < 500) {
    const messages: Record<string, string> = {
      'entity.parse.failed': 'Corps de requête invalide (JSON attendu)',
      'entity.too.large': 'Requête trop volumineuse',
      'encoding.unsupported': 'Encodage non pris en charge',
      'charset.unsupported': 'Jeu de caractères non pris en charge',
      'request.aborted': 'Requête interrompue',
      'request.size.invalid': 'Taille de requête invalide',
    };
    res.status(status).json({ error: (err.type && messages[err.type]) || (status === 403 ? err.message : 'Requête invalide'), code: err.type || undefined });
    return;
  }
  console.error('Erreur:', err);
  res.status(500).json({
    error: env.isDev ? err.message : 'Erreur serveur interne',
  });
});

export default app;
