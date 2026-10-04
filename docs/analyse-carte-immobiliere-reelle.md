# Carte immobilière avec de vraies villes (idée 21) : analyse, rien n'est codé

*4 octobre 2026. Document court pour décider. Aucun code, aucune dépense, aucun service payant.*

**Note sur les sources.** Le réseau de cette session est limité : j'ai pu faire des recherches web (résumés), pas ouvrir les pages officielles. Chaque affirmation est marquée **[sûr]** (confirmée par ces recherches), **[connu]** (je la connais mais je ne l'ai pas revérifiée ici) ou **[à vérifier]**. Rien de tout cela ne doit être publié sans relecture des textes de licence.

## En deux phrases
Le code est déjà prévu pour ça : toutes les données immobilières passent par **une seule porte** (`RealEstateDataSource`, `REAL_ESTATE_SOURCE=dvf` est même annoncé dans le code) et chaque partie mémorise sa source. Les vraies transactions **DVF** (licence ouverte, depuis 2014) tombent pile sur la plage de l'horloge unique (départs 2014 à 2022), et une vraie carte coûte **0 €** avec des briques libres ; le vrai travail est la donnée (nettoyage, loyers, charges) et l'équilibrage de la banque, pas la carte.

## 1. La carte : quatre options (toutes gratuites)
Aujourd'hui : carte **SVG maison**, villes inventées (`app/lib/mapGeo.js`), aucune dépendance externe.

| Option | Principe | Licence / coût | Hébergement | Points d'attention |
|---|---|---|---|---|
| **A. MapLibre GL JS + OpenFreeMap** (recommandée pour démarrer) | Bibliothèque vectorielle + fond public | MapLibre : BSD-3 **[connu]** ; OpenFreeMap : gratuit, sans clé, sans limite de vues, code MIT, attribution « OpenFreeMap © OpenMapTiles, données OpenStreetMap » **[sûr]** | Chez un tiers (auto-hébergeable plus tard) | Dépend d'un service bénévole : prévoir la bascule vers B. Les requêtes de tuiles envoient l'adresse IP du joueur au tiers : à dire dans la politique de confidentialité |
| **B. MapLibre + tuiles auto-hébergées (Protomaps, fichier PMTiles)** | Un seul fichier de tuiles, servi par notre serveur (requêtes par plage d'octets) | Code BSD-3, design CC0, **données ODbL avec attribution OSM [sûr]** ; 0 € si on a l'espace disque (extrait France : de l'ordre de quelques Go **[à mesurer]**) | Notre serveur ou un stockage objet (le stockage objet peut être payant : **je demanderai avant**) | Aucune fuite d'IP, aucune dépendance ; mise à jour manuelle |
| **C. MapLibre + Plan IGN (Géoplateforme)** | Fond cartographique officiel français | Licence Ouverte 2.0, **sans clé** depuis 2021 ; tuiles vectorielles consommables par MapLibre depuis 2025 **[sûr]** | IGN (service public) | France seulement (c'est notre cas) ; style à adapter ; dépendance à un service public |
| **D. SVG maison avec de vrais contours de communes** | On garde l'esprit « carte de jeu » : contours simplifiés (jeux de données ouverts d'Etalab / IGN), sans fond de carte | Licence Ouverte **[à vérifier pour le jeu exact]** ; 0 € | Notre site (fichiers statiques) | Aucun tiers, très léger, marche hors ligne ; moins « vraie carte » (pas de rues) |

**À éviter** : les tuiles publiques `tile.openstreetmap.org` : leur politique interdit l'usage intensif et la distribution d'une application qui les utilise, sans accord préalable **[sûr]**. Les fonds commerciaux (Mapbox, Google, MapTiler…) demandent une clé et un compte, potentiellement payants : **exclus sans ton accord**.

**Recommandation** : D en premier (rapide, sans tiers, déjà dans l'esprit du jeu), puis A ou C pour la vraie carte, avec B comme sortie de secours. Dans tous les cas : (1) la **liste reste le chemin principal** (une carte est peu accessible au clavier et au lecteur d'écran) ; (2) la politique de sécurité du site (`next.config.js`) devra autoriser l'adresse des tuiles ; (3) la bibliothèque pèse de l'ordre de 200 ko compressés **[à mesurer]** : à charger seulement sur la page Immobilier.

## 2. Villes de départ proposées (12)
Choisies pour couvrir des marchés très différents (cher/pas cher, tendu/détendu, étudiant, touristique). **Pas de Strasbourg, Metz ni Mulhouse** : l'Alsace-Moselle n'est pas dans le fichier DVF (régime du livre foncier) **[connu, à revérifier]**.

| Ville | Type de ville (jeu) | Pourquoi |
|---|---|---|
| Paris | métropole | Référence nationale ; 20 arrondissements = de vrais quartiers ; prix très élevés, zone tendue |
| Lyon | métropole | Marché dynamique, 9 arrondissements, bon équilibre prix/loyers |
| Marseille | métropole | Très grands écarts de prix entre arrondissements (16) : excellent pour apprendre le quartier |
| Bordeaux | grande | Forte hausse des prix sur 2014-2019 : scénario « boom » |
| Toulouse | grande | Croissance régulière, beaucoup d'étudiants |
| Nantes | grande | Marché tendu, hausse nette sur la période |
| Lille | grande | Étudiants, loyers encadrés dans la réalité (à traiter plus tard), prix moyens |
| Montpellier | grande | Attractivité, rendement locatif moyen |
| Nice | grande | Prix élevés, tourisme, résidences secondaires |
| Rennes | moyenne | Marché très tendu pour sa taille |
| Dijon | moyenne | Prix modérés, ville stable : bon terrain d'apprentissage |
| Saint-Étienne | petite | Prix très bas, rendement brut élevé mais risque de vacance : le contre-exemple pédagogique |

## 3. Vrais prix et loyers : sources
| Donnée | Source | Licence | Couverture | Sûr ? |
|---|---|---|---|---|
| **Prix de vente** (prix, surface, type, date, commune, coordonnées de la parcelle) | **DVF géolocalisées** (DGFiP via data.gouv.fr) | Licence Ouverte 2.0 **[sûr]** | Depuis 2014, 18,1 millions de transactions cumulées, mise à jour semestrielle **[sûr]** ; hors Alsace-Moselle et Mayotte **[connu]** | Oui pour la source ; **à nettoyer** : lots multiples, valeurs aberrantes, ventes en l'état futur |
| **Loyers** | « Carte des loyers » (Ministère / ANIL) : loyer d'annonce au m² par commune | Licence Ouverte 2.0 **[sûr]** | Toute la France sauf Mayotte ; versions **2018, 2022, 2023, 2024, 2025** **[sûr]** : pas de série continue avant 2022 | Oui ; les années manquantes seront **estimées** (indexation IRL, que le code connaît déjà) et marquées comme telles |
| **Évolution des prix** (lissage, villes peu actives) | Indices Notaires-Insee (trimestriels, par région et taille d'agglomération) | **[à vérifier]** (données INSEE, en principe réutilisables) | Séries longues | Utile en complément, pas par ville |
| **Taxe foncière** (taux par commune) | Données ouvertes de la DGFiP sur les taux locaux | **[à vérifier]** | Par commune | Pour remplacer les charges fictives (voir 4) |
| **Zones tendues** | Liste officielle (décret de 2013, étendue ensuite) | Texte officiel | Par commune | **[à vérifier]** : le code a déjà `tenseZone` |
| DPE, état du bien, travaux | Aucune source ouverte fiable liée à une transaction DVF | , | , | **Non** : ces champs resteront **générés** (comme aujourd'hui) et marqués « simulé » |

Ce qui est **sûr** : on peut construire des prix de marché par commune et par mois, et des loyers par commune, avec des licences ouvertes. Ce qui **ne l'est pas** : l'état, le DPE, les charges de copropriété et les travaux d'un bien réel, que le jeu continuera d'inventer. Le site devra donc dire : « prix réels historiques (DVF), caractéristiques complétées par le jeu ».

## 4. Accord avec l'horloge unique et les règles bancaires
**Horloge unique.** DVF commence en 2014 = premier départ de l'horloge : plage commune parfaite. À la date `D` du joueur :
- seules les transactions **datées au plus tard `D`** sont utilisées, jamais plus tard (test automatique « aucune fuite du futur », comme pour la Crypto) ;
- le prix de marché d'une ville = **médiane glissante sur les 12 derniers mois** (calculée à l'avance par un script, stockée dans une table mensuelle) avec un nombre minimum de ventes, sinon repli sur le département ;
- une annonce = une **vraie vente récente** (30 derniers jours avant `D`), présentée au prix réel ; l'interface actuelle de la source est **annuelle** (`getMarket(ville, année)`) : il faudra la passer **au mois**, ce qui s'accorde avec le règlement mensuel déjà synchronisé sur l'horloge ;
- la valeur d'un bien déjà acheté suit l'indice de sa commune (le code sait déjà faire : `valueFromMarket`) : il faut lisser les petites communes pour éviter des sauts irréalistes.

**Banque et économie.** Les règles bancaires (apport, taux d'endettement, plafond, assurance) restent identiques : elles travaillent en euros. Mais **les prix réels changent tout** : un petit appartement à Paris dépasse 300 000 euros, alors que le capital de départ est de 10 000 InvestCoins. Conséquences à traiter **avant** d'ouvrir :
- simulations « quelle part des annonces est finançable pour chaque profil (étudiant, salarié, cadre) » ; décider si on garde l'apport et les frais réels (frais de notaire) tels quels ;
- les villes chères seront **hors de portée au début** (réaliste, mais à expliquer) ; prévoir des filtres « accessibles » et mettre en avant parkings, studios et villes moins chères ;
- **charges réelles** : à remplacer par un modèle selon la valeur du bien, la surface et la ville (taxe foncière communale, copropriété estimée) : c'est la note laissée dans `docs/analyse-catalogue-immobilier.md` ; toute valeur non sourcée y portera **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER** ;
- les parties Immobilier existantes (catalogue fictif) : la colonne `data_source` existe ; le plus simple est de les garder sur le catalogue fictif ou de les liquider à valeur conservée comme la migration M1 (décision à prendre à ce moment-là).

## 5. Taille du chantier et étapes
Estimation globale : **environ 27 jours de travail (± 30 %)**, risque moyen à élevé (donnée + équilibrage). Chaque étape = petite PR avec sa checklist.

| # | Étape | Jours | Notes |
|---|---|---|---|
| 1 | Décisions (fond de carte, villes), licences et mentions, politique de sécurité du site, prototype carte dans la démo du design system | 2 | Aucun effet pour les joueurs |
| 2 | Pipeline de données **hors ligne** (`npm run immo:import-dvf`) : téléchargement, nettoyage, médianes mensuelles, contrôle qualité, tests | 5 | Les 12 villes : quelques millions de lignes, résultat de quelques Mo |
| 3 | Source `dvf` : villes, quartiers (arrondissements), marché mensuel, annonces = ventes récentes, expertise générée, **test de non-fuite du futur** | 6 | Le reste du jeu ne change pas |
| 4 | Loyers (Carte des loyers + indexation IRL), taxe foncière communale, zones tendues | 3 | Estimations marquées |
| 5 | Vraie carte : couche des annonces, quartiers, liste accessible, mobile 390 px | 5 | Après le choix du fond de carte |
| 6 | Équilibrage banque / finançabilité par profil, migration des parties existantes | 4 | Simulations d'abord |
| 7 | Tests navigateur, documentation, attributions (OSM, IGN, DVF, ANIL), bandeau « prix réels historiques, caractéristiques simulées » | 2 | |

## 6. À décider (rien d'urgent)
1. Fond de carte : D puis A, ou directement C (IGN) ? (Recommandé : D puis A.)
2. Les 12 villes proposées te conviennent-elles ?
3. Les parties Immobilier actuelles : rester sur le catalogue fictif, ou être liquidées à valeur conservée ?
4. Si un hébergement payant (stockage de tuiles, CDN) devenait utile un jour : **je te le demanderai avant tout engagement** ; rien n'est prévu aujourd'hui.

Sources consultées (résumés de recherche) : [DVF géolocalisées](https://www.data.gouv.fr/datasets/demandes-de-valeurs-foncieres-geolocalisees) · [Carte des loyers 2025](https://www.data.gouv.fr/datasets/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2025) · [Plan IGN](https://www.data.gouv.fr/datasets/plan-ign) · [OpenFreeMap](https://openfreemap.org/) · [Protomaps](https://github.com/protomaps/basemaps) · [Politique des tuiles OSM](https://operations.osmfoundation.org/policies/tiles/) · [Indices Notaires-Insee](https://www.insee.fr/fr/statistiques/8669035)
