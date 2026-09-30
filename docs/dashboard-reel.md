# Tableau de bord : fin des chiffres de démonstration

Avant, la Vue d'ensemble affichait à **tous** les utilisateurs des chiffres inventés : « Portefeuille 246 k€ », « +18,3 % », « Sharpe 1,45 », « Win rate 72,5 % », « Jean Dupont », « KYC vérifié », « Membre depuis 3 ans », trois « projets » à 269 k€… Sur un site financier, c'est trompeur. Maintenant tout vient du serveur (`GET /api/v1/overview`).

| Élément | Avant | Maintenant |
|---|---|---|
| Solde total | 245 680 € | 🪙 pièces + titres Bourse + Crypto, avec le détail liquidités / titres |
| Performance | +18,3 % | performance réelle Bourse + Crypto (valeur + ventes − achats, frais et impôts inclus) |
| Risque | Sharpe, volatilité, drawdown inventés | score de risque, volatilité estimée et pire crise historique du portefeuille (moteur de risque) ; « — » sans position |
| Métriques | Alpha / Bêta / Sortino inventés | dette bancaire, biens immobiliers, patrimoine immobilier net |
| Synthèse | capital / gain / variation de semaine inventés | capital investi, gain ou perte (latent + réalisé), frais et impôts payés |
| Carte | « INVESTKIT PREMIUM », « Jean Dupont » | « INVESTKIT » ou « INVESTKIT PRO » selon l'offre ; pseudo réel |
| Barre latérale | « Membre depuis 3 ans », « KYC vérifié » | date d'inscription réelle, « e-mail vérifié » |
| Vos projets | 3 projets fictifs | masqué tant que la fonction n'est pas branchée |

Bourse et Crypto sont en pièces ; l'Immobilier est en euros (1 🪙 = 20 €) : **volontairement non additionnés** tant que l'unification des unités n'est pas faite.

Reste factice ailleurs dans le tableau de bord (à traiter ensuite) : fil d'activité, amis, guildes et leurs classements, badges déclenchés localement, « Marché »/actualités. Ils sont propres au navigateur et ne reflètent pas de vraies données.
