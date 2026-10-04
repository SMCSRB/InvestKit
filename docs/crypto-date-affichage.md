# Crypto : l'affichage suit la date de jeu (correctif)

Retour de test : après « +1 mois », la liste des actifs pouvait apparaître vide, la fiche gardait le prix de la date précédente jusqu'au rechargement, et le bandeau des prix en haut ne suivait pas la date.

## Causes et corrections
- **Bandeau des prix** (cause établie, reproduite dans un navigateur) : il se chargeait une seule fois et gardait ses prix **10 minutes** en mémoire, sans tenir compte de la date de jeu. Maintenant : son cache n'est valable que pour **la même date de jeu**, et toute avance du temps (Crypto, Bourse ou Immobilier : une seule horloge) lui envoie un signal pour recharger tout de suite.
- **Liste et fiche** : une réponse plus ancienne pouvait écraser une plus récente, et la fiche ne se rechargeait que sur changement de date. Maintenant : chaque avance recharge la liste et la fiche, une vieille réponse n'écrase jamais une récente, et en cas d'erreur la liste déjà affichée reste (au lieu de « Aucun actif »).
- **Aucune mémoire de réponse** : toutes les requêtes vers l'API du jeu partent sans cache navigateur, et le serveur répond `Cache-Control: no-store` à toutes les lectures de données de jeu (Bourse, Crypto, Immobilier, Banque, horloge, solde, patrimoine, aperçu).
- Test navigateur ajouté (`e2e/bureau.spec.ts`) : après +1 mois, date, liste (non vide, prix changé), bandeau et fiche changent sans recharger. La base de test des parcours démarre maintenant au 1er janvier 2020 pour les trois domaines.

## « Où sont passées les 30 pièces ? » (premier achat)
Pas une erreur : c'est le **bonus « premier investissement » de 30 InvestCoins** (`FIRST_STEP_BONUSES.first_investment`), versé **dans la même transaction** que le premier achat (au moins 100 pièces investies) et écrit au registre : `trade_buy` (−achat), `fee_brokerage` (−frais), `first_step_bonus` (**+30**). Exemple : 60 010 − 998 − 2 + 30 = 59 040. Il n'est versé qu'une seule fois par compte. Testé (`cryptoHorlogeAffichage.test.ts`).
