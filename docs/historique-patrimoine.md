# Historique du patrimoine (6g, étape G1)

**À quoi ça sert** : garder une trace de l'évolution de ton patrimoine (en InvestCoins) pour pouvoir, plus tard, l'afficher en courbe.

## Règles

- C'est **le serveur** qui écrit. Dès qu'il calcule ton portefeuille (après une action, à la lecture du solde), il enregistre un point. Le navigateur n'écrit jamais.
- **Un seul point par jour** (jour UTC) : le dernier du jour remplace les précédents. Rien n'est écrit si rien n'a changé.
- Chaque point contient : liquidités, titres Bourse, crypto, immobilier net de revente (peut être négatif), dettes, patrimoine financier et total.
- L'historique **commence au jour du déploiement** : le passé n'est pas inventé.
- Les dates de jeu de chaque domaine sont gardées à part (`game_clock`), car les horloges Bourse / Crypto / Immobilier ne sont pas encore unifiées (étape 6c).
- Une erreur d'écriture n'empêche jamais l'affichage du portefeuille.
- Suppression du compte : l'historique est effacé (cascade). Il apparaît dans l'export du compte (`wealthHistory`).

Aucune valeur de jeu non sourcée ici. Aucun affichage n'est modifié dans ce lot (la courbe vient avec G2).

## Lecture par le joueur (G3)
`GET /api/v1/wealth/history?limit=N` : l'historique de **ton** patrimoine (identifiant pris dans le jeton), du plus ancien au plus récent.
- **Plan Pro** : tout l'historique. **Compte gratuit** : les 30 points les plus récents ; la réponse indique combien de points sont masqués (`hiddenPoints`) pour pouvoir l'expliquer, sans pression.
- Le droit est lu en base par le serveur ; aucune option de la requête ne l'élargit.
- Le graphique sur le tableau de bord (et le mode édition G5) attendent la refonte du tableau de bord : ils utiliseront cette route et le composant `StackedArea`.
- Le second chiffre « patrimoine total » (G6, option C) existe déjà dans le portefeuille (`financialWealth` et `totalWealth`) et dans chaque point de l'historique.
