-- Journal d'audit réellement « append-only » : aucune suppression, aucune modification, sauf l'anonymisation (user_id → NULL) qui sert
-- à la suppression d'un compte (RGPD). Ajout de fonction et de déclencheur uniquement.
CREATE OR REPLACE FUNCTION audit_logs_guard() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'audit_logs est en ajout seul : suppression interdite';
  END IF;
  -- UPDATE : seul le passage de user_id à NULL est permis (anonymisation à la suppression d'un compte).
  IF NEW.user_id IS NULL AND OLD.user_id IS NOT NULL
     AND NEW.id = OLD.id AND NEW.action = OLD.action AND NEW.entity_type IS NOT DISTINCT FROM OLD.entity_type
     AND NEW.entity_id IS NOT DISTINCT FROM OLD.entity_id AND NEW.metadata IS NOT DISTINCT FROM OLD.metadata
     AND NEW.ip_address IS NOT DISTINCT FROM OLD.ip_address AND NEW.created_at IS NOT DISTINCT FROM OLD.created_at THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'audit_logs est en ajout seul : modification interdite';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_guard ON audit_logs;
CREATE TRIGGER trg_audit_logs_guard BEFORE UPDATE OR DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION audit_logs_guard();
