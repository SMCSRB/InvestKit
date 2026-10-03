# InvestCoins : affichage instantané

## Cause exacte du délai (reproduite avant correction)
Après « Récupérer ma récompense du jour » : barre du haut **200 050**, mais cartes Patrimoine et Liquidités **toujours 200 000** jusqu'au rechargement (captures `docs/captures-investcoins/avant-*`). Causes cumulées :
1. **Trois copies du solde** dans la page : `wallet` de la barre du haut (mis à jour seulement par SON bouton), `coinsBalance` du tableau de bord (jamais affiché, avec sa propre copie du bouton de récompense) et `overview.coins` de la vue d'ensemble.
2. **La carte Patrimoine lit la vue d'ensemble (`GET /overview`)**, chargée au démarrage puis rechargée seulement quand le portefeuille de Bourse change (années, positions) : jamais après un gain de pièces. Elle restait donc périmée.
3. **`refreshWallet` existait mais n'était appelé nulle part** : quiz, missions, achats et prêts ne mettaient à jour aucun solde affiché.
4. Ce n'était **pas** un cache serveur ni un instantané : `/overview` est calculé à chaque appel. (Le classement, lui, s'appuie sur des instantanés de performance en %, recalculés à chaque opération de trading ; ce n'est pas un patrimoine.)
5. Animation : 900 ms, ramenée à 600 ms (et déjà coupée par « réduire les animations »).
6. Le « patrimoine » affiché ignorait les dettes (liquidités + titres seulement).

## Maintenant
- **Serveur** : une seule définition, `netWorthCoins` (`backend/src/engine/wealth.ts`) = liquidités + titres (Bourse, Crypto) − dettes bancaires. L'Immobilier reste en euros et hors total (voir `docs/banque.md`). Un prêt ne change pas le patrimoine (pièces et dette montent ensemble) ; ses intérêts le baissent.
  - Remarque : le classement ne calcule pas de patrimoine en pièces (il classe des performances en %), il n'existe donc pas de « fonction du classement » à réutiliser : cette fonction pure est la nouvelle référence, testée.
- `GET /economy/balance` renvoie `{ balance, tradingValue, debtCoins, netWorth, dailyStreak, canClaimToday, at }`.
- **Chaque action qui écrit et réussit** (récompense, quiz, mission, achat/vente, prêt, ordres crypto, immobilier…) renvoie aussi ce `wallet` dans sa réponse (`middleware/walletEcho.ts`). Un refus ou une erreur n'en renvoie pas.
- **Navigateur** : `app/lib/coinStore.js`, source unique pour la barre du haut, le menu, la carte Patrimoine, Liquidités, Titres, Dette, l'accueil. Il affiche seulement ce que dit le serveur (aucun calcul local, aucun affichage optimiste), ignore un instantané plus ancien (`at`), se synchronise entre onglets (BroadcastChannel + relecture au retour sur l'onglet), relit la vraie valeur après un échec ou une coupure réseau, et une interception unique des réponses (`session.js`) l'alimente sans toucher chaque écran.
- Double clic ou deux onglets : un seul gain (le serveur verrouille la ligne du joueur), registre des InvestCoins intact (somme du registre = solde, testé).
