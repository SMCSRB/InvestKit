-- Complément de capital de départ Pro : versé une seule fois par compte.
ALTER TABLE users ADD COLUMN IF NOT EXISTS pro_capital_granted_at TIMESTAMPTZ;
