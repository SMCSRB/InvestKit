-- Étape 0 (suite) : traçabilité du ledger et changement de domaine gratuit.

-- 1. Chaque écriture du ledger enregistre son DOMAINE et sa NATURE, pour
--    pouvoir plus tard compter les pièces créées/détruites par domaine sans
--    migration rétroactive.
--    nature : 'creation'    = pièces créées par la plateforme (récompenses, capital de départ...)
--             'destruction' = pièces retirées de l'économie (frais, taxes, intérêts payés...)
--             'exchange'    = simple échange entre le solde et un actif (achat/vente)
--    domain : 'stocks', 'crypto', 'real_estate'... ; NULL = hors domaine (récompenses générales)
ALTER TABLE investcoins_transactions ADD COLUMN IF NOT EXISTS domain VARCHAR(50);
ALTER TABLE investcoins_transactions ADD COLUMN IF NOT EXISTS nature VARCHAR(12);

-- Rattrapage des lignes existantes (idempotent : ne touche que les lignes vides).
UPDATE investcoins_transactions
SET nature = CASE
      WHEN reason LIKE 'trade\_%' THEN 'exchange'
      WHEN amount > 0 THEN 'creation'
      ELSE 'destruction'
    END,
    domain = COALESCE(domain, metadata->>'domain')
WHERE nature IS NULL;

ALTER TABLE investcoins_transactions ALTER COLUMN nature SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'investcoins_transactions_nature_check') THEN
    ALTER TABLE investcoins_transactions
      ADD CONSTRAINT investcoins_transactions_nature_check
      CHECK (nature IN ('creation', 'destruction', 'exchange'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_investcoins_transactions_domain_nature
  ON investcoins_transactions(domain, nature);

-- 2. Changement de domaine gratuit : UNE fois, pour les comptes qui avaient
--    déjà choisi avant que le choix devienne définitif. Le droit est accordé
--    à la création de la colonne seulement (le bloc ne se rejoue pas).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'users' AND column_name = 'free_domain_change_allowed') THEN
    ALTER TABLE users ADD COLUMN free_domain_change_allowed BOOLEAN NOT NULL DEFAULT FALSE;
    UPDATE users SET free_domain_change_allowed = TRUE WHERE free_domain IS NOT NULL;
  END IF;
END $$;
