# Immobilier façon portail d'annonces : carte interactive, Acheter / Louer, fiche immersive

## Ce qui change pour le joueur
- **Onglets Acheter / Louer** en tête de la recherche. « Louer » montre les **loyers du marché** des mêmes biens (loyer mensuel, loyer au m², prix à l'achat en rappel). Ce n'est pas un second jeu : le joueur reste propriétaire-bailleur ; l'onglet sert à comparer. La fiche d'un bien en mode « Louer » affiche **« Louer ou acheter ? »** (loyer d'un côté, mensualité + charges de l'autre) et un bouton « Voir ce bien à l'achat ».
- **Carte interactive** (SVG maison, aucune bibliothèque) à côté de la liste :
  - **zoom** : molette, boutons +/−, double-clic, touches `+` / `-` ;
  - **déplacement** : glisser, flèches du clavier ;
  - **pincement à deux doigts** sur téléphone ;
  - **bulles numérotées** : les annonces proches se regroupent (« 7 »), un clic zoome sur le groupe ; en zoomant, les bulles se séparent en **pastilles de prix** ;
  - **aperçu** au clic sur une pastille (image, prix, surface, DPE, rendement) puis « Voir la fiche » ;
  - **recadrage automatique** sur les résultats quand les filtres changent, bouton « Tout voir » ;
  - quartiers teintés selon le **prix moyen au m²** (comparable d'une ville à l'autre) ; clic sur le nom d'une ville = filtre sur cette ville.
- **Sur téléphone (390 px)** : bascule **Liste / Carte** ; passer en Carte amène la carte à l'écran.
- **Filtres complets** : ville, type, budget (ou **loyer** en mode Louer), **prix au m² maximum**, surface, pièces, **neuf / ancien**, état, DPE, rendement brut minimum, ventes pressées, travaux. **Tris** : pertinence, prix, prix au m², rendement, plus récentes, et en mode Louer **loyer** et **loyer au m²**. Recherches enregistrées et favoris : conservés (le mode Louer et les nouveaux filtres se mémorisent aussi).
- **Cartes d'annonces** : illustration, prix (ou loyer) et équivalent en InvestCoins, surface, pièces, ville, **DPE**, **rendement brut estimé**, état. Icônes Lucide, pièce InvestCoin, aucun emoji.
- **Fiche immersive** : grande image avec titre, lieu et prix posés dessus, vues (façade, séjour, cuisine, plan), **chiffres clés**, **simulation du prêt avec curseurs** (apport, durée) en plus des champs, réponse de la banque, **« Et si je louais ? »**, liens discrets **« Pour aller plus loin »** vers les explications du glossaire (mensualité, DPE, rendement…).

## Comment c'est fait
- `app/lib/mapGeo.js` : géométrie **pure** (aucun DOM) : placement déterministe des villes et des annonces, zoom autour d'un point, déplacement borné, pincement, cadrage, **regroupement en bulles**. Testée seule (`backend/tests/mapGeo.test.ts`).
- `app/components/immo/ListingMap.jsx` : le composant (gestes par événements « pointeur », molette, clavier). Les pastilles et les bulles sont de **vrais boutons** (`<button>` avec `aria-label` : « 7 annonces groupées, prix de … à … »), la carte est un groupe nommé au clavier, un message vocal annonce le nombre d'annonces visibles, **« réduire les animations »** coupe les mouvements. La liste des résultats reste l'équivalent texte de la carte.
- Serveur (`engine/immo/listingSearch.ts`) : nouveaux paramètres validés `mode`, `minRent`, `maxRent`, `maxPricePerSqm`, `ages`, tris `rent_asc`, `rent_desc`, `rentsqm_asc`. Aucun nouveau chiffre : le loyer est celui du catalogue. Tests : `backend/tests/immoCarte.test.ts`.

## Limites assumées
- Les villes sont fictives : pas de fond de carte réel, le dessin est le nôtre.
- Le mode « Louer » ne permet pas de se loger : c'est un comparateur de loyers.
- Il n'existe pas encore de leçons « Immobilier » dans le parcours d'éducation : les liens discrets mènent au glossaire et au parcours d'éducation général.

## Captures
`docs/captures-immobilier/` : `d1` à `d10` (ordinateur) et `m1` à `m8` (mobile 390 px).
