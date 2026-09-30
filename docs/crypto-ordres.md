# Crypto — ordres, exécution et portefeuille

> Simulation à but éducatif, pas un conseil en investissement.

## Règles (toutes exécutées **côté serveur**, jamais avec un prix du navigateur)
- **Types** : au marché, limite (achat/vente), stop-loss (vente), take-profit (vente). Un ordre au marché avec un prix fourni est refusé.
- **Prix de référence** : clôture de la dernière bougie journalière *terminée* à la date simulée du joueur.
- **Ordres en attente** : évalués quand le joueur avance dans le temps, sur les bougies horaires de la période (sinon journalières), strictement postérieures à la création de l'ordre. Limite : exécutée au meilleur de (ouverture, limite). Stop-loss : déclenché si le plus bas touche le seuil, exécuté au pire de (ouverture, seuil) — un trou à la baisse traverse le stop.
- **Frais, écart, glissement** (par palier de liquidité T1 à T4, calculé sur le volume moyen 90 jours) : frais preneur 0,10 / 0,20 / 0,35 / 0,60 % (minimum 1 🪙, arrondi supérieur), moitié pour un ordre qui attend dans le carnet (limite, take-profit) ; écart achat/vente 0,02 / 0,05 / 0,20 / 0,80 % (moitié à chaque exécution) ; glissement = 0,10 × √(montant ÷ volume quotidien moyen), plafonné à 5 %. **VALEURS DE JEU, NON SOURCÉES, À RECONFIRMER.**
- **Économie** : 1 🪙 = 1 $ de jeu dans ce domaine (`CRYPTO_ECONOMY.usdPerCoin`, configurable, à reconfirmer ; l'unification 1 🪙 = 20 € est reportée). Ordre minimal 10 🪙 (sortie complète d'une position toujours permise).
- **Quantités** : texte décimal, jusqu'à 8 décimales, stockées en `NUMERIC(28,8)` (aucun flottant pour les avoirs).
- **Actifs tombés à zéro / disparus** : la vente (sortie complète) reste possible même à prix nul ; les achats sont fermés (prix nul ou plus de cotation depuis 7 jours).
- **Idempotence** : `clientOrderId` unique par joueur ; un rejeu renvoie le même ordre (HTTP 200) sans rien exécuter deux fois, même en requêtes simultanées.
- **Sécurité** : anti-IDOR (un ordre n'est lisible/annulable que par son propriétaire), limiteur 30 ordres/min par joueur, requêtes SQL paramétrées, journal d'audit de chaque ordre, une seule transaction (registre + position + exécution).
- **Registre des pièces** : achat = `trade_buy` (échange), frais = `fee_brokerage` (destruction, domaine `crypto_market`, visible dans les statistiques admin « puits »), vente = `trade_sell`, impôt = `tax_capital_gains` (à la sortie vers l'euro seulement, barème du moteur Bourse/Crypto).
- Le domaine gratuit « Crypto » (ancien) débloque aussi ce marché.

## API
`GET /crypto/quote`, `GET /crypto/portfolio`, `GET /crypto/orders?status=`, `POST /crypto/orders`, `DELETE /crypto/orders/:id`, `POST /crypto/time/advance` (exécute les ordres en attente de la période dans la même transaction que le déplacement de l'horloge).

## À tester chez moi
- [ ] Acheter 1,5 d'un actif au marché : l'aperçu (prix, écart, glissement, frais) correspond au message d'exécution.
- [ ] Double-cliquer « Acheter » : un seul achat.
- [ ] Ordre limite d'achat bas + stop-loss de vente ; avancer d'une semaine : l'exécution apparaît dans « Historique » et dans les notifications.
- [ ] Repères ▲▼ d'achat/vente et lignes « prix moyen » / ordres en attente sur le graphique.
- [ ] Onglet « Mon portefeuille » : patrimoine = pièces + valeur des cryptos ; frais payés > 0.
