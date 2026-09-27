-- Phase 1 (roadmap v6) - fondations : rôle admin, tier d'abonnement,
-- domaine gratuit débloqué, et versioning/tags sur les projets.
-- Les nouvelles tables (subscriptions, api_quota, investcoins...) sont
-- créées directement dans database/schema.sql (CREATE TABLE IF NOT EXISTS,
-- suffisant aussi bien pour une base neuve qu'existante). Cette migration
-- ne gère que l'ajout de colonnes sur des tables déjà en place.

ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS free_domain VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

ALTER TABLE investment_projects ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE investment_projects ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE investment_projects ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
ALTER TABLE investment_projects ADD COLUMN IF NOT EXISTS parent_project_id UUID REFERENCES investment_projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_investment_projects_parent ON investment_projects(parent_project_id);
