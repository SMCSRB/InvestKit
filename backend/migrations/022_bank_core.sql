-- Banque (module unique) : registre des dettes, crédit fléché par domaine, journal, drapeau de blocage.
-- Ajouts uniquement, sauf l'élargissement de la contrainte « nature » du registre (nouvelles valeurs 'credit' et 'repayment').

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'investcoins_transactions_nature_check')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'investcoins_transactions_nature_check' AND pg_get_constraintdef(oid) LIKE '%repayment%') THEN
    ALTER TABLE investcoins_transactions DROP CONSTRAINT investcoins_transactions_nature_check;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'investcoins_transactions_nature_check') THEN
    ALTER TABLE investcoins_transactions
      ADD CONSTRAINT investcoins_transactions_nature_check
      CHECK (nature IN ('creation', 'destruction', 'exchange', 'credit', 'repayment'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS bank_accounts (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  credit_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  blocked_reason TEXT,
  blocked_at TIMESTAMP,
  defaults INT NOT NULL DEFAULT 0,
  recoveries INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product VARCHAR(20) NOT NULL CHECK (product IN ('personal', 'portfolio', 'mortgage')),
  domain VARCHAR(30) NOT NULL,                 -- domaine ET horloge du prêt
  repayment_type VARCHAR(15) NOT NULL DEFAULT 'annuity' CHECK (repayment_type IN ('annuity', 'interest_only')),
  principal_coins INT NOT NULL CHECK (principal_coins > 0),
  annual_rate_pct NUMERIC(6,3) NOT NULL CHECK (annual_rate_pct >= 0),
  months INT NOT NULL CHECK (months >= 1),
  accrued_instalments INT NOT NULL DEFAULT 0,  -- échéances tombées (une par mois d'horloge)
  balance_h BIGINT NOT NULL CHECK (balance_h >= 0),        -- capital restant dû, en centièmes de pièce
  remainder_h INT NOT NULL DEFAULT 0 CHECK (remainder_h >= 0 AND remainder_h < 100),
  due_principal_h BIGINT NOT NULL DEFAULT 0,   -- échéances tombées et non réglées
  due_interest_h BIGINT NOT NULL DEFAULT 0,
  missed_instalments INT NOT NULL DEFAULT 0,
  principal_paid_h BIGINT NOT NULL DEFAULT 0,
  interest_paid_h BIGINT NOT NULL DEFAULT 0,
  last_clock_total INT,                        -- dernier mois d'horloge réglé (jamais deux fois le même)
  opened_clock_total INT NOT NULL,
  status VARCHAR(12) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'repaid', 'defaulted', 'liquidated')),
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_bank_loans_user ON bank_loans(user_id, status);

-- Crédit fléché : pièces empruntées non encore dépensées, utilisables SEULEMENT dans leur domaine.
CREATE TABLE IF NOT EXISTS bank_credit_balances (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain VARCHAR(30) NOT NULL,
  coins INT NOT NULL DEFAULT 0 CHECK (coins >= 0),
  PRIMARY KEY (user_id, domain)
);

CREATE TABLE IF NOT EXISTS bank_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  loan_id UUID REFERENCES bank_loans(id) ON DELETE SET NULL,
  kind VARCHAR(30) NOT NULL,
  message TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bank_events_user ON bank_events(user_id, id DESC);
