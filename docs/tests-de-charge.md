# Tests de charge

`./ops/load-test.sh [adresse] [secondes] [connexions]` (outil `autocannon`, installé dans `backend/`). À lancer sur un serveur de test ou hors des heures d'usage.

## Mesure (machine de développement, 50 connexions simultanées, 8 s, mode production)
| Route | Requêtes / s | Latence moyenne | Remarque |
|---|---|---|---|
| `GET /health` | ≈ 4 200 | 11 ms | le serveur seul |
| `GET /api/v1/openapi.json` | ≈ 4 000 | 12 ms | après 300 requêtes, la **limite de débit** (300 / 15 min / IP) répond 429 : la protection fonctionne |
| `POST /api/v1/tools/monte-carlo` | — | — | limité à 40 / 15 min / IP : 429 immédiat (protège le processeur) |

À retenir : la couche Express + limiteurs tient plusieurs milliers de requêtes par seconde ; le vrai goulot sera PostgreSQL et les calculs (Monte Carlo : ~20 ms par simulation de 1 000 trajectoires). Les limites par IP sont volontairement basses : un joueur normal (quelques requêtes par minute) ne les atteint pas, mais un site derrière un même réseau (école, entreprise) partage une IP — à surveiller si des 429 apparaissent chez des utilisateurs légitimes (`apiLimiter`, `middleware/rateLimiter.ts`).

Pour aller plus loin sur ton serveur : tester avec un jeton d'un compte de test (en-tête `Authorization`) les routes `GET /overview` et `GET /trading/portfolio` (accès base de données), en relevant la latence à 95 % (`p97.5`).
