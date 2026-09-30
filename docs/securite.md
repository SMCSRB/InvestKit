# Sécurité — lot 1 (authentification et journal d'audit)

Feuille de route v6, phases 1 et 6. Ce lot ne change rien de visible pour un joueur ordinaire.

- **Code de vérification email** : tiré avec un générateur cryptographique (`crypto.randomInt`) au lieu de `Math.random` (prévisible).
- **Secret 2FA chiffré au repos** (AES-256-GCM, `backend/src/utils/fieldCrypto.ts`) : la clé est `FIELD_ENCRYPTION_KEY` (`openssl rand -hex 32`), à défaut dérivée de `JWT_SECRET` avec un avertissement. **Ne pas changer cette clé après coup** : les secrets déjà chiffrés deviendraient illisibles. Les anciens secrets en clair restent lisibles ; `npm run encrypt-totp` (dans `backend/`) les chiffre tous, sans danger si relancé.
- **2FA obligatoire pour les administrateurs** (`middleware/admin.ts`) : un compte admin sans 2FA reçoit l'erreur `ADMIN_2FA_REQUIRED` sur toutes les routes d'administration. Les deux contrôles d'admin dupliqués sont remplacés par ce middleware unique.
- **Journal d'audit réellement en ajout seul** (migration 025) : un déclencheur de base de données refuse toute suppression et toute modification, sauf l'anonymisation `user_id → NULL` (suppression de compte). Journalisés : connexion (avec ou sans 2FA), réinitialisation de mot de passe, activation/désactivation de la 2FA, procédure de rétablissement bancaire, et les scripts `set-pro` / `invite` (déjà). Jamais de mot de passe, code ni jeton dans le journal.

## À faire avant / après déploiement
1. Ajouter `FIELD_ENCRYPTION_KEY=<64 caractères hexadécimaux>` dans `backend/.env.local` (générer avec `openssl rand -hex 32`), puis redémarrer l'API.
2. `cd backend && npm run encrypt-totp` pour chiffrer les secrets 2FA existants.
3. Pour donner un accès administrateur : passer le rôle du compte à `admin` en base, puis activer la 2FA depuis le profil.

## RGPD : export et suppression (PR Sécurité 2)
- `GET /auth/me/export` : JSON de toutes les données de l'utilisateur (sans mot de passe, secrets 2FA ni identifiants Stripe), journalisé (`data_export`).
- `POST /auth/me/delete` : exige la phrase `SUPPRIMER`, le mot de passe et, si la 2FA est active, un code (ou code de secours). L'abonnement Stripe est résilié d'abord ; en cas d'échec rien n'est supprimé. Puis `DELETE FROM users` (cascade) ; le journal d'audit est conservé et anonymisé (`user_id` → NULL, seule modification permise par le déclencheur append-only).
- Limité à 5 requêtes par heure (`accountLimiter`).
- Limite connue : les badges du navigateur (localStorage) ne sont pas effacés par le serveur.

## Contrôle d'accès (feuille de route 6A)
- Audit : chaque route qui reçoit un identifiant (`/realestate/properties/:id/*`, `/bank/loans/:id/repay`, `/bank/portfolio/loans/:id/repay`) filtre la requête SQL par `user_id` de l'appelant ; un identifiant étranger répond 404 (ou 400 s'il n'est pas un UUID), sans rien révéler ni modifier.
- `tests/idor.test.ts` le vérifie au niveau HTTP avec deux joueurs (le premier possède un bien, un prêt personnel et un prêt sur portefeuille) : toutes les routes à identifiant, les listes, des identifiants piégés (injection SQL, `../`, 500 caractères), les routes admin (403 même avec 2FA, le rôle vient de la base, pas du jeton).
- Anti-énumération : `GET /auth/check-email/:email` est limité à 20 requêtes par 15 minutes et par IP (il servait d'oracle pour lister les comptes).
- Principe de moindre privilège : le rôle administrateur n'est jamais lu dans le jeton.
