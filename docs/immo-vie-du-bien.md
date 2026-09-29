# Vie du bien (étape 4)

Code : `backend/src/services/realEstateLifeService.ts`, `engine/immo/valuation.ts`, `engine/immo/monthly.ts` ; migration `016_real_estate_property_life.sql`. Tests : `tests/realEstateLife.test.ts`.

## Le temps appartient au serveur
`POST /api/v1/realestate/time/advance {months: 1..12}` règle les mois un par un (dans une transaction verrouillée : deux appels simultanés se suivent, chaque mois n'est réglé qu'une fois). Date maximale : décembre 2026.

## Ce qui se passe chaque mois, pour chaque bien
1. **Location.** `POST /properties/:id/list {askingRentRatio 0,7–1,3}` met un bien vacant en location (impossible tant qu'il reste des travaux à payer). Vacance **mois par mois** (voir `docs/immo-loyers.md`) : `POST /properties/:id/reprice` permet de baisser le loyer demandé pendant la recherche. Chaque tirage dépend de (graine de la partie, annonce, mois) : deux parties de même graine et mêmes actions donnent exactement les mêmes résultats.
2. **Indexation IRL** à la date anniversaire du bail (jamais le premier mois), gel F/G.
3. **Mensualité** : échéance exacte du tableau d'amortissement ; prêt soldé au dernier mois.
4. **Relevé** (`re_statements`) : loyers, charges récupérables/non récupérables, mensualité **ventilée en intérêts, capital remboursé et assurance**, impôt (taux par profil), cash-flow net, avec l'explication exacte de chaque variation (vacance, indexation, retard, bien non proposé, travaux à payer).
5. **Pièces** : le cash-flow net du mois est converti en pièces entières (reliquat en euros conservé par bien). Écritures `re_cashflow_in` (création) / `re_cashflow_out` (destruction). Un déficit sans pièces suffisantes devient une **dette en euros** (`arrears_eur`) : avertissement, aucun nouvel achat accepté par la banque, remboursée dès que le solde le permet. Après 3 mois de suite, un risque de vente forcée est signalé (mécanisme prévu à l'étape 6).

## Patrimoine (`GET /properties`)
Valeur = prix payé × évolution du marché de la ville (interpolée mois par mois entre deux années), ramenée à l'état actuel ; dette = capital restant dû ; fonds propres = valeur − dette. Rénovation lourde (travaux payés sur un bien « à rénover ») : bon état + 2 classes énergie gagnées (max C) : règle de jeu.

`GET /summary?year&month` : récapitulatif mensuel de tous les biens ; `GET /properties/:id/statements` : historique d'un bien.

## Simplifications assumées
Pas d'aléa de locataire (départs, impayés du locataire) avant l'étape 5. Le ledger reçoit un seul montant net par bien et par mois ; la ventilation capital/intérêts/assurance est dans le récapitulatif mensuel. Pas de régularisation annuelle des charges.
