-- Assurance loyers impayés (GLI) : contrat par bien. Ajouts uniquement, aucune donnée existante n'est modifiée.
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS gli_active BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS gli_since_total INT;
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS gli_episode_covered BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS gli_reimbursed_eur NUMERIC(14,2) NOT NULL DEFAULT 0;
