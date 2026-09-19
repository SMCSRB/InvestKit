-- InvestKit Database Initialization Script
-- Run this with: psql -U postgres -f database/init.sql

-- Create investkit user if not exists
DO
$do$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'investkit') THEN
      CREATE ROLE investkit WITH LOGIN PASSWORD 'password';
   END IF;
END
$do$;

-- Create investkit database
CREATE DATABASE IF NOT EXISTS investkit OWNER investkit;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE investkit TO investkit;

-- Message
\echo '✅ Database setup complete!'
\echo '📝 User: investkit'
\echo '🔐 Password: password'
\echo '🗄️  Database: investkit'
