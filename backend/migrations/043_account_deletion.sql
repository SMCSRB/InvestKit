-- Suppression de compte : ce qui est conservé doit l'être SANS lien avec le profil, et le journal d'audit doit être réellement anonymisé.
-- Rejouée à chaque démarrage : tout est idempotent.

-- 1) Pièces : le registre d'un joueur supprimé est résumé en totaux anonymes (par domaine, nature et motif). Les statistiques d'administration
--    (pièces créées / détruites / échangées par domaine) restent donc exactes, sans aucune trace du joueur.
CREATE TABLE IF NOT EXISTS investcoins_ledger_archive (
  domain TEXT,
  nature VARCHAR(12) NOT NULL,
  reason TEXT NOT NULL,
  entries BIGINT NOT NULL DEFAULT 0,
  credited BIGINT NOT NULL DEFAULT 0,
  debited BIGINT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_archive_key ON investcoins_ledger_archive ((COALESCE(domain, '')), nature, reason);

-- 2) Abonnements payants : trace comptable minimale (obligation légale de conservation des pièces comptables), SANS identifiant de joueur,
--    sans e-mail. L'identifiant d'abonnement du prestataire de paiement permet seulement de retrouver les factures chez lui.
CREATE TABLE IF NOT EXISTS billing_records_archive (
  id BIGSERIAL PRIMARY KEY,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retain_until DATE NOT NULL DEFAULT ((NOW() + INTERVAL '10 years')::date),
  tier VARCHAR(20),
  payment_provider VARCHAR(30),
  external_subscription_id VARCHAR(200),
  started_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ
);

-- 3) Journal d'audit : toujours en ajout seul, mais l'anonymisation d'un compte supprimé peut maintenant retirer TOUT ce qui identifie :
--    l'auteur (user_id), l'adresse IP, l'identifiant de la personne concernée (entity_id) et les clés « target », « email », « username » des détails.
--    Aucune autre modification n'est permise ; la suppression de lignes reste interdite.
CREATE OR REPLACE FUNCTION audit_logs_guard() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'audit_logs est en ajout seul : suppression interdite';
  END IF;
  IF NEW.id = OLD.id AND NEW.action = OLD.action AND NEW.entity_type IS NOT DISTINCT FROM OLD.entity_type AND NEW.created_at IS NOT DISTINCT FROM OLD.created_at
     AND (NEW.user_id IS NOT DISTINCT FROM OLD.user_id OR NEW.user_id IS NULL)
     AND (NEW.entity_id IS NOT DISTINCT FROM OLD.entity_id OR NEW.entity_id IS NULL)
     AND (NEW.ip_address IS NOT DISTINCT FROM OLD.ip_address OR NEW.ip_address IS NULL)
     AND (NEW.metadata IS NOT DISTINCT FROM OLD.metadata OR NEW.metadata IS NOT DISTINCT FROM (OLD.metadata - 'target' - 'email' - 'username')) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'audit_logs est en ajout seul : modification interdite';
END;
$$ LANGUAGE plpgsql;
