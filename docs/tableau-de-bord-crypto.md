# Tableau de bord : le nouveau marché Crypto et les deux patrimoines

## Le défaut
Le tableau de bord (vue d'ensemble, solde partagé du site), la checklist d'accueil et la progression du classement lisaient l'**ancienne** Crypto (domaine `crypto`, table `virtual_portfolios`). Un achat sur le **nouveau marché** (`crypto_market`, tables `crypto_*`) n'y apparaissait donc pas : Patrimoine = liquidités seulement, Titres 0, Capital investi 0, Crypto « pas encore commencé », étape « premier achat » non cochée.

## Toutes les lectures de l'ancienne Crypto trouvées
| Lecture | Avant | Maintenant |
|---|---|---|
| `overviewService` (Titres, Capital investi, carte Crypto) | `virtual_portfolios` « crypto » | **ancienne + nouveau marché fusionnés** (`cryptoSummary`) |
| `walletService` (barre du haut, carte Patrimoine, valeur après chaque action) | idem | idem (`cryptoSummary`) |
| `onboardingService` (étape « premier achat ») | `virtual_portfolios.total_bought` | **ou** un achat dans `crypto_fills` |
| Classement Crypto et progression « x / 2 500 » | déjà sur `crypto_market` (la page Classements appelle `/crypto/leaderboard`) | inchangé, **testé** |
| `riskService` / analyse de risque du tableau de bord | ancienne Crypto seulement | **inchangé** : l'analyse ne lit que la Bourse et l'ancienne Crypto (pas encore branchée sur le nouveau marché, à faire) |
| `accountService` (export des données du compte) | `virtual_portfolios` seulement | **inchangé**, à compléter avant l'ouverture au public |

Fusion plutôt que remplacement : si un joueur a des positions dans les deux, elles s'additionnent.

## Valeur du nouveau marché
Chaque position est valorisée au prix du jour de jeu converti avec le taux BCE du jour (comme le portefeuille de la page Crypto), arrondi vers le bas. **Sans taux de change** ce jour-là : la valeur n'est jamais devinée (0 et drapeau `fxUnavailable`, la carte affiche « taux indisponible »).

## Deux patrimoines (décision 16), tout en InvestCoins
- **Patrimoine financier** = liquidités + Bourse + Crypto − dettes bancaires.
- **Patrimoine total** = patrimoine financier + **immobilier net de revente** (valeur de liquidation : agence, diagnostics, remboursement anticipé, impôt, décote d'un bien loué ; le prêt immobilier est déjà déduit, donc jamais retranché deux fois).
- Serveur : `engine/wealth.ts` (`wealthBreakdown`), renvoyé par `/overview` (`totals.financialWealth`, `totals.totalWealth`, `totals.realEstateNetCoins`) et par le solde partagé (`financialWealth`, `realEstateNet`, `totalWealth`). `netWorth` reste, égal au patrimoine financier.
- Écran : « Patrimoine total » (grande carte) et « Patrimoine financier ». Carte Immobilier : valeur nette de revente et dette en pièces. Plus de « € » sur le tableau de bord ni dans les prix de l'onglet Bourse. (L'option « EUR (€) » des paramètres de devise d'affichage n'a pas été touchée.)

## Tests
`tests/tableauDeBordCrypto.test.ts` : un achat de 150 apparaît dans le patrimoine, « Titres », « Capital investi », la carte Crypto, le solde partagé, la checklist et la progression du classement (150 < 2 500 : non classé ; 2 600 : classé) ; vente (gain négatif, jamais gratuit) ; sans taux de change ; fusion ancienne + nouvelle ; patrimoine total avec un bien immobilier ; plus de « € » dans `OverviewTab`/`DashHero`.
