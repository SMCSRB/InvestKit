-- Impôt sur les loyers : base imposable cumulée sur l'année civile (loyers encaissés − charges
-- déductibles − taxe foncière − intérêts d'emprunt…), réglé chaque décembre, jamais négatif.
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS tax_base_ytd NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Ordre d'insertion des événements : plusieurs événements d'un même mois partagent le même horodatage
-- (même transaction), il faut un numéro de séquence pour un affichage stable et reproductible.
ALTER TABLE re_events ADD COLUMN IF NOT EXISTS seq BIGSERIAL;
