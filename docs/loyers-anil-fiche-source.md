# Fiche de source : « Carte des loyers » (ANIL)

**À lire par Andreja sur la page officielle AVANT tout import** (règle du 5 octobre 2026). Mon environnement ne peut pas ouvrir les pages (accès réseau bloqué, testé le 5 octobre 2026 : `data.gouv.fr` et `insee.fr`) : tout ce qui suit vient de **résumés de recherche** et reste **à confirmer** ; **la liste numérotée des lignes à relire toi-même est dans `docs/loyers-irl-fiche-source.md` (lignes 1 à 10)** ; chaque doute est listé ici et dans le rapport.

| À vérifier sur la page du jeu de données | Ce que disent mes sources (non confirmé) | Doute |
|---|---|---|
| Page à lire (millésime 2025) | [data.gouv.fr, « Carte des loyers » : indicateurs de loyers d'annonce par commune en 2025](https://www.data.gouv.fr/datasets/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2025) ; page du ministère : [ecologie.gouv.fr/politiques-publiques/carte-loyers](https://www.ecologie.gouv.fr/politiques-publiques/carte-loyers) | Les pages des millésimes **2022, 2023 et 2024** n'ont pas été vues : leurs adresses sont à trouver sur data.gouv.fr (même producteur) |
| **Licence** | Licence Ouverte 2.0 (Etalab), réutilisation commerciale permise avec attribution | **À confirmer sur la page** (champ « licence »). Les annonces d'origine appartiennent à SeLoger et leboncoin : vérifier qu'aucune mention ne limite l'usage commercial des indicateurs |
| **Attribution** | « ANIL estimations, based on Groupe SeLoger data » (les millésimes récents citent aussi leboncoin) | **Formule exacte à copier depuis la page** ; elle est dans `RENT_ATTRIBUTION` (`backend/src/config/rentMarketRules.ts`), à corriger si besoin |
| **Date / millésime** | Biens mis en location au **3e trimestre 2025** ; mise à jour du fichier le 11 décembre 2025 | Confirmer le trimestre de chaque millésime : la règle « aucun futur » repose sur le **30 septembre** (`rentSnapshotDate`) |
| **Fichiers** | Quatre séries : appartements, T1-T2, T3 et plus, maisons ; fichiers nommés « pred-app / app12 / app3 / mai … » | **Noms et colonnes à confirmer** : colonnes supposées `INSEE_C`, `LIBGEO`, `loypredm2`, `lwr.IPm2`, `upr.IPm2`, `TYPPRED`, `nbobs_com`, `nbobs_mail`. Le script **refuse** le fichier et **affiche les colonnes trouvées** si elles diffèrent : rien n'est deviné |
| **Géographie** | Commune ; Paris, Lyon et Marseille par arrondissement (75101 à 75120, 69381 à 69389, 13201 à 13216) | À confirmer. Si les arrondissements manquent, le script le signale (« sans loyer ») : **aucune rentabilité affichée** pour eux |
| **Nature** | Loyer d'**annonce**, **charges comprises**, logements **non meublés** ; fourchette (intervalle de prédiction) ; estimation « commune » ou « maille » (groupe de communes voisines) | À confirmer la définition de la fourchette |
| Jeu dérivé « millésime 2026 » (rendement par commune, tiers) | produit par un tiers (méthode « terralyse »), prix DVF + loyers | **Non utilisé** : licence et fiabilité non vérifiées |

## Procédure (rien n'est téléchargé par le jeu)
1. Lire la page (tableau ci-dessus), noter tout écart.
2. Télécharger **toi-même** les quatre fichiers d'un millésime dans `backend/data/loyers-brut/AAAA/` (dossier ignoré par git).
3. `npm --prefix backend run immo:import-loyers -- --vintage AAAA --dir backend/data/loyers-brut/AAAA --check` : rapport de couverture par ville, séries non fournies, communes sans loyer. Puis sans `--check` pour écrire `backend/data/loyers-anil-AAAA.json`.
4. `npm --prefix backend run immo:load-loyers -- --file backend/data/loyers-anil-AAAA.json` (simulation), puis `-- --apply` sur la copie de test seulement.
5. Un fichier = un millésime ; répéter pour chaque année (2022 à 2025). Chaque valeur n'est visible qu'à partir du **30 septembre** de son année.

## Règles du jeu (décidées par Andreja, 5 octobre 2026)
- **Un loyer par commune (ou arrondissement) et par série**, un instantané par an ; toutes les zones (codes postaux) d'une commune partagent son loyer.
- **Aucun loyer inventé** : si une commune n'a pas de loyer ANIL pour la série, **aucune rentabilité n'est affichée** (`realGrossYield` renvoie `null`).
- Le loyer est un **loyer d'annonce charges comprises** : le rendement est un rendement **brut indicatif**.
- **Parking** : aucune série, donc aucun loyer ANIL ; reste « VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER ».
- **Avant le premier millésime** (décision d'Andreja, 5 octobre 2026) : le premier millésime (2022) est utilisable **dès janvier 2022**, avec la mention « Estimation ANIL 2022, 3e trimestre (approximation avant cette date) » (`rentApproximationText`). Avant janvier du premier millésime : aucun loyer, donc aucune rentabilité. Quand l'IRL réel sera importé (PR 3), le loyer d'avant le 3e trimestre est **recalé sur l'évolution réelle de l'IRL** entre la date de jeu et le 3e trimestre 2022, et la mention le dit.
- **Entre deux millésimes** : loyer constant (un seul changement par an, au 30 septembre), jamais de valeur inventée ni interpolée.
- **Pas encore branché** : `RENT_MARKET_ENABLED = false`. Le catalogue fictif reste utilisé tant que les annonces réelles (prix DVF) ne sont pas branchées.
