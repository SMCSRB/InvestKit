import { Pool, PoolClient, QueryResult } from 'pg';
import { env } from '../config/env';
import fs from 'fs';
import path from 'path';

let pool: Pool | null = null;

export const initDatabase = (): Pool => {
  if (pool) return pool;

  pool = new Pool({
    connectionString: env.database.url || `postgresql://${env.database.user}:${env.database.password}@${env.database.host}:${env.database.port}/${env.database.name}`,
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  return pool;
};

export const getPool = (): Pool => {
  if (!pool) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return pool;
};

export const query = async (text: string, params?: any[]): Promise<QueryResult> => {
  const pool = getPool();
  return pool.query(text, params);
};

export const getClient = async (): Promise<PoolClient> => {
  const pool = getPool();
  return pool.connect();
};

export const executeSchema = async (): Promise<void> => {
  try {
    console.log('📊 Initializing database schema...');

    const schemaPath = path.join(process.cwd(), '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    const pool = getPool();
    await pool.query(schema);

    console.log('✅ Database schema initialized successfully');

    // Execute migrations
    await executeMigrations();
  } catch (error) {
    console.error('❌ Error initializing schema:', error);
    throw error;
  }
};

export const executeMigrations = async (): Promise<void> => {
  try {
    console.log('📝 Running migrations...');

    const migrationsDir = path.join(process.cwd(), 'migrations');

    // Check if migrations directory exists
    if (!fs.existsSync(migrationsDir)) {
      console.log('⚠️  No migrations directory found');
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    const pool = getPool();

    for (const file of files) {
      try {
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf-8');

        // Skip empty files
        if (!sql.trim()) {
          continue;
        }

        console.log(`  Running migration: ${file}`);
        await pool.query(sql);
        console.log(`  ✅ ${file} completed`);
      } catch (migrationError: any) {
        // Ignore "column already exists" errors
        if (migrationError.code === '42701') {
          console.log(`  ⚠️  ${file} - Column already exists (skipped)`);
        } else {
          console.error(`  ❌ Error in ${file}:`, migrationError.message);
          throw migrationError;
        }
      }
    }

    console.log('✅ All migrations completed');
  } catch (error) {
    console.error('❌ Error running migrations:', error);
    throw error;
  }
};

export const closePool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};
