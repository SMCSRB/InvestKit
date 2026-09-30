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

## Anti credential-stuffing, mots de passe, réinitialisation (feuille de route 6C)
- **Verrouillage par compte** (`services/loginThrottle.ts`, migration 028) : 8 échecs en 15 minutes sur un même e-mail (toutes IP confondues) → verrouillage de 15 min, doublé à chaque verrouillage consécutif (plafond 4 h). Même comportement pour un e-mail inconnu (aucun compte révélé). Le bon mot de passe est refusé pendant le verrouillage (429 `LOGIN_LOCKED`, en-tête `Retry-After`). Un succès ou une réinitialisation remet à zéro. Le code 2FA a son propre compteur (5 erreurs). Réglages : `config/securityRules.ts` (valeurs à reconfirmer). Compromis assumé : un tiers peut bloquer 15 minutes le compte d'un autre, jamais définitivement.
- La limite par IP (5 tentatives / 15 min) reste en place ; elle ne voit pas une attaque répartie sur beaucoup d'adresses, d'où le verrou par compte.
- **Temps de réponse constant** : la comparaison bcrypt est faite même si le compte n'existe pas.
- **Journal d'audit** : `login_failed`, `login_locked` (comptes existants uniquement, pour ne pas saturer le journal).
- **Politique de mot de passe** (inscription et réinitialisation) : 8 à 128 caractères, majuscule, minuscule, chiffre, pas dans la liste des mots de passe courants, sans la partie locale de l'e-mail.
- **Mot de passe oublié** : réponse identique que le compte existe ou non ; jeton aléatoire de 256 bits, valable 1 h, à usage unique, **stocké haché** (SHA-256) ; lien envoyé par e-mail vers `/reset-password` ; le jeton n'est plus jamais renvoyé par l'API (sauf variable explicite `EXPOSE_RESET_TOKEN_FOR_TESTS=true`, réservée aux tests automatisés). Avant : l'e-mail n'était pas envoyé (TODO) et le jeton était renvoyé en mode développement.
- **Proxy inverse** : `TRUST_PROXY` (nombre de proxys de confiance, 1 par défaut en production). Sans cela, derrière nginx/Caddy, tous les visiteurs partageaient la même adresse IP pour la limitation de débit et le journal d'audit.
