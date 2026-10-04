# Crypto (simulation) — données, horloge et anti-triche

> Simulation à but éducatif, pas un conseil en investissement. Nouveau domaine `crypto_market` (libellé « Crypto »), qui coexiste avec l'ancien domaine `crypto` (5 actifs, prix annuels) laissé intact.

## Ce qui est en place (lots a + b serveur)
- **Catalogue** (la liste des actifs PRÉVUS ; **seuls ceux dont les cours réels sont importés apparaissent dans le jeu** : l'API `GET /assets` ne renvoie que les actifs qui ont une bougie à la date du joueur, jamais un prix inventé ; sur la copie de test au 4 octobre 2026 : BTC, ETH (depuis le 2017-08-17), BNB (2017-11-06), XRP (2018-05-04), SOL (2020-08-11)) : ~110 actifs (BTC, ETH, stablecoins USDT/USDC/DAI/UST, top 100, pièces effondrées LUNA/UST/FTT/CEL/SRM/BCC), descriptions pédagogiques écrites de zéro, niveau de risque 1-5 expliqué, dates de lancement approximatives (un actif n'apparaît qu'à partir de sa première bougie réelle importée).
- **Bougies** : stockées en 1m / 1h / 1d (table `crypto_candles`) ; 5m, 15m, 4h, 1w, 1M sont calculées à la demande. Alignement UTC (semaine = lundi, mois = 1er).
- **Horloge serveur** : table `crypto_accounts`. La date simulée est décidée par le serveur ; **aucun paramètre de date envoyé par le navigateur n'est lu**.
- **Anti-triche** : une bougie n'est renvoyée que si sa fin ≤ date simulée ; les bougies agrégées sont construites uniquement à partir de bougies visibles (la dernière est marquée `partial`) ; le curseur `before` est replafonné ; l'explication d'une faillite n'est révélée qu'à la date de l'événement. Test sur 40 dates aléatoires × 8 unités de temps.
- **API** (`/api/v1/crypto`) : `GET /state`, `POST /account`, `GET /assets`, `GET /assets/:symbol`, `GET /candles` (par lots de 300, max 1000), `GET /compare` (2 à 4 actifs rebasés à 100), `POST /time/advance` (`day|week|month`, jamais en arrière, protégé contre les doubles clics).

## Fournisseurs de données (à vérifier avant usage commercial)
⚠️ Le bac à sable de développement n'a pas d'accès réseau aux fournisseurs : **rien n'a été importé, aucun cours n'a été inventé**. Les informations ci-dessous viennent de ma connaissance des services et sont à **reconfirmer** sur leurs pages officielles (conditions d'utilisation, quotas, profondeur).

| Fournisseur | Usage | Profondeur | Limites / conditions (à reconfirmer) |
|---|---|---|---|
| CryptoCompare (histoday/histohour/histominute) | journalier toutes pièces | depuis le lancement de chaque pièce | clé gratuite, quota mensuel ; usage commercial = offre payante |
| Binance Vision (fichiers CSV mensuels publics) | horaire et minute des grandes pièces | depuis ~2017 | sans clé, fichiers publics ; vérifier les conditions pour un usage commercial |
| CoinGecko (market_chart) | capitalisation | ~1 an en offre gratuite | clé « demo », quota par minute |
| Kraken / Coinbase | alternatives prévues | 720 / 300 bougies par requête | pagination nécessaire |

Mode temps réel : **architecture seulement** (interface fournisseur, cache, repli) ; dépend de la Phase 5.

## Ce que tu dois importer depuis ton serveur
Depuis `backend/` (le script crée les tables et reprend là où il s'est arrêté, ré-exécutable sans doublons) :
```
# 1) journalier, toutes les pièces, depuis le début
CRYPTOCOMPARE_API_KEY=xxxx npm run crypto:import -- --provider cryptocompare --all --tf 1d --from 2010-01-01 --continue
# 2) horaire des grandes pièces
npm run crypto:import -- --provider binance-vision --symbols BTC,ETH,BNB,XRP,SOL --tf 1h --from 2017-08-01
# 3) minutes (volumineux, à limiter)
npm run crypto:import -- --provider binance-vision --symbols BTC,ETH --tf 1m --from 2024-01-01
# 4) capitalisation
COINGECKO_API_KEY=xxxx npm run crypto:import -- --marketcaps --symbols BTC,ETH --days 365
```
Jeu **fictif** pour essayer l'interface sans import : `npm run crypto:import -- --demo` (actifs DEMO*, bandeau « DONNÉES FICTIVES », jamais à présenter comme de vrais cours).

## À tester chez moi
- [ ] `npm run crypto:import -- --demo` puis `GET /api/v1/crypto/state` (connecté) : les dates de départ proposées sont listées.
- [ ] Créer le compte avec `{"start":"y2020"}`, puis `GET /assets` : aucun actif lancé après le 1er janvier 2020.
- [ ] `POST /time/advance {"step":"week"}` : la date avance de 7 jours ; un second appel ne revient jamais en arrière.
- [ ] `GET /candles?symbol=DEMO1&tf=1d&asOf=2030-01-01` : le paramètre `asOf` est ignoré, aucune bougie postérieure à la date simulée.
