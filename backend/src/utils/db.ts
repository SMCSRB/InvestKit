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
  } catch (error) {
    console.error('❌ Error initializing schema:', error);
    throw error;
  }
};

export const closePool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};
