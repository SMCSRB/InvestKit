# Plan de réponse à incident de sécurité

Écrit pour un petit projet hébergé sur un serveur personnel. Garde-le imprimé ou hors du serveur.

## 1. Reconnaître un incident (signaux)
- Connexions étranges dans le journal d'audit (`login_failed`, `login_locked` en rafale ; `login` depuis une IP inconnue).
- Pièces créées sans explication : `GET /api/v1/economy/admin/coins-by-domain` (compte administrateur avec 2FA) ; comparer `created`/`destroyed`/`netInjected` à l'attendu.
- Utilisateurs qui signalent un compte modifié, un mail de réinitialisation non demandé, un paiement inconnu.
- Alerte de dépendance (Dependabot / CodeQL / `npm audit`), ou du fournisseur (Stripe, hébergeur).

## 2. Contenir (premières 30 minutes)
1. **Ne rien effacer.** Les journaux sont la preuve : copier `audit_logs`, les journaux du serveur (`journalctl`, nginx), la base (sauvegarde immédiate).
2. Couper l'accès si nécessaire : page de maintenance côté nginx/Caddy (le site répond « maintenance », l'API n'est plus exposée).
3. **Invalider toutes les sessions** : changer `JWT_SECRET` dans `backend/.env.local` puis redémarrer l'API — tous les jetons et cookies existants deviennent invalides, chacun devra se reconnecter.
4. Suspicion de fuite de clés : révoquer et recréer les clés concernées (Stripe : tableau de bord → développeurs ; e-mail : Resend/SMTP ; hCaptcha ; `FIELD_ENCRYPTION_KEY` uniquement avec une procédure de rechiffrement : voir `docs/securite.md`).
5. Comptes compromis : forcer la réinitialisation (`/forgot-password`) ; suspendre le compte si besoin (colonne `verified = false`).

## 3. Analyser
- Chronologie : première trace, vecteur (mot de passe faible, faille applicative, clé fuitée, serveur), données touchées (qui, quoi).
- Limiter aux faits vérifiés dans les journaux ; noter ce qu'on ne sait pas.

## 4. Corriger et rétablir
- Corriger la cause (PR dédiée, tests), mettre à jour les dépendances, redéployer.
- Restaurer depuis la sauvegarde la plus récente saine si des données ont été altérées (voir `docs/sauvegardes.md`).
- Vérifier le ledger : `SUM(amount)` par utilisateur = solde ; invariants de la banque (crédit créé = capital remboursé + solde + effacé).

## 5. Informer (RGPD)
- Une violation de données personnelles présentant un risque pour les personnes doit être **notifiée à la CNIL dans les 72 heures** après en avoir pris connaissance (téléservice de notification de violation sur cnil.fr), et **aux personnes concernées** si le risque est élevé.
- Conserver un **registre des violations** (date, nature, données, conséquences, mesures) même si aucune notification n'est faite.
- Message aux utilisateurs : clair, sans jargon, ce qui s'est passé, ce qui est touché, ce qu'ils doivent faire (changer leur mot de passe), contact.

## 6. Après coup
- Retour d'expérience écrit (causes, ce qui a marché, ce qu'on change), ajout d'un test qui aurait détecté l'incident.
- Mettre à jour ce plan.

## Contacts à compléter
| Qui | Contact |
|---|---|
| Responsable du site | (à compléter) |
| Hébergeur | (à compléter) |
| Stripe (paiements) | dashboard.stripe.com → Aide |
| CNIL | cnil.fr → Notifier une violation de données |
