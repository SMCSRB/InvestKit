-- Classement : mention du levier utilisé (capital investi / capital propre). Ajout de colonne uniquement.
ALTER TABLE leaderboard_rankings ADD COLUMN IF NOT EXISTS leverage NUMERIC(6,2);
