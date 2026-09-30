import { Pool, PoolClient, QueryResult } from 'pg';
import { env } from '../config/env';
import fs from 'fs';
import path from 'path';

let pool: Pool | null = null;

// Chemins relatifs à ce fichier (et non au dossier de lancement) : le serveur
// démarre correctement quel que soit l'endroit d'où il est lancé, en ts-node
// (src/utils) comme compilé (dist/utils).
const BACKEND_ROOT = path.resolve(__dirname, '..', '..');
const REPO_ROOT = path.resolve(BACKEND_ROOT, '..');

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

    const schemaPath = path.join(REPO_ROOT, 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    const pool = getPool();
    try {
      await pool.query(schema);
    } catch (firstError: any) {
      // Base existante plus ancienne que schema.sql (ex. un index sur une colonne que seule une migration
      // ajoute encore) : le schéma est annulé en bloc (une seule transaction), on applique alors les
      // migrations (idempotentes) pour mettre les tables existantes à niveau, puis on rejoue le schéma.
      console.warn('⚠️  Schéma non applicable tel quel sur cette base (' + firstError.message + ') : mise à niveau par les migrations puis nouvel essai');
      await executeMigrations();
      await pool.query(schema);
    }

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

    const migrationsDir = path.join(BACKEND_ROOT, 'migrations');

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
        // Ignore "column already exists" (42701) and "relation already exists" (42P07) errors
        if (migrationError.code === '42701' || migrationError.code === '42P07') {
          console.log(`  ⚠️  ${file} - Already exists (skipped)`);
        } else if (migrationError.code === '42P01') {
          // Table doesn't exist - this is okay, schema.sql will create it
          console.log(`  ⚠️  ${file} - Table doesn't exist yet (will be created by schema)`);
        } else {
          console.error(`  ❌ Error in ${file}:`, migrationError.message);
          // Continue with other migrations instead of throwing
        }
      }
    }

    console.log('✅ All migrations completed');
  } catch (error) {
    console.error('❌ Error running migrations:', error);
    // Don't throw - allow server to start even if migrations fail
  }
};

export const closePool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};
