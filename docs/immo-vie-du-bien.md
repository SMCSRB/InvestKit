# Vie du bien (étape 4)

Code : `backend/src/services/realEstateLifeService.ts`, `engine/immo/valuation.ts`, `engine/immo/monthly.ts` ; migration `016_real_estate_property_life.sql`. Tests : `tests/realEstateLife.test.ts`.

## Le temps appartient au serveur
`POST /api/v1/realestate/time/advance {months: 1..12}` règle les mois un par un (dans une transaction verrouillée : deux appels simultanés se suivent, chaque mois n'est réglé qu'une fois). Date maximale : décembre 2026.

## Ce qui se passe chaque mois, pour chaque bien
1. **Location.** `POST /properties/:id/list {askingRentRatio 0,7–1,3}` met un bien vacant en location (impossible tant qu'il reste des travaux à payer). Vacance **mois par mois** (voir `docs/immo-loyers.md`) : `POST /properties/:id/reprice` permet de baisser le loyer demandé pendant la recherche. Chaque tirage dépend de (graine de la partie, annonce, mois) : deux parties de même graine et mêmes actions donnent exactement les mêmes résultats.
2. **Indexation IRL** à la date anniversaire du bail (jamais le premier mois), gel F/G.
3. **Mensualité** : échéance exacte du tableau d'amortissement ; prêt soldé au dernier mois.
4. **Relevé** (`re_statements`) : loyers, charges récupérables/non récupérables, mensualité **ventilée en intérêts, capital remboursé et assurance**, impôt (voir ci-dessous), cash-flow net, avec l'explication exacte de chaque variation (vacance, indexation, retard, bien non proposé, travaux à payer).
5. **Pièces** : le cash-flow net du mois est converti en pièces entières (reliquat en euros conservé par bien). Écritures `re_cashflow_in` (création) / `re_cashflow_out` (destruction). Un déficit sans pièces suffisantes devient une **dette en euros** (`arrears_eur`) : avertissement, aucun nouvel achat accepté par la banque, remboursée dès que le solde le permet. Après 3 mois de suite, un risque de vente forcée est signalé (mécanisme prévu à l'étape 6).

## Patrimoine (`GET /properties`)
Valeur = prix payé × évolution du marché de la ville (interpolée mois par mois entre deux années), ramenée à l'état actuel ; dette = capital restant dû ; fonds propres = valeur − dette. Rénovation lourde (travaux payés sur un bien « à rénover ») : bon état + 2 classes énergie gagnées (max C) : règle de jeu.

`GET /summary?year&month` : récapitulatif mensuel de tous les biens ; `GET /properties/:id/statements` : historique d'un bien.

## Simplifications assumées
Pas d'aléa de locataire (départs, impayés du locataire) avant l'étape 5. Le ledger reçoit un seul montant net par bien et par mois ; la ventilation capital/intérêts/assurance est dans le récapitulatif mensuel. Pas de régularisation annuelle des charges.

## Impôt sur les loyers (régime réel simplifié)
`impôt de l'année = taux × max(0, base imposable de l'année)`, réglé en **décembre** (jamais négatif) avec le détail dans le relevé.
Base = loyers encaissés − charges non récupérables (copropriété, assurance du bien, entretien) − taxe foncière − intérêts d'emprunt et assurance emprunteur − réparations et frais de remise en location − travaux imprévus (entretien). Le capital remboursé et le dépôt de garantie ne sont pas déductibles. Le cumul de l'année compense les mois déficitaires.
Taux = tranche marginale du profil (étudiant 11 %, salarié 11 %, cadre 30 %) + prélèvements sociaux 17,2 % (`config/immoRules.ts`).
Sources : barème 2026 sur revenus 2025 (0 % ≤ 11 600 € ; 11 % ≤ 29 579 € ; 30 % ≤ 84 577 € ; 41 % ≤ 181 917 € ; 45 % au-delà) : extrait de service-public.gouv.fr ; prélèvements sociaux sur revenus fonciers : 17,2 % en 2026 (la hausse de la CSG à 10,6 % ne les concerne pas), sources de presse et de conseil à reconfirmer sur un texte officiel.
Non modélisé : micro-foncier, déficit foncier reportable ou imputable sur le revenu global, foyer fiscal à plusieurs parts, LMNP/amortissement.
