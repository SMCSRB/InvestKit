import { env, databaseNameFromUrl } from './config/env';
import { initDatabase, executeSchema, closePool } from './utils/db';
import app from './app';
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
║  Database: ${databaseNameFromUrl(env.database.url, env.database.name)}
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
