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

## Décision d'Andreja : le prêt personnel n'est plus fléché
**D'où venaient les pièces « réservées à l'Immobilier »** : du **prêt personnel de la Banque**. `bankPersonalService.borrow` appelait `originateLoan` avec le domaine Immobilier et le fléchage par défaut (`earmark` non désactivé) : le prêt créait des pièces (écriture `bank_disburse`, nature « credit ») ET ajoutait la même somme dans `bank_credit_balances` (domaine `real_estate`). C'est la seule voie qui réserve des pièces à l'Immobilier ; le prêt immobilier d'un achat de bien n'y passe pas.

**Ce qui change** : le prêt personnel passe `earmark: false` : pièces dans le solde libre, dépensables partout. Le prêt immobilier reste attaché au bien : il n'est qu'une dette dans la partie Immobilier (`re_loans`), il ne crédite aucune pièce (testé). Le prêt sur portefeuille reste fléché. Les réserves de 4 mensualités et les plafonds de dette sont inchangés. Le message explicatif de la #109 (carte « Utilisables en Crypto », message chiffré) reste pour les cas où une réserve existe encore (prêt sur portefeuille d'un autre domaine, ou anciennes réserves déjà en base).

**Remarque : le minimum d'un prêt personnel est 500 InvestCoins** (`PERSONAL_LOAN.minPrincipalCoins`), pas 300.

## Les réserves déjà présentes en base (rien n'est touché sans ton go)
Seul le prêt personnel a écrit dans `bank_credit_balances` pour `real_estate`. Après ce correctif, les prêts personnels **déjà ouverts** gardent leur réserve, car le code ne la détache pas d'office. Trois options, à toi de choisir :
1. **Libérer d'un coup** (recommandé sur la copie de test) : une migration ou une commande unique qui met à zéro les réserves `real_estate` (`UPDATE bank_credit_balances SET coins = 0 WHERE domain = 'real_estate';`). Les dettes et échéances ne changent pas ; seuls les pièces redeviennent libres. Je ne l'ai **pas** ajoutée au dépôt, car les migrations se rejouent au démarrage de l'API et elle s'appliquerait toute seule à ton déploiement.
2. **Attendre** : la réserve fond d'elle-même, car les pièces empruntées sont dépensées en premier dans le domaine, et elle disparaît au remboursement.
3. **Remise à zéro des comptes de test** (la PR 9, non lancée) : plus propre si tu veux repartir de zéro.

## Risques à connaître avec un prêt libre
- **Rétablissement** : la procédure saisissait les pièces réservées avant d'effacer la dette. Avec un prêt libre, il n'y a plus rien à saisir : un joueur peut emprunter, dépenser ailleurs, puis faire effacer la dette. À traiter (saisie sur le solde libre ou limite du rétablissement) avant l'ouverture au public.
- **Réserve de 4 mensualités** (PR 8b) : les pièces empruntées comptent maintenant comme des pièces propres ; un prêt personnel peut donc servir à constituer la réserve exigée pour un achat. À regarder si tu veux l'interdire.
- **Classement Immobilier** : le levier affiché ne distingue plus la part financée par un prêt personnel non dépensé (réserve nulle).

## Achat « pour X pièces » : la quantité était trop basse (corrigé)
Cas d'Andreja (1er janvier 2020) : ordre de 100, BTC à 6 404,87 → 0,01530544 BTC reçus au lieu d'environ 0,015452.
Ligne par ligne, avec le prix d'exécution 6 406,86 :
| Ligne | Valeur |
|---|---|
| Quantité reçue | 0,01530544 |
| Montant brut (prix × quantité) | 98,06 |
| Arrondi à la pièce supérieure (contre le joueur) | 99 (+0,94) |
| Frais (0,10 % = 0,10, minimum 1 pièce) | 1 |
| Total débité | 100 |
| Quantité attendue avec 99 de montant | 99 / 6 406,86 = 0,015452 (brut 99,00) |
La pièce manquante est dans la **quantité** : la recherche « quelle quantité tient dans mon budget » s'arrêtait à la première quantité valable (réduction par paliers), souvent trop basse. Ici elle s'arrêtait à un brut de 98,06 et laissait 0,94 pièce inutilisée. Corrigé par une recherche dichotomique exacte : la quantité est la plus grande dont (montant arrondi + frais) tient dans le budget ; au plus une fraction de pièce (l'arrondi à la pièce) est perdue.
L'estimation affiche maintenant la quantité attendue (« Tu recevras X BTC ») et chaque ligne : prix d'exécution, prix × quantité, arrondi, frais, total débité.
