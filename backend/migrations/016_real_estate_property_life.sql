-- Étape 4 : vie du bien (mise en location, mois qui passent, relevés, retards de paiement).

ALTER TABLE re_games ADD COLUMN IF NOT EXISTS arrears_eur NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (arrears_eur >= 0);
ALTER TABLE re_games ADD COLUMN IF NOT EXISTS missed_months INT NOT NULL DEFAULT 0 CHECK (missed_months >= 0);

-- Location : loyer demandé, recherche de locataire en cours (NULL = pas mis en location), début du bail.
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS asking_rent NUMERIC(10,2);
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS rent_search_months_left INT CHECK (rent_search_months_left >= 0);
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS lease_start_total INT;      -- année × 12 + mois du début du bail
-- État et classe énergie à l'achat (servent à la valorisation ; les colonnes condition / energy_class sont les valeurs ACTUELLES).
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS initial_condition VARCHAR(20);
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS initial_energy_class CHAR(1);
UPDATE re_properties SET initial_condition = condition WHERE initial_condition IS NULL;
UPDATE re_properties SET initial_energy_class = energy_class WHERE initial_energy_class IS NULL;

-- Relevé mensuel d'un bien : lignes, explications, pièces créditées/débitées.
CREATE TABLE IF NOT EXISTS re_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES re_properties(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES re_games(id) ON DELETE CASCADE,
  year INT NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  status VARCHAR(12) NOT NULL,
  lines JSONB NOT NULL,
  explanations JSONB NOT NULL,
  net_cash_flow NUMERIC(12,2) NOT NULL,
  coins_delta INT NOT NULL DEFAULT 0,
  remainder_cents_after INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (property_id, year, month)
);
CREATE INDEX IF NOT EXISTS idx_re_statements_game ON re_statements(game_id, year, month);
