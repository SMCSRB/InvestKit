-- Étape 6 : revente, vente amiable en difficulté, vente forcée, journal des ventes.
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS sale_asking_price NUMERIC(14,2);
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS sale_search_elapsed_months INT CHECK (sale_search_elapsed_months >= 0);
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS sold_year INT;
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS sold_month INT;
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS sold_price NUMERIC(14,2);
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS sale_kind VARCHAR(20);
-- Argent investi APRÈS l'achat (travaux payés plus tard, rénovation) : sert au calcul de performance.
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS extra_invested_eur NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Difficultés de paiement : mois (année × 12 + mois) où la banque a proposé la vente amiable.
ALTER TABLE re_games ADD COLUMN IF NOT EXISTS distress_since_total INT;

CREATE TABLE IF NOT EXISTS re_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES re_games(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES re_properties(id) ON DELETE CASCADE,
  year INT NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('amicable', 'distress_amicable', 'forced')),
  sale_price NUMERIC(14,2) NOT NULL,
  breakdown JSONB NOT NULL,        -- détail exact : prêt, indemnité, frais, plus-value, impôts, dépôt...
  net_proceeds NUMERIC(14,2) NOT NULL,   -- peut être négatif (solde dû à la banque)
  arrears_covered NUMERIC(14,2) NOT NULL DEFAULT 0,
  shortfall NUMERIC(14,2) NOT NULL DEFAULT 0,
  coins_credited INT NOT NULL DEFAULT 0,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (property_id, kind)
);
CREATE INDEX IF NOT EXISTS idx_re_sales_game ON re_sales(game_id, year, month);
