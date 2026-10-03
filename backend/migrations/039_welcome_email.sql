-- Mail de bienvenue : envoyé UNE SEULE FOIS, à la fin de l'onboarding (quand le pseudo existe).
-- welcome_email_sent_at mémorise l'envoi ; l'envoi se « réserve » par un UPDATE ... WHERE welcome_email_sent_at IS NULL (atomique).
-- Les migrations sont rejouées à chaque démarrage : la remise à niveau des comptes existants ne se fait donc QU'À LA CRÉATION de la
-- colonne (sinon, à chaque redémarrage, les inscrits en cours d'onboarding seraient marqués « déjà servis » et ne recevraient rien).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'welcome_email_sent_at') THEN
    ALTER TABLE users ADD COLUMN welcome_email_sent_at TIMESTAMPTZ;
    -- Comptes existants : jamais de mail de bienvenue rétroactif.
    UPDATE users SET welcome_email_sent_at = NOW();
  END IF;
END $$;
