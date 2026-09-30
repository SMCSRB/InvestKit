# Moteur de risque (Phase 4)

Outils pédagogiques, pas des conseils en investissement. Paramètres dans `backend/src/config/riskRules.ts` (chutes historiques **sourcées** ; volatilités, corrélations, poids du score et chutes « estimées » = *VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER*).

## Endpoints
| Route | Accès | Rôle |
|---|---|---|
| `POST /api/v1/tools/monte-carlo` | public, 40/15 min/IP | simulation Monte Carlo : `initial, monthly, years, annualReturnPct, annualVolPct, feesPct?, contributionGrowthPct?, inflationPct?, paths?, seed?` → P10/P50/P90 par année, valeurs finales, probabilité de perte, probabilité de battre l'inflation |
| `POST /api/v1/tools/stress-test` | public | `allocation` (montants ou % par classe) → perte du portefeuille pendant chaque crise historique |
| `POST /api/v1/tools/risk-score` | public | score 0-100 décomposé en 6 facteurs expliqués |
| `GET /api/v1/tools/correlation?domain=` | public | matrice de corrélation des actifs du jeu (rendements annuels) |
| `GET /api/v1/risk/portfolio?domain=&horizon=` | connecté | score, répartition et crises de **mon** portefeuille simulé (positions + liquidités + levier) |

## Monte Carlo
Rendements **mensuels** log-normaux (mouvement brownien géométrique), calibrés pour que le rendement annuel *moyen* soit celui demandé ; frais prélevés chaque mois ; versements mensuels éventuellement revalorisés. **Déterministe** : graine dérivée des paramètres (mêmes entrées = même résultat), modifiable. 2 000 trajectoires par défaut, 10 000 au plus. Vérifié par les tests : sans volatilité = formule exacte, moyenne des trajectoires ≈ rendement attendu, médiane < moyenne (asymétrie log-normale), éventail qui s'élargit avec la volatilité.
Limite : volatilité et rendement constants, pas de corrélation temporelle ni de krach « de queue épaisse » (les vrais krachs sont plus violents que la loi normale) : à lire avec les tests de résistance.

## Tests de résistance (crises historiques)
Bulle internet 2000-2002 (actions −49 % / CAC −62 %), crise 2007-2009 (−57 % / −58 %, immobilier −4 %), Covid 2020 (−34 %), inflation 2022 (actions −25 %, **obligations −13 % estimé** : la diversification protège moins), hiver crypto 2018 (Bitcoin −84 %). Chaque résultat indique si une valeur est estimée ; durée indicative pour retrouver le sommet quand elle est connue.

## Score de risque décomposé
Volatilité du portefeuille (corrélations supposées entre classes) 25 %, pire crise historique 25 %, concentration 15 %, endettement 15 %, exposition crypto 10 %, horizon 10 % (risque élevé sur un horizon court). Chaque facteur : note, poids, contribution, valeur lisible, explication en français simple, conseil. Étiquettes : Prudent (< 25), Modéré, Dynamique, Élevé (≥ 75).
Note : des pièces empruntées non dépensées comptent comme liquidités (elles diluent la volatilité) ; le facteur « endettement » reste affiché séparément.

## Corrélations
Pearson sur les rendements annuels des séries du jeu, sur les années communes (minimum 3 points). Jeu de données pédagogique simplifié.
