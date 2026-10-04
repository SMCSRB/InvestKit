-- Taxe foncière réelle : la source retenue est le jeu « Taxe foncière par commune, taux et charge par local » de TERRALYSE (data.gouv.fr, Licence Ouverte 2.0), qui sépare taux communal, intercommunal et TEOM.
-- La source « dgfip-rei » reste permise (donnée brute de la DGFiP, source primaire, à vérifier plus tard). Toujours NON lue par le moteur actuel. Aucune donnée personnelle.
ALTER TABLE immo_property_tax_imports DROP CONSTRAINT IF EXISTS immo_property_tax_imports_source_check;
ALTER TABLE immo_property_tax_imports ALTER COLUMN source SET DEFAULT 'terralyse';
ALTER TABLE immo_property_tax_imports ADD CONSTRAINT immo_property_tax_imports_source_check CHECK (source IN ('terralyse', 'dgfip-rei'));
-- rate_pct = taux GLOBAL = communal + intercommunal (la TEOM n'y est jamais ajoutée : elle est récupérable sur le locataire).
ALTER TABLE immo_property_tax_rates ADD COLUMN IF NOT EXISTS communal_pct NUMERIC(7, 3);
ALTER TABLE immo_property_tax_rates ADD COLUMN IF NOT EXISTS intercommunal_pct NUMERIC(7, 3);
ALTER TABLE immo_property_tax_rates ADD COLUMN IF NOT EXISTS teom_pct NUMERIC(7, 3);
