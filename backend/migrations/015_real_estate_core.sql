-- Domaine Immobilier (étape 3) : partie de jeu, expertises, prêts, biens possédés.
-- Idempotent (s'exécute à chaque démarrage).

CREATE TABLE IF NOT EXISTS re_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  profile VARCHAR(20) NOT NULL CHECK (profile IN ('student', 'employee', 'executive')),
  data_source VARCHAR(20) NOT NULL DEFAULT 'fictive',
  simulated_year INT NOT NULL,
  simulated_month INT NOT NULL DEFAULT 1 CHECK (simulated_month BETWEEN 1 AND 12),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Expertise payée avant achat : révèle les travaux réels et les défauts cachés.
CREATE TABLE IF NOT EXISTS re_expertises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES re_games(id) ON DELETE CASCADE,
  listing_id VARCHAR(80) NOT NULL,
  year INT NOT NULL,
  cost_coins INT NOT NULL CHECK (cost_coins > 0),
  real_works NUMERIC(12,2) NOT NULL,
  hidden_defects JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (game_id, listing_id, year)
);

CREATE TABLE IF NOT EXISTS re_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES re_games(id) ON DELETE CASCADE,
  principal NUMERIC(14,2) NOT NULL CHECK (principal > 0),
  annual_rate_pct NUMERIC(6,3) NOT NULL,
  months INT NOT NULL CHECK (months > 0),
  insurance_rate_pct NUMERIC(5,3) NOT NULL,
  monthly_payment NUMERIC(12,2) NOT NULL,      -- assurance comprise
  upfront_fees NUMERIC(12,2) NOT NULL DEFAULT 0,
  taeg_pct NUMERIC(7,4),
  months_paid INT NOT NULL DEFAULT 0,
  started_year INT NOT NULL,
  started_month INT NOT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'repaid')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS re_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES re_games(id) ON DELETE CASCADE,
  listing_id VARCHAR(80) NOT NULL,
  city_id VARCHAR(50) NOT NULL,
  neighborhood_id VARCHAR(80) NOT NULL,
  title VARCHAR(200) NOT NULL,
  property_type VARCHAR(20) NOT NULL,
  surface_sqm NUMERIC(8,2) NOT NULL,
  age VARCHAR(5) NOT NULL,
  energy_class CHAR(1) NOT NULL,
  condition VARCHAR(20) NOT NULL,
  purchase_year INT NOT NULL,
  purchase_month INT NOT NULL,
  purchase_price NUMERIC(14,2) NOT NULL,
  notary_fees NUMERIC(12,2) NOT NULL,
  works_financed NUMERIC(12,2) NOT NULL DEFAULT 0,
  down_payment NUMERIC(14,2) NOT NULL,
  loan_id UUID REFERENCES re_loans(id) ON DELETE SET NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'vacant' CHECK (status IN ('vacant', 'let', 'sold')),
  current_rent NUMERIC(10,2) NOT NULL DEFAULT 0,
  pending_works_eur NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (pending_works_eur >= 0),
  hidden_defects JSONB NOT NULL DEFAULT '[]',
  euro_remainder_cents INT NOT NULL DEFAULT 0 CHECK (euro_remainder_cents >= 0),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Un même bien ne peut pas être possédé deux fois (hors biens vendus).
CREATE UNIQUE INDEX IF NOT EXISTS uq_re_properties_owned_listing
  ON re_properties (game_id, listing_id) WHERE status <> 'sold';
CREATE INDEX IF NOT EXISTS idx_re_properties_game ON re_properties(game_id);
CREATE INDEX IF NOT EXISTS idx_re_loans_game ON re_loans(game_id);
