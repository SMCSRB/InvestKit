-- Add preferences columns to users table if they don't exist
-- These columns are defined in the main schema.sql but this file ensures 
-- they exist for existing databases that were created before the new columns were added

ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS interests VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'fr';
ALTER TABLE users ADD COLUMN IF NOT EXISTS enable_2fa BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code_expires_at TIMESTAMP;
