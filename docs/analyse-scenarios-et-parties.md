# Scénarios réels et parties multiples : analyse (rien n'est codé)

*4 octobre 2026. Idée d'Andreja : pour chaque domaine (Bourse, Crypto, Immobilier), plusieurs scénarios tirés de faits réels, en mode Histoire seulement ; choisir un scénario met l'horloge à la date du scénario. Ce document est complémentaire du travail sur l'Immobilier réel (`docs/immobilier-reel-preparation.md`, `docs/analyse-immobilier-reel-et-horloge.md`) et n'y touche pas. Les étiquettes : **[sûr]** = vérifié dans le code du dépôt, **[connu]** = fait que je connais mais que je n'ai pas revérifié ici (pas d'accès aux sources), **[à vérifier]** = chiffre ou date à contrôler avant de l'écrire dans le jeu.*

## En trois phrases
1. Pour qu'un scénario mette l'horloge à une date **sans jamais revenir en arrière**, il faut qu'il démarre une **nouvelle partie** : horloge, pièces, portefeuille, prêts et classement propres. Aujourd'hui tout est rattaché au **joueur** (un seul jeu par joueur) : le gros du travail est d'avoir des **parties** et d'y rattacher les données de jeu.
2. **Deux constats changent la demande** : (a) la **Bourse n'a pas de cours réels** dans le dépôt (séries annuelles « plausibles », écrites noir sur blanc comme *pas des cours réels*) ; seule la **Crypto** a de vrais cours journaliers ; (b) l'**Immobilier réel** n'a de prix que depuis janvier 2021, avec des médianes à fenêtre pleine seulement à partir de décembre 2021, donc des scénarios immobiliers **à partir de 2022**.
3. Je recommande : **une partie = le propriétaire des données de jeu**, la première partie de chaque joueur gardant **le même identifiant que le joueur** (les comptes existants ne bougent pas), des **fiches de scénario dans des fichiers du dépôt** (relues, testées), et un classement **par scénario et par date de jeu**. Chantier estimé à **environ 40 jours (± 30 %)**, en une douzaine de petites PR.

## 1. Les parties

### Ce qui existe aujourd'hui **[sûr]**
Toutes les données de jeu sont rattachées au joueur : `sim_clocks` (une horloge par joueur et par mode), `investcoins_balance` et le registre (un portefeuille de pièces par joueur), `virtual_portfolios` (Bourse), `crypto_accounts` (une partie par joueur), `re_games` (`user_id UNIQUE`), `bank_loans` et `bank_credit_balances`, `wealth_snapshots`, `leaderboard_rankings` (déjà une colonne `mode`). À côté, des données qui sont vraiment **du joueur** : `xp_events` et `user_badges` (uniques par joueur), `played_periods`, abonnement, amis, éducation.

### Proposition
Une **partie** (`games`) a : un identifiant, le joueur, le **scénario** (et sa version), le **domaine**, l'état (en cours, terminée, abandonnée), les dates de création et de dernière partie jouée. Elle **possède** l'horloge, le portefeuille de pièces, les positions, les prêts, les instantanés de patrimoine et la ligne de classement.

Trois façons de le faire :

| | **A. Identifiant de partie à la place de l'identifiant du joueur (recommandée)** | **B. Colonne `game_id` ajoutée partout** | **C. Un seul état, archivé et restauré à chaque changement de partie** |
|---|---|---|---|
| Principe | Les tables de jeu gardent leur forme ; la clé « propriétaire » devient l'id de la partie. **La première partie reprend l'id du joueur** : aucune donnée n'est réécrite | On ajoute `game_id` à chaque table et à chaque requête, en gardant `user_id` | On copie l'état dans une archive quand on change de partie |
| Données existantes | Rien à déplacer (la partie n°1 a l'id du joueur) | Remplissage de `game_id` sur des millions de lignes | Compliqué |
| Risque | Les clés étrangères vers `users` deviennent des clés vers `games` ; tous les services qui reçoivent `userId` reçoivent `gameId` | Oublier un `game_id` dans une requête = fuite entre parties | Fragile, lent, difficile à tester |
| Ce que ça demande | Un changement de nom et de contrainte, très large mais mécanique, table par table | Très large aussi | À éviter |

Règles communes : la partie **active** est choisie **côté serveur** (jamais fournie librement par le navigateur : on vérifie que la partie appartient au joueur, comme les autres contrôles anti-accès à la donnée d'autrui) ; l'horloge d'une partie **ne recule jamais** ; une nouvelle partie démarre avec l'horloge, les pièces et le portefeuille du scénario.

### Ce que ça change
- **Base** : table `games` ; les tables « de jeu » pointent vers la partie ; les tables « de joueur » (XP, badges, abonnement, amis) restent au joueur. Suppression de compte : les parties partent avec le joueur (même logique que le reste).
- **Pièces** : un portefeuille **par partie**, donc le total des pièces du jeu se compte **partie par partie** (statistiques et alertes de dérive à adapter). **Aucun transfert entre parties** (même règle que « pas d'échange entre joueurs ») : commencer une partie ne donne jamais de pièces gagnées dans une autre.
- **Récompenses en pièces** (récompense du jour, bonus de premiers pas, bonus du premier investissement) : le quota reste **par joueur** (sinon on les multiplierait en changeant de partie) ; le crédit va dans la partie active.
- **Classements** : on compare **le même scénario à la même date de jeu** (classements par scénario, avec des relevés à date fixe : fin de trimestre, fin de scénario). **Une seule partie compte** par joueur et par scénario (la première) ; les suivantes sont des parties « libres », non classées : sinon on rejoue jusqu'à tomber sur un bon résultat. *À valider.*
- **XP et badges** : restent au **joueur** et ne peuvent pas être gagnés deux fois en recommençant. Les événements d'XP propres à un scénario portent le scénario dans leur clé (« terminé » une seule fois par joueur et par scénario). Les **étoiles** appartiennent à la partie ; le profil affiche la meilleure par scénario.
- **Prêts** : propres à la partie, rien ne passe d'une partie à l'autre. Le temps n'avance que quand le joueur le décide : une partie en pause n'accumule rien. À la fin du scénario, règlement final (patrimoine net, dettes déduites) puis la partie passe en « terminée ».
- **Comptes existants** : une migration (comme M1 : simulation par défaut, `--apply` avec sauvegarde) crée la **partie n°1** de chaque joueur avec **son id**, de scénario « libre » (multi-domaines, départ = sa date de départ actuelle). Rien n'est perdu ; les classements existants restent sous la catégorie « libre » ; `played_periods` (déblocages du bac à sable) est inchangé.
- **Limites par plan** *(décision)* : je propose plan gratuit = une partie en cours à la fois (dans le domaine gratuit), Pro = plusieurs parties.

## 2. Fiche d'un scénario

**Où la stocker** : dans des **fichiers du dépôt** (`backend/src/config/scenarios/`, un par scénario), pas en base. Ils sont relus en PR, versionnés, et un test automatique vérifie chacun (dates dans la plage des données du domaine, aucun fait postérieur à la date de départ dans le texte d'introduction, chaque fait a une source). La base ne garde que `scenario_id` et `scenario_version` sur la partie. Si on veut un jour les éditer sans déployer, on pourra les charger en base : le format reste le même.

**Format proposé** (extrait, Crypto) :

```
id: crypto-terra-2022
domain: crypto            # un domaine par scénario ; « libre » pour les comptes existants
title: Terra, FTX : l'année où tout s'effondre
startDate: 2022-01-01
endDate: 2023-06-30       # au plus tard le dernier jour de données
difficulty: 3             # étoiles de difficulté, 1 à 3
startingCapital: 10000    # InvestCoins ; valeur de jeu
story: >                  # le contexte JUSQU'À startDate seulement (pas de spoiler)
  Début 2022, les cryptos viennent de passer leur sommet de novembre 2021. …
objectives:               # étoiles de réussite, calculées par le serveur à partir des relevés de patrimoine
  - { stars: 1, text: "Termine le scénario", rule: finish }
  - { stars: 2, text: "Finis avec plus de pièces qu'au départ", rule: net_worth_gte_start }
  - { stars: 3, text: "Ne perds jamais plus de la moitié de ton patrimoine", rule: max_drawdown_lte, value: 0.5 }
assets: [BTC, ETH, LUNA, ...]   # cours à l'appui (renvoie au catalogue de données)
events:                         # journal : un fait n'apparaît qu'à sa date
  - { date: 2022-05-09, text: "…", source: "…", certainty: connu }
sources: [ … ]                  # références publiques
```

Règles : français simple, **aucun spoiler** (les événements arrivent dans le journal à leur date), objectifs **sans pression** (pas de compte à rebours, pas de culpabilité), capital et seuils marqués **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER** et ajoutés à `docs/PARAMETRES-A-RECONFIRMER.md`, rubrique « cours à l'appui » qui indique la source des données (et dit clairement « simulé » quand ce n'est pas un cours réel).

## 3. Scénarios réels possibles

### Ce que les données permettent aujourd'hui
| Domaine | Données présentes | Verdict |
|---|---|---|
| **Crypto** | **Vrais** cours journaliers importés (CryptoCompare), départs déjà proposés : 2014, 2017, 2020, 2021, 2022 **[sûr]** (le code les propose) ; plage exacte à confirmer par le rapport d'import sur le serveur | **Faisable maintenant** |
| **Bourse** | Séries **annuelles « plausibles », pas des cours réels** (en-tête de `stockPrices.ts`) **[sûr]**. Aucun jeu de cours réels journaliers ou mensuels | **Pas faisable honnêtement** : un scénario « fait réel » avec de faux cours serait trompeur. Il faut d'abord **choisir une source de cours réels** (licence à vérifier, **aucune dépense sans ton accord**) |
| **Immobilier** | DVF officielles **2021 à 2025** **[sûr]** (rapport réel d'Andreja) ; médianes à fenêtre de 12 mois pleine à partir de décembre 2021, donc scénarios **de 2022 à fin des données** ; non activé (décision horloge en attente) | **Faisable après activation** (voir plus bas) |

### Crypto (faisables dès que la partie par scénario existe)
| Scénario | Début → fin | Faits à l'appui |
|---|---|---|
| Après la première bulle | 2014-01-01 → 2015-12-31 | Faillite de Mt. Gox en février 2014 **[connu]** ; sommet de décembre 2013 autour de 1 100 dollars **[à vérifier]** |
| La bulle des ICO | 2017-01-01 → 2018-12-31 | Sommet proche de 20 000 dollars en décembre 2017, puis chute d'environ 80 % en 2018 **[connu, chiffres à vérifier]** |
| Le krach du Covid | 2020-01-01 → 2021-12-31 | Chute brutale du 12 mars 2020 **[connu]** ; halving du 11 mai 2020 **[connu]** ; sommet de novembre 2021 **[connu]** |
| Terra, FTX | 2022-01-01 → 2023-06-30 | Effondrement de Terra/UST en mai 2022 **[connu]** ; faillite de FTX le 11 novembre 2022 **[connu]** ; « The Merge » d'Ethereum le 15 septembre 2022 **[connu]** |
| Le retour des ETF | 2023-07-01 → 2025-… | ETF bitcoin au comptant approuvés aux États-Unis le 10 janvier 2024 **[connu]** ; halving d'avril 2024 **[connu]** ; fin des données **[à vérifier]** |

### Bourse (à faire seulement avec de vrais cours : source à choisir)
| Scénario possible | Début → fin | Faits **[connu]**, dates à revérifier |
|---|---|---|
| Brexit et pétrole bas | 2015-07-01 → 2016-12-31 | Référendum britannique du 23 juin 2016 |
| Le krach du Covid et le rebond | 2020-01-01 → 2021-12-31 | Chute de février-mars 2020, rebond massif ensuite |
| La guerre et la remontée des taux | 2022-01-01 → 2023-06-30 | Invasion de l'Ukraine le 24 février 2022 ; première hausse des taux de la Fed en mars 2022 et de la BCE en juillet 2022 ; faillite de Silicon Valley Bank en mars 2023 |
| La vague de l'intelligence artificielle | 2023-01-01 → 2025-… | Hausse portée par quelques grandes valeurs **[à vérifier]** |

### Immobilier (à partir de 2022, après la décision horloge)
| Scénario possible | Début → fin | Faits |
|---|---|---|
| Le crédit se resserre | 2022-01-01 → 2023-12-31 | Règles du Haut Conseil de stabilité financière (35 % d'endettement, 25 ans) appliquées strictement dès janvier 2022 **[connu, à vérifier]** ; hausse des taux de crédit de l'ordre de 1 % à plus de 4 % **[à vérifier : Observatoire Crédit Logement ou Banque de France, licence à contrôler]** |
| Le retournement du marché | 2023-01-01 → 2024-12-31 | Baisse des ventes et recul des prix dans certaines villes : **à mesurer avec nos propres médianes DVF** (le rapport donne la réponse, donc ce fait deviendra **[sûr]** une fois mesuré) |
| Les passoires thermiques | 2024-01-01 → 2025-… | Interdiction de louer les logements classés G à partir du 1er janvier 2025 **[connu]** ; F en 2028 et E en 2034 **[connu]** |

Remarque : les scénarios Immobilier ayant chacun leurs dates, **le problème « l'Immobilier ouvre en 2021 mais l'horloge part de 2014 » disparaît** : l'Immobilier n'existe que dans des scénarios à partir de 2022, ce qui correspond à l'option B/C de l'analyse horloge, sans règle d'exception sur les autres domaines. Je ne décide pas à ta place : c'est une conséquence à valider avec ton choix.

## 4. Écran de choix et changement de partie
Un seul parcours, qui prolonge l'écran de choix du mode (idée 41) : **Mode** (Histoire disponible ; En ligne et Bac à sable affichés « pas encore disponibles », règles d'accès déjà décidées) → **Domaine** → **Scénarios** → confirmation.
- **Carte de scénario** : titre, période et durée, étoiles de difficulté, capital de départ, deux lignes d'histoire, bouton « Commencer », ou « Reprendre » (avec la date de jeu atteinte) si une partie existe déjà. Les scénarios Immobilier ou Bourse non disponibles sont grisés avec la raison.
- **Confirmation** claire : « Une nouvelle partie commence au {date}. Tes autres parties restent comme tu les as laissées. » Aucun coût en pièces.
- **Changer de partie à tout moment** : un sélecteur permanent dans la barre du haut (« Partie : Crypto, Terra 2022 ▾ ») et une page « Mes parties » (date de jeu, patrimoine, état, dernière partie jouée ; reprendre, terminer, archiver). Sur 390 px : feuille en bas de l'écran, comme les autres fenêtres. Le bandeau des prix, le tableau de bord et les classements suivent **la partie active** et affichent sa date, pour qu'on ne confonde jamais deux parties.
- Accessibilité : clavier complet, focus géré, pas d'information portée par la couleur seule (comme la visite guidée).

## 5. Taille du chantier et petites PR
Estimation globale : **environ 40 jours (± 30 %)**, risque **élevé** sur le point 1 (refonte large de la clé « propriétaire »), moyen ensuite.

| # | Petite PR | Jours | Notes |
|---|---|---|---|
| 0 | Décisions (ci-dessous) | 1 | |
| 1 | Table `games`, partie active côté serveur, un seul `game` par joueur (aucun changement visible) | 3 | Fondation, tests anti-accès à la donnée d'autrui |
| 2a-2d | Rattacher les données de jeu à la partie, famille par famille : (a) pièces, registre, horloge ; (b) Bourse ; (c) Crypto ; (d) Immobilier et Banque | 10 | Une PR par famille, chacune verte seule |
| 2e | Instantanés de patrimoine et classements par partie | 3 | |
| 3 | Migration M2 des comptes existants (simulation, `--apply` avec sauvegarde) | 2 | Même méthode que M1 |
| 4 | Fiches de scénario (format, validation, tests, journal) + 2 scénarios Crypto pilotes | 4 | |
| 5 | API des parties (liste, créer, reprendre, activer, archiver) et limites par plan | 3 | |
| 6 | Écrans : choix du scénario, sélecteur de partie, « Mes parties » (390 px) | 5 | |
| 7 | Classements par scénario et date, étoiles, XP et badges par joueur | 5 | |
| 8 | Scénarios Crypto restants (3 à 4) | 2 | |
| 9 | Scénarios Immobilier (après activation DVF) | 2 | Dépend du travail Immobilier réel |
| 10 | Scénarios Bourse | ? | **Bloqué** tant qu'aucune source de cours réels n'est choisie |
| 11 | Tests navigateur, documentation, checklists | 3 | |

**Risques** : refonte large mais mécanique (tout service qui reçoit `userId`) ; anti-accès à la donnée d'autrui à tester partout ; invariants du registre de pièces (totaux par partie) ; migration des comptes existants ; limite de requêtes de l'API (les écrans de parties ne doivent pas multiplier les appels).

## 6. À décider avant tout code
1. **Limites par plan** : gratuit = une partie en cours, Pro = plusieurs ? (recommandé)
2. **Classement** : seule la **première** partie d'un scénario est classée, les suivantes « libres » ? (recommandé)
3. **XP et badges** au joueur, jamais regagnés en recommençant ? (recommandé)
4. **Récompenses en pièces** : quota par joueur, crédit dans la partie active ? (recommandé)
5. **Bourse** : veux-tu qu'on cherche une source de **cours réels** (je te présenterai les options et les licences, sans rien dépenser) ou qu'on garde la Bourse en simulation, clairement étiquetée, sans scénarios « faits réels » ?
6. **Comptes existants** : ta partie actuelle devient la « partie libre » n°1 (aucune perte) ? (recommandé)
7. **Immobilier** : confirmer que ses scénarios commencent en 2022 (et que la décision horloge s'en trouve réglée).
