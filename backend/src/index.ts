import express, { Request, Response } from 'express';
import cors from 'cors';
import { env } from './config/env';
import { authRoutes } from './routes/auth';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: env.corsOrigin }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Error handler
app.use((err: any, req: Request, res: Response) => {
  console.error('Erreur:', err);
  res.status(500).json({
    error: env.isDev ? err.message : 'Erreur serveur interne',
  });
});

// Start server
const PORT = env.port;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║  🚀 InvestKit Backend                      ║
║  http://localhost:${PORT}
║  Environment: ${env.nodeEnv}
║  CORS Origin: ${env.corsOrigin}
╚════════════════════════════════════════════╝
  `);
});

export default app;
