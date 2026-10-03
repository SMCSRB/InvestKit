# Crypto : « Solde insuffisant » avec assez de pièces

**Cause réelle** : le serveur refuse tout débit qui entamerait des **pièces empruntées réservées à un autre domaine** (règle voulue du « crédit fléché » : un prêt Immobilier ne se dépense pas en Crypto). Le contrôle se fait **uniquement côté serveur** (`investcoinsRepository.applyWith`) ; l'écran ne comparait rien. Le solde comparé est bien le solde en pièces, et le montant bien le total débité (prix + frais, pas le prix d'une unité) ; l'ancienne position ETH n'intervient pas. Mais l'écran affichait le **solde brut** (« Pièces disponibles ») et le message ne disait pas pourquoi.

Reproduit : 387 pièces, achat de 150, BTC à 6 404,87 InvestCoins, ancienne position présente → **accepté** sans pièces empruntées ; **refusé** avec 300 pièces réservées à l'Immobilier (387 − 149 < 300).

## Correctif
- Le serveur renvoie `spendableCoins` (pièces utilisables en Crypto) et `reservedElsewhereCoins`, dans le portefeuille et dans l'estimation (`affordable`, `affordableMessage`).
- Message chiffré : « Tu as X, mais Y sont des pièces empruntées réservées à un autre domaine… Tu peux en dépenser Z ici ; il en faut W. » Sinon : « Solde insuffisant : il faut W, tu as Z ».
- Écran : carte « Utilisables en Crypto », message rouge avant de cliquer, ligne « Tu possèdes X ACTIF ».
- Règle du crédit fléché inchangée.

## À décider plus tard (non fait)
- L'ancien domaine `crypto` (page Bourse/Crypto historique) et `crypto_market` comptent comme deux domaines pour le crédit fléché : un prêt pris dans l'un ne se dépense pas dans l'autre. À trancher.
- Tableau de bord : « Patrimoine » négatif parce que l'immobilier n'est pas compté. Priorité sur la décision 16 : afficher deux chiffres, **patrimoine financier** et **patrimoine total**.
