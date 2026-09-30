# Administration

Réservée aux comptes au rôle **admin** ET avec la **double authentification (2FA) activée**. Le rôle est lu en base à chaque requête (jamais dans le jeton). Il ne peut être accordé que depuis le serveur :

```
cd backend && npm run set-admin -- ton@email.fr on
```
Ensuite, sur le site : Paramètres → Sécurité → activer la 2FA.

## API (`/api/v1/admin/…`, documentée dans OpenAPI)
| Route | Rôle |
|---|---|
| `GET /users?q=&tier=&status=&page=` | liste (recherche e-mail/pseudo, filtres free/pro, suspendus/non vérifiés/admins) |
| `GET /users/:id` | fiche : profil, solde, abonnements, banque, prêts, derniers mouvements et événements de sécurité. **Chaque consultation est tracée** (`admin_view_user`). Aucun secret (mot de passe, 2FA, jetons) n'est jamais renvoyé. |
| `POST /users/:id/pro` | statut Pro manuel |
| `POST /users/:id/disable` · `enable` | suspension réversible, **motif obligatoire** ; un compte suspendu ne peut plus se connecter ni utiliser un jeton existant ; on ne suspend ni soi-même ni un autre administrateur |
| `POST /users/:id/coins` | ajustement de pièces : entier non nul, ≤ 100 000, **motif obligatoire**, inscrit au registre (création/destruction `admin_adjustment`) |
| `GET /audit?action=&userId=` | journal d'audit (ajout seul) |
| `GET /stats` | utilisateurs (actifs 1/7/30 j, Pro, 2FA), inscriptions sur 30 jours, pièces en circulation / créées / détruites / puits, abonnements, joueurs par domaine, prêts |
| `GET /billing` | abonnements (statut, échéance) — les remboursements se font dans Stripe |
| `GET /alerts` | alertes proactives : verrouillages de comptes en rafale, échecs de connexion massifs, **soldes différents du registre**, soldes négatifs, prêts en défaut, abonnements impayés, configuration de sécurité incomplète |
| `GET /system` | santé : mémoire, charge, base de données (ping, pool), version de Node, et **contrôles de configuration** (JWT, chiffrement, CORS, HTTPS, e-mails, Stripe…) |
| `GET/PUT/DELETE /flags…` | drapeaux de fonctionnalité |

Toute action d'écriture est inscrite dans le journal d'audit avec l'administrateur qui l'a faite et son adresse IP.

## Drapeaux de fonctionnalité
Activer/désactiver une fonction sans redéployer, ou la déployer à un pourcentage d'utilisateurs : `enabled` (interrupteur) + `rollout_percentage` (0-100, réparti de façon stable par utilisateur : le même joueur a toujours le même résultat, et un joueur inclus à 25 % l'est encore à 50 %). Côté site : `GET /api/v1/flags` renvoie `{ clé: vrai/faux }` pour le joueur connecté. Dans le code serveur : `featureFlagService.isEnabled('ma_cle', userId)`. Un drapeau inconnu vaut « faux ».

## Interface `/admin`
Six sections : **Vue d'ensemble** (alertes, utilisateurs actifs, abonnés Pro, pièces en circulation, graphique des inscriptions avec tableau alternatif, joueurs par domaine, puits d'InvestCoins), **Utilisateurs** (recherche, filtres, fiche avec Pro manuel, suspension avec motif, ajustement de pièces avec confirmation), **Journal** (filtrable, paginé), **Drapeaux** (créer, activer, pourcentage, supprimer), **Facturation**, **Système** (santé + contrôles de configuration, rafraîchi toutes les 15 s). Un non-admin voit « Accès refusé » ; un admin sans 2FA est invité à l'activer. Migration de session : la page fonctionne aussi juste après le passage aux cookies (ancien jeton envoyé tant que l'échange n'est pas terminé).

Testé de bout en bout dans un vrai navigateur : refus non-admin, refus sans 2FA, statistiques, recherche, fiche, suspension (le jeton du joueur est aussitôt refusé) puis réactivation, journal, drapeaux, système.

## « Voir comme » (impersonation, lecture seule)
Depuis la fiche d'un utilisateur (`👁️ Voir comme cet utilisateur`) : l'administrateur voit le site tel que le joueur le voit, pour comprendre un problème. Garde-fous :
- **Lecture seule** : toute écriture (achat, vente, emprunt, suppression…) répond 403 `IMPERSONATION_READ_ONLY` ; pas d'export RGPD ; pas d'accès à l'administration avec l'identité du joueur.
- **15 minutes** maximum (jeton dédié, marqué par l'identifiant de l'administrateur).
- Impossible sur un autre administrateur ou sur soi-même ; exige le rôle admin + 2FA.
- **Tracé** : `admin_impersonate_start` et `admin_impersonate_stop` dans le journal d'audit.
- Bandeau rouge permanent avec le bouton **Quitter** ; la session de l'administrateur est gardée de côté dans un cookie httpOnly et rétablie à la sortie (après revérification que le compte est toujours administrateur).
