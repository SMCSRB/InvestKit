-- Ensure all required columns exist in users table
-- This migration is idempotent and won't fail if columns already exist

DO $$
BEGIN
  -- Add verification_code_expires_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'verification_code_expires_at'
  ) THEN
    ALTER TABLE users ADD COLUMN verification_code_expires_at TIMESTAMP;
  END IF;

  -- Add account_type if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'account_type'
  ) THEN
    ALTER TABLE users ADD COLUMN account_type VARCHAR(50);
  END IF;

  -- Add interests if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'interests'
  ) THEN
    ALTER TABLE users ADD COLUMN interests VARCHAR(500);
  END IF;

  -- Add language if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'language'
  ) THEN
    ALTER TABLE users ADD COLUMN language VARCHAR(10) DEFAULT 'fr';
  END IF;

  -- Add enable_2fa if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'enable_2fa'
  ) THEN
    ALTER TABLE users ADD COLUMN enable_2fa BOOLEAN DEFAULT FALSE;
  END IF;

  RAISE NOTICE 'All user columns are now present';
END $$;
