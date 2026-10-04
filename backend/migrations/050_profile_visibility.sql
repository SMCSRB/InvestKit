-- Confidentialité du profil (6a, PR 5) : trois niveaux. Par défaut « public » : le comportement actuel ne change pour personne.
--   public : visible partout ;
--   amis   : nom, photo et # visibles de ses amis et de sa guilde ; « Joueur anonyme » dans les classements publics ;
--   prive  : comme « amis » pour les classements publics, et introuvable par son pseudo (seul son code ami permet de le trouver).
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_visibility VARCHAR(10) NOT NULL DEFAULT 'public';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_profile_visibility_check') THEN
    ALTER TABLE users ADD CONSTRAINT users_profile_visibility_check CHECK (profile_visibility IN ('public', 'amis', 'prive'));
  END IF;
END $$;
