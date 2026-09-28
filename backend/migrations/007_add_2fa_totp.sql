-- Phase 1 (roadmap v6) - authentification à deux facteurs (TOTP)
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_backup_codes JSONB; -- codes de secours hashés (bcrypt)
