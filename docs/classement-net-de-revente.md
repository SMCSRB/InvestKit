# Classement : net de revente, seuil unique, barre de progression

## Immobilier : gain net de revente
Le classement Immobilier compte ce que tu **gagnerais réellement si tu revendais tout aujourd'hui** :
- **Valeur de liquidation** de chaque bien non vendu = prix de vente moins le prêt restant, l'**agence**, les **diagnostics**, l'éventuel **audit énergétique**, l'**indemnité de remboursement anticipé**, l'**impôt sur la plus-value** (abattements compris), le **dépôt de garantie** à rendre et l'impôt sur les loyers dû. C'est exactement le calcul d'une vraie vente (`closingFor` dans `realEstateSaleService.ts`, partagé avec la vente réelle).
- **Bien loué : décote de 10 %** sur le prix (`SALE_PARAMS.occupiedDiscountPct`, valeur de jeu non sourcée, à reconfirmer) : un bien occupé se brade.
- **Gain** = valeur de liquidation + loyers encaissés (nets) + produit net des ventes déjà faites − montants investis − intérêts des prêts personnels.
- **Performance** = gain ÷ **capital de départ réel du compte** : 10 000 en gratuit, 20 000 avec Pro (le bonus Pro, versé une fois, est lu dans le registre : `startingCapitalOf`). Plus d'effet « petit capital propre » : emprunter ne fait plus gonfler artificiellement le pourcentage. Le levier utilisé reste affiché.

## Seuil unique, tous domaines
Pour apparaître au classement (Bourse, Crypto, Immobilier et les domaines à venir) : **2 500 InvestCoins investis ET 5 jours actifs**. Une seule règle, dans `config/economy.ts` (`RANKING_MIN_INVESTED`, `RANKING_MIN_ACTIVE_DAYS`), appliquée dans `leaderboardRepository.getBoard` pour que tout nouveau domaine la respecte sans rien faire. Valeurs de jeu, non sourcées, à reconfirmer.

## Barre de progression
Chaque page de classement affiche « 1 800 / 2 500 investis · 3 / 5 jours actifs » (`RankingProgress`, champ `progress` renvoyé par le serveur). Texte neutre : **aucune date limite, rien ne s'efface, aucune série à tenir**.

## « Jour actif » : à resserrer lors de l'audit de sécurité
Aujourd'hui, **toute requête authentifiée** compte pour le jour (`middleware/auth.ts` → `activityService.recordActiveDay`, hors usurpation admin). Un script pourrait donc gagner des jours actifs **sans jouer**. À resserrer pendant l'audit de sécurité : ne compter que de vraies actions de jeu (un ordre, une leçon validée, un avancement du temps, une réclamation…), ou limiter aux écrans de jeu, et vérifier qu'aucune route de simple lecture ne l'incrémente.

## Tests
`classementSeuil.test.ts` (les deux seuils, progression, capital réel gratuit/Pro) ; `realEstateSales.test.ts` (valeur de liquidation < fonds propres, décote d'un bien loué, formule du gain) ; les autres tests de classement créent des joueurs avec 5 jours actifs (`createUser({ activeDays: 5 })`).
