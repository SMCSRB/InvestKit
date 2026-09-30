-- Fiscalité et frais Bourse/Crypto : état fiscal du portefeuille (ouverture du PEA, versements, cessions crypto de l'année, frais et impôts payés).
ALTER TABLE virtual_portfolios ADD COLUMN IF NOT EXISTS tax_state JSONB NOT NULL DEFAULT '{}'::jsonb;
