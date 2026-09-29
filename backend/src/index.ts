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
import { apiLimiter } from './middleware/rateLimiter';
import { initDatabase, executeSchema, closePool } from './utils/db';

const app = express();

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
      callback(new Error('Origine non autorisée par CORS'));
    }
  },
  credentials: true,
}));
app.use('/api', apiLimiter);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Error handler (4 paramètres obligatoires pour qu'Express le reconnaisse comme tel)
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Erreur:', err);
  res.status(500).json({
    error: env.isDev ? err.message : 'Erreur serveur interne',
  });
});

// Start server
const PORT = env.port;

const startServer = async () => {
  try {
    // Initialize database connection
    console.log('🔗 Connecting to PostgreSQL...');
    initDatabase();
    console.log('✅ Database connection established');

    // Initialize schema (create tables if not exist)
    console.log('🗄️ Initializing database schema...');
    await executeSchema();
    console.log('✅ Schema initialized');

    // Start listening
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`
╔════════════════════════════════════════════╗
║  🚀 InvestKit Backend                      ║
║  http://0.0.0.0:${PORT}
║  Local: http://127.0.0.1:${PORT}
║  Environment: ${env.nodeEnv}
║  Database: ${env.database.name}
║  CORS Origins: ${env.corsOrigins.join(', ')}
╚════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down gracefully...');
  await closePool();
  process.exit(0);
});

startServer();

export default app;
