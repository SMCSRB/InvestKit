-- Add preferences columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type VARCHAR(50); -- beginner, intermediate, pro
ALTER TABLE users ADD COLUMN IF NOT EXISTS interests VARCHAR(255); -- JSON array of interests
ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'fr'; -- Language preference
ALTER TABLE users ADD COLUMN IF NOT EXISTS enable_2fa BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMP;
ALTER TABLE users RENAME COLUMN is_verified TO verified;

-- Add column to store verification code expiration
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code_expires_at TIMESTAMP;
