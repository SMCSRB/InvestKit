# Crypto en InvestCoins

**Règle du jeu : 1 InvestCoin = 1 €**, dans tous les domaines. La Crypto en suivait une autre (1 pièce = 1 dollar fixe) : elle utilise maintenant le **taux EUR/USD de la BCE** (voir `docs/taux-bce.md`). À déployer avec la PR « taux BCE » et la PR « affichage » (les trois ensemble).

## Ce qui change
- Les cours et les bougies restent **stockés en dollars** (c'est la donnée d'origine). Seul le passage dollars → InvestCoins change : `prix en pièces = prix en dollars ÷ taux du jour` (le taux est le nombre de dollars pour 1 €).
- Le **taux utilisé est celui du jour de jeu** (dernier taux publié avant ce jour, repli de 7 jours maximum). Il est enregistré avec chaque exécution (`crypto_fills.fx_usd_per_coin`, migration 047) : un ordre passé garde toujours son taux.
- **Ordres en attente** (limite, stop-loss, take-profit) : le prix de déclenchement se saisit et s'affiche **en InvestCoins par unité**. Quand tu avances dans le temps, chaque bougie est convertie avec le taux de **son** jour avant d'être comparée à ton prix.
- **Prêt sur portefeuille** : la garantie, l'appel de marge et la liquidation sont calculés en pièces avec le taux du jour.
- **Échanges crypto contre crypto** : chaque jambe est convertie avec le taux du jour ; aucun gain ne peut apparaître en changeant de taux (test « pas de boucle d'argent »).
- **Affichage** : prix en InvestCoins, dollar d'origine en information secondaire (fiche d'actif, estimation d'un ordre). Le graphique est en InvestCoins ; il repasse en dollars (écrit sur le graphique) si un taux manque, et les lignes « prix moyen » / « ordres » sont alors masquées. Capitalisation, volume, plus haut et plus bas historiques restent en dollars, avec leur unité écrite.

## Sans taux de change
Aucun taux disponible pour le jour de jeu : on **n'invente rien**.
- Ordres, estimations, échanges, nouveaux prêts : refusés avec un message clair (HTTP 503, code `FX_UNAVAILABLE`).
- Portefeuille : valeurs en pièces à `—` (`fxUnavailable`).
- Contrôle de marge des prêts : reporté (événement `margin_check_postponed`), jamais de liquidation sans taux.
- Classement Crypto : l'instantané est sauté ce jour-là.

## Tests
`backend/tests/cryptoCoins.test.ts` : achat à 1,25 ; arrondi à 1,0831 ; pas de boucle d'argent entre deux taux ; refus sans taux (dont l'API en 503) ; repli week-end / taux trop ancien ; prix d'un ordre en pièces ; ordre limite déclenché sur bougies converties ; garantie et report de marge ; API `priceCoins` et bougies `unit=coins`.
Les autres tests Crypto utilisent `setFlatFx(1)` (taux plat) pour rester lisibles.
