# Capital de départ Pro

- Gratuit : 500 🪙 à l'activation du compte. **Pro : environ le double** (1 000 🪙), configurable par `PRO_STARTING_CAPITAL_MULTIPLIER` dans `backend/src/config/game.ts` (VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER).
- Mécanique : un **complément unique** (500 🪙) est versé au premier passage en Pro (webhook Stripe) ou à l'activation d'un compte déjà Pro. Motif du registre : `pro_starting_bonus` (pièces créées).
- Une seule fois par compte (colonne `users.pro_capital_granted_at`, migration 027) : résilier puis se réabonner ne redonne rien ; plusieurs webhooks simultanés ne versent qu'une fois.
- Non concerné : les comptes dont le statut Pro est forcé à la main en base (`pro_override`) *après* l'activation ; le capital de base de la procédure de rétablissement (reste 500 🪙).
