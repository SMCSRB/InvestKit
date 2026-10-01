# Simulateurs (PEA, crédit immobilier, investissement locatif)

Trois pages natives, **publiques** (visibles sans compte) : `/simulateurs/pea`, `/simulateurs/loan1` (crédit immobilier), `/simulateurs/loan2` (investissement locatif). `/demo` les présente.

## Ce qui a changé
Les anciennes pages étaient des fichiers HTML de ~90 Ko embarqués dans un `iframe`, avec leur propre thème, un faux « Cours ETF en temps réel », un comparateur de banques inventé, un « Expert IA » et une assurance comptée deux fois. Tout cela est supprimé, car il n'existait **aucune donnée réelle** derrière. Les fichiers `public/simulateur-*.html` et `public/vendor/` (Chart.js, html2pdf) ont été retirés.

## Fonctionnement
- Calculs **purs côté navigateur** dans `app/lib/sim/` (`finance.js`, `invest.js`, `rental.js`) : mêmes entrées, mêmes sorties, aucun appel réseau pour le crédit et le locatif.
- Les formules de prêt sont **comparées au moteur du serveur** (`backend/src/engine/immo/loan.ts`) par `backend/tests/simulators.test.ts` : mensualité, tableau d'amortissement, TAEG.
- L'onglet « Risque » du simulateur PEA utilise les outils publics existants `POST /api/v1/tools/monte-carlo` et `/tools/stress-test` (limités à 40 requêtes / 15 min).
- Les saisies sont gardées dans l'adresse (`?s=…`) : « Copier le lien » partage une simulation, rien n'est enregistré sur le serveur. « Imprimer / PDF » utilise l'impression du navigateur.
- Les hypothèses fiscales (`app/lib/sim/rules.js`) sont **affichées et modifiables** dans l'interface et marquées `VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER` : prélèvements sociaux 17,2 %, impôt forfaitaire 12,8 %, PEA 5 ans, frais de notaire 7,5 % / 2,5 %, endettement 35 %, plafonds micro-foncier et micro-BIC.

## Limites assumées
- La plus-value à la revente n'est pas modélisée dans le locatif (signalé dans l'interface).
- Le rendement d'un placement est une **hypothèse** saisie par la personne, jamais une donnée de marché ni une promesse.
- Aucun cours réel : tant qu'aucun import de données réelles n'existe, il n'y a ni cours en direct ni backtesting.
