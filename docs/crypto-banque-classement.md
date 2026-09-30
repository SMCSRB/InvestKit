# Crypto — prêt sur portefeuille, classement et administration

> Simulation à but éducatif, pas un conseil en investissement.

## Prêt sur portefeuille Crypto (onglet « Banque » de /crypto)
- **Règles** : emprunt jusqu'à **30 %** de la valeur des cryptos détenues (garantie) ; **appel de marge à 65 %** (dette ÷ valeur) ; **vente forcée à 80 %**, décote de 3 % (valeur du module Banque). Un seul prêt à la fois, taux variable de l'année simulée (barème Banque), intérêts seuls.
- **Prix d'évaluation** : *plus bas prix de chaque crypto sur la période écoulée* (bougies horaires, sinon journalières) ; à défaut, clôture. **Simplification signalée au joueur** dans le devis, les messages d'appel de marge et de vente forcée : ces plus bas peuvent ne pas avoir eu lieu au même moment.
- **Intérêts** : courent jour simulé par jour, prélevés à chaque avance du temps si le solde le permet, sinon ajoutés à la dette.
- **Appel de marge** : le joueur a jusqu'à sa prochaine avance dans le temps pour régulariser (rembourser ou acheter) ; sinon vente forcée proportionnelle (au cours de clôture moins la décote), prêt soldé par le produit ; s'il ne reste plus rien et que de la dette subsiste : défaut, crédit bloqué (règle du module Banque).
- **Vendre des cryptos en garantie** : le manque de garantie est remboursé sur le produit de la vente, sinon la vente est refusée.
- **Pièces empruntées** fléchées vers le domaine Crypto (crédit fléché existant) ; remboursement possible aussi depuis la page Banque.
- Notifications : appel de marge, vente forcée, exécution d'ordre.

## Classement
`GET /crypto/leaderboard?period=AAAA-MM` : en %, **par mode** (accéléré) et **par mois simulé** (on compare des joueurs à la même date), **net de dettes** (intérêts déduits, gain rapporté au capital propre, plancher 10 %), **levier affiché**, capital minimal 100 🪙. Une période future est refusée.

## Administration
- Les statistiques de pièces par domaine incluent `crypto_market` (créées / détruites / échangées, puits : frais et impôts).
- Nouvelles **alertes** : `CRYPTO_COIN_CREATION` (le trading ne doit jamais créer de pièces), `CRYPTO_LEDGER_DRIFT` (registre ≠ exécutions), `CRYPTO_ORDER_BURST` (≥ 300 ordres/h : script ?), `CRYPTO_LIQUIDATIONS` (info). Joueurs Crypto comptés.
- Droits : le domaine gratuit « Crypto » (ancien) et « Marché Crypto » se débloquent mutuellement.

## À tester chez moi
- [ ] Acheter des cryptos, onglet Banque : simuler puis emprunter ≤ 30 % ; le devis affiche la simplification « plus bas de la période ».
- [ ] Avancer dans le temps : les intérêts sont prélevés ; la dette ÷ garantie évolue.
- [ ] Vendre toutes les cryptos : le prêt est remboursé sur le produit.
- [ ] Onglet Classement : ton mois simulé, ta performance et ton levier (si emprunt).
- [ ] Admin → Alertes : aucune alerte `CRYPTO_*` critique.
