-- Phase 2B (roadmap v6) - suivi du streak pour la récompense quotidienne
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_streak INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_daily_claim_at TIMESTAMP;
