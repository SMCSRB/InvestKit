# Crypto — impôt, échanges, événements pédagogiques et temps réel

> Simulation à but éducatif, pas un conseil en investissement.

## Impôt et frais (puits d'InvestCoins)
- **Frais** de plateforme à chaque exécution (`fee_brokerage`) et **impôt** sur les plus-values (`tax_capital_gains`) : pièces **détruites**, rattachées au domaine `crypto_market`, donc visibles dans les statistiques admin « puits par domaine et par motif ».
- L'impôt n'est prélevé **qu'à la sortie vers l'euro** (vente contre pièces) : flat tax = impôt sur le revenu + prélèvements sociaux (moteur existant `saleTax`, compte « crypto »), sous le seuil annuel de cessions (305 🪙) aucune imposition, moins-value = aucun impôt et aucun report. **Taux et seuil repris de la Bourse/Crypto existante : je n'ai pas pu les revérifier à la source (pas d'accès réseau) — à reconfirmer auprès de service-public.fr / impots.gouv.fr.**
- **Échange crypto contre crypto** (`POST /crypto/swap`) : **aucun impôt**, ne compte pas dans les cessions, le prix de revient est reporté sur l'actif reçu ; seuls les frais (palier le moins liquide des deux, preneur) sont payés et détruits.

## Journal du marché (événements)
- 23 événements historiques rédigés pour ce projet (Mt. Gox 2014, bulle de 2017, jeudi noir de mars 2020, hausse des taux de 2022, Terra, Celsius, FTX, USDC 2023, ETF 2024…) : chacun affiche un **message** et une **leçon**. Ordres de grandeur arrondis, **à reconfirmer**. Un événement n'est révélé (et notifié) qu'**une fois sa date franchie** ; jamais de doublon ; jamais avant la date de départ du joueur.
- **Événements aléatoires reproductibles** (graine = joueur + jour) : incident technique (pas d'ordre au marché ce jour-là, ordres en attente autorisés) 0,6 %/jour, volatilité extrême (écart et glissement ×3 pendant 3 jours) 1,2 %/jour. **Valeurs de jeu non sourcées, à reconfirmer.**
- `GET /crypto/events` ne renvoie que les événements déjà franchis.

## Temps réel
Architecture seulement (`services/crypto/realtime.ts` : interface fournisseur, cache à durée courte, chaîne de repli, refus d'un prix périmé). Non activé : dépend de la Phase 5. `GET /crypto/state` l'indique (`modes`).

## À tester chez moi
- [ ] Avancer de 3 mois depuis début 2020 : « Journal du marché » contient « Jeudi noir » (12 mars 2020), aucun événement de 2022.
- [ ] Vendre avec une belle plus-value : le message d'exécution montre un impôt > 0 ; vendre à perte : impôt 0.
- [ ] « Mon portefeuille » → échanger A contre B : « Aucun impôt », frais de quelques 🪙 seulement.
- [ ] Admin → statistiques des pièces : `fee_brokerage` / `tax_capital_gains` du domaine `crypto_market` dans les puits.
