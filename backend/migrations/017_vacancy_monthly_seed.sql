-- Vacance mois par mois + graine reproductible par partie.

-- Graine de la partie : tous les tirages (vacance, plus tard événements) en dérivent.
-- Deux parties avec la même graine et les mêmes actions donnent exactement les mêmes résultats.
ALTER TABLE re_games ADD COLUMN IF NOT EXISTS seed VARCHAR(64) NOT NULL DEFAULT gen_random_uuid()::text;

-- Recherche de locataire : nombre de mois vides déjà écoulés depuis la mise en location
-- (NULL = pas de recherche en cours). Remplace rent_search_months_left (durée pré-tirée).
ALTER TABLE re_properties ADD COLUMN IF NOT EXISTS search_elapsed_months INT CHECK (search_elapsed_months >= 0);
UPDATE re_properties
SET search_elapsed_months = 0, rent_search_months_left = NULL
WHERE rent_search_months_left IS NOT NULL AND search_elapsed_months IS NULL;
