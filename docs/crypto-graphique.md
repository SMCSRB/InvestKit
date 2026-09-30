# Crypto — page « Marché » et graphique professionnel

Page `/crypto` (bouton « ₿ Marché Crypto → » dans le tableau de bord). Graphique : TradingView Lightweight Charts™ v5 (Apache 2.0) — logo d'attribution conservé, mention dans la page et fichier `NOTICE`.

- **Marché** : recherche, catégorie, tri, prix, variations 24 h / 7 j / 30 j, volume, capitalisation, risque 1-5. Pastilles « FICTIF » et « EFFONDRÉ ».
- **Fiche d'actif** : description pédagogique, plus haut/bas connus à la date simulée, palier de liquidité, niveau de risque expliqué, explication de faillite (seulement après l'événement).
- **Graphique** : bougies + volume, ligne, aire ; échelle linéaire / log / % ; unités 1m → 1M (seules celles qui existent à la date simulée) ; zoom, défilement, réticule avec infobulle O/H/L/C/volume ; chargement des bougies plus anciennes par lots de 300 au défilement ; bougie en cours signalée.
- **Indicateurs** (ajout/retrait, paramètres modifiables, calculs testés dans `backend/tests/cryptoIndicators.test.ts`) : SMA, EMA, Bollinger, RSI (Wilder), MACD 12/26/9, moyenne mobile du volume.
- **Tracés** : ligne horizontale et ligne de tendance, mémorisés dans le navigateur (par actif).
- **Comparaison** : 2 à 4 actifs rebasés à 100 sur un seul axe.
- **Mobile** : testé à 390 px, aucun débordement horizontal.
- **Anti-triche** : le navigateur ne fournit jamais de date ; tout vient de l'horloge du serveur.
- Les repères d'achat/vente sur le graphique sont prêts (propriété `markers`) et seront alimentés par le lot Ordres.

## À tester chez moi
- [ ] `/crypto` : choisir une date, ouvrir un actif, changer d'unité de temps, d'échelle, ajouter RSI + MACD, éditer une période.
- [ ] Tracer une ligne horizontale et une tendance, recharger : elles restent.
- [ ] « +1 mois » : la date et le dernier prix avancent ; impossible de voir plus tard.
- [ ] Sur téléphone : pas de barre de défilement horizontale, pincer pour zoomer.
