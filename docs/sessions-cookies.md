# Sessions : cookie httpOnly + protection CSRF

## Pourquoi
Avant, le jeton de connexion (JWT) était stocké dans `localStorage` : n'importe quel script injecté dans une page (faille XSS) pouvait le lire et le voler. Il est maintenant dans un **cookie httpOnly** : le JavaScript de la page ne peut plus le lire.

## Comment ça marche
- À la connexion (mot de passe, ou code 2FA), le serveur pose deux cookies :
  - `ik_session` : le jeton. `httpOnly`, `SameSite=Lax`, `Secure` en production.
  - `ik_csrf` : jeton anti-CSRF, lisible par la page. Il est calculé à partir du jeton de session avec une clé secrète (HMAC) : un attaquant ne peut pas le fabriquer, même s'il parvient à déposer un cookie.
- Toute requête qui **modifie** des données (POST/PUT/PATCH/DELETE) portée par le cookie doit renvoyer `X-CSRF-Token` = le jeton ci-dessus, sinon **403** (`CSRF_INVALID`). Si le navigateur indique une `Origin`, elle doit être autorisée (`CSRF_ORIGIN`).
- `SameSite=Lax` bloque déjà les envois de cookie depuis un autre site ; le jeton CSRF est la deuxième barrière.
- Les clients sans navigateur (future application mobile, scripts) continuent d'envoyer `Authorization: Bearer <jwt>` : pas de cookie ambiant, donc pas de CSRF possible. Si un en-tête Bearer est présent il prime (jeton invalide = 401, pas de repli sur le cookie).
- `POST /auth/logout` efface les cookies. `DELETE`/suppression de compte aussi. `POST /auth/session/upgrade` échange un ancien jeton contre un cookie.
- Côté site : `app/lib/session.js`. `localStorage.token` ne contient plus qu'un **marqueur** `cookie-session` (beaucoup d'écrans testent sa présence). Un petit composant (`SessionBootstrap`) ajoute automatiquement cookies + en-tête CSRF à tous les appels vers l'API ; c'est transitoire, l'idéal étant de passer un jour par une fonction d'appel unique.

## Plan de migration des sessions (3 phases)
1. **Cette PR — coexistence.** Le serveur accepte cookie ET Bearer, et renvoie encore `token` dans le corps des réponses de connexion. Les navigateurs qui ont un ancien jeton dans `localStorage` l'échangent automatiquement au prochain chargement (`/auth/session/upgrade`) : personne n'est déconnecté. Un jeton expiré ramène simplement à la page de connexion.
2. **Plus tard — quand tout le monde a rechargé le site** (quelques jours) : mettre `SESSION_TOKEN_IN_BODY=false`. Le jeton n'est plus renvoyé dans le corps (il n'existe plus que dans le cookie).
3. **Enfin** : retirer du code la lecture de `localStorage.token` comme jeton et la compatibilité « jeton dans le corps ».

Retour arrière : remettre le code précédent suffit (les anciens jetons Bearer fonctionnent toujours).

## Réglages (`backend/.env.local`)
| Variable | Rôle | Défaut |
|---|---|---|
| `CORS_ORIGIN` | origine(s) du site, **exactement** (ex. `https://solomili.duckdns.org`), séparées par des virgules | `*` |
| `COOKIE_SECURE` | `true`/`false` : cookie réservé à HTTPS | `true` si `NODE_ENV=production` |
| `COOKIE_DOMAIN` | domaine du cookie si site et API sont sur deux sous-domaines | (aucun) |
| `SESSION_TOKEN_IN_BODY` | `false` pour ne plus renvoyer le jeton dans le corps | (renvoyé) |

⚠️ **Piège n°1** : en production, le cookie est `Secure` : il n'est pas enregistré si le site est servi en **http**. En HTTP (test sur le réseau local), mettre `COOKIE_SECURE=false`.
⚠️ **Piège n°2** : le site et l'API doivent être sur le **même « site »** (même domaine, ports ou sous-domaines différents OK). Sur deux domaines différents, `SameSite=Lax` empêcherait le cookie ; il faudrait `SameSite=None; Secure`, non prévu ici.
⚠️ `CORS_ORIGIN` doit contenir l'adresse exacte du site (sinon le navigateur bloque les appels avec cookies).

## Limites connues
- Un JWT reste valide jusqu'à son expiration même après déconnexion (pas de liste de révocation). Piste : identifiant de session en base.
- Le changement de mot de passe n'invalide pas les autres sessions (même cause).
- La connexion avec 2FA n'existait pas dans l'interface : elle est ajoutée (étape « code à 6 chiffres » ou code de secours).
