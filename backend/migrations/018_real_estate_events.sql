-- Étape 5 : événements aléatoires (locataire, impayés, dépôt de garantie, congé, travaux imprévus).

ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS tenant_type VARCHAR(10) CHECK (tenant_type IN ('student', 'worker', 'family'));
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS deposit_held_eur NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (deposit_held_eur >= 0);
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS notice_end_total INT;          -- dernier mois payé par le locataire (année × 12 + mois)
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS notice_months INT;
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS notice_reason VARCHAR(20);
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS default_months INT NOT NULL DEFAULT 0 CHECK (default_months >= 0);
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS default_months_in_lease INT NOT NULL DEFAULT 0 CHECK (default_months_in_lease >= 0);
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS arrears_rent_eur NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (arrears_rent_eur >= 0);
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS arrears_charges_eur NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (arrears_charges_eur >= 0);
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS late_carry_rent NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (late_carry_rent >= 0);
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS late_carry_charges NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (late_carry_charges >= 0);
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS catch_up_pending BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS landlord_notice_reason VARCHAR(20);
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS landlord_notice_effective_total INT;  -- dernier mois du bail
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS sale_planned BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS last_asking_ratio NUMERIC(5,3) NOT NULL DEFAULT 1;

-- Journal des événements d'une partie (expliqués après coup).
CREATE TABLE IF NOT EXISTS re_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES re_games(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES re_properties(id) ON DELETE CASCADE,
  year INT NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  kind VARCHAR(30) NOT NULL,
  message TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_re_events_game ON re_events(game_id, year DESC, month DESC);
