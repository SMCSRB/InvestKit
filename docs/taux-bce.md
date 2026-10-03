# Taux de change BCE (Crypto en InvestCoins)

**Règle du jeu : 1 InvestCoin = 1 €.** Les cours crypto sont en dollars (`USD`) : on les convertit en InvestCoins avec le **taux de référence EUR/USD de la BCE** du jour de jeu. Cette PR ne prépare que les taux ; la conversion des ordres arrive avec la PR suivante (« Crypto en InvestCoins »).

## Source
Taux de référence de l'euro publiés par la BCE (un taux par jour ouvré, vers 16 h CET). Adresse de l'API de données utilisée par défaut :
`https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?format=csvdata&startPeriod=AAAA-MM-JJ&endPeriod=AAAA-MM-JJ`
Un fichier téléchargé à la main (CSV de cette API, ou `eurofxref-hist.csv`) est aussi accepté.
> Les formats de fichier ont été écrits d'après la documentation de la BCE, mais **jamais testés sur le vrai site** (pas d'accès réseau depuis l'environnement de développement). Fais d'abord `npm run fx:import -- --check --file ton-fichier.csv` : il lit et résume le fichier **sans rien écrire**.

## Commandes (à lancer par toi, jamais automatiques)
```
cd backend
npm run fx:import -- --from 2014-01-01          # télécharge et écrit les taux (idempotent)
npm run fx:import -- --file ./eurofxref-hist.csv # depuis un fichier
npm run fx:import -- --check --file ./fichier.csv # vérifie seulement
npm run fx:import -- --demo                       # taux FICTIFS (démo), jamais en production
```
`npm run crypto:import -- --demo` écrit aussi des taux **fictifs** (marqués « demo ») pour que le jeu d'exemple fonctionne.

## Règles
- **Taux d'un instant de jeu T** : dernier taux publié **avant le jour de T** (comme la bougie de clôture de la veille). Jamais un taux postérieur à la date de jeu.
- **Week-end, jour férié** : on reprend le dernier jour ouvré, mais pas plus de **7 jours** (`FX_MAX_STALE_DAYS`, `config/economy.ts`).
- **Au-delà, ou aucun taux** : la conversion est **indisponible** (`FX_UNAVAILABLE`) : les ordres Crypto seront refusés avec un message clair et l'affichage restera en dollars.
- **Lignes invalides** (vide, `N/A`, `.`, valeur nulle ou négative, date impossible) : ignorées et comptées, jamais devinées.
- **Taux de démonstration** : toujours marqués `demo` en base ; un taux réel du même jour les remplace, jamais l'inverse.
- Le serveur décide du taux ; le navigateur n'en envoie jamais. `GET /crypto/state` renvoie `fx` (taux du jour, jour de publication, ancienneté, démo ou non).

## En base
Table `fx_rates` (migration 046) : `day`, `currency`, `per_eur`, `source`, `demo`, `imported_at`.
