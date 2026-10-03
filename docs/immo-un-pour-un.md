# Immobilier : 1 InvestCoin = 1 €

Règle unique du jeu : **1 InvestCoin = 1 € de jeu**, réglée par `EUROS_PER_COIN` dans `backend/src/config/economy.ts` (avant : 20 € par pièce en Immobilier).

## Ce qui change
- Les prix, apports, loyers et mensualités de l'Immobilier sont exprimés en euros **et** en pièces à égalité.
- Le **pouvoir d'achat ne change pas** : l'ancien capital (500 🪙 × 20 €) valait 10 000 €, le nouveau capital (10 000 🪙 × 1 €) aussi.
- Les conversions euros → pièces gardent le reliquat en centimes (jamais de perte ni de création), comme avant : le reliquat est désormais inférieur à 1 €.
- Plafond de dette en pièces : 500 000 🪙 (VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER). Avant : 50 000 🪙, soit un million d'euros de prêts équivalents.
- Prêt personnel (fléché Immobilier) : minimum 500 🪙 (même montant en euros qu'avant : 25 🪙 × 20 €). Plafond : toujours 6 mois de revenus nets du profil (maintenant 5 400 / 14 400 / 27 000 🪙).
- Capital après une procédure de rétablissement : le capital de départ (10 000 🪙).

## Ce qui n'est PAS fait ici
- La Crypto reste en dollars pour l'instant (conversion en euros avec le taux de la BCE : PR suivante).
- Les garde-fous du crédit (apport de 10 %, refus net, réserve de trésorerie) et le classement net de revente : PR suivantes.

## Tests
`economy.test.ts` (valeurs et absence de montants en dur), `rentModel.test.ts` (conversion : règle actuelle + ancien taux), et les tests Immobilier / Banque, dont les montants en pièces sont écrits avec `legacyCoins()` pour garder les mêmes euros qu'avant.
