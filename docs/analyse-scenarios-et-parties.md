# Scénarios réels et parties multiples : analyse (rien n'est codé)

*4 octobre 2026. Idée d'Andreja : pour chaque domaine (Bourse, Crypto, Immobilier), plusieurs scénarios tirés de faits réels, en mode Histoire seulement ; choisir un scénario met l'horloge à la date du scénario. Ce document est complémentaire du travail sur l'Immobilier réel (`docs/immobilier-reel-preparation.md`, `docs/analyse-immobilier-reel-et-horloge.md`) et n'y touche pas. Les étiquettes : **[sûr]** = vérifié dans le code du dépôt, **[connu]** = fait que je connais mais que je n'ai pas revérifié ici (pas d'accès aux sources), **[à vérifier]** = chiffre ou date à contrôler avant de l'écrire dans le jeu.*

> **Mise à jour du 4 octobre 2026 (soir) : la règle d'accès par plan est REMPLACÉE** (nouveau chapitre 2). Gratuit : tous les domaines, mais seulement le **premier scénario de chaque domaine, au niveau Normal** ; une partie active par domaine. Pro : tous les scénarios, tous les niveaux, plusieurs parties en parallèle. L'ancienne règle « un seul domaine gratuit au choix » est retirée (ce que ça change : chapitre 2.4). Les niveaux de difficulté viennent des **conditions de départ réelles** du scénario, jamais de règles truquées (chapitre 2.3).

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
- **Limites par plan** : voir le chapitre 2 (gratuit : une partie active par domaine ; Pro : plusieurs en parallèle).

## 2. Accès par plan et niveaux de difficulté

### 2.1 La règle (remplace l'ancienne)
| | **Compte gratuit** | **Plan Pro** |
|---|---|---|
| Domaines | **Tous** : Bourse, Crypto, Immobilier | Tous |
| Scénarios | Le **premier scénario de chaque domaine** seulement | **Tous** |
| Niveaux | **Normal** seulement | **Tous les niveaux** |
| Parties | **Une partie active par domaine** ; on peut la **terminer** pour recommencer | **Plusieurs parties en parallèle** (même scénario compris) |

Le Pro garde ses autres avantages. Le « premier scénario » n'est **pas** « le premier de la liste » (un simple changement d'ordre ouvrirait ou fermerait des accès sans que personne s'en aperçoive) : chaque fiche porte un **drapeau explicite** `freeScenario: true`, et un test automatique vérifie qu'il y a **exactement un** scénario gratuit par domaine, au niveau Normal.

### 2.2 Appliqué côté serveur, avec une explication claire
- Une fonction serveur unique décide : *(plan du joueur, scénario, niveau, parties déjà actives dans ce domaine)* → **autorisé**, ou **refusé avec une raison structurée** (`scénario réservé au Pro`, `niveau réservé au Pro`, `une partie est déjà active dans ce domaine`). Le plan se lit côté serveur, comme aujourd'hui (abonnement ou passage Pro manuel pour les testeurs) : rien ne dépend d'une valeur fournie par le navigateur.
- Les listes renvoyées à l'écran contiennent déjà, pour chaque scénario et chaque niveau, `access: { allowed, reason }` : l'écran affiche le cadenas **avant** le clic, avec la **même** décision que celle qui sera prise à la création (une seule source de vérité).
- **Un compte gratuit qui clique sur un scénario ou un niveau Pro ne voit pas une erreur** : une carte explicative (« Ce scénario fait partie du plan Pro. Tu peux jouer gratuitement le scénario X au niveau Normal dans ce domaine. ») avec la liste de ce que le Pro ouvre et un bouton vers le plan Pro. Même un appel direct à l'API reçoit la même réponse structurée (code 403 avec message en français simple et lien vers le plan), jamais une page d'erreur technique.
- **Jamais piéger quelqu'un** (comme aujourd'hui pour les positions) : si un abonnement Pro se termine, les parties déjà commencées (scénarios ou niveaux Pro, ou plusieurs parties dans un domaine) **restent jouables** ; ce sont seulement les **nouvelles** parties qui suivent la règle gratuite. Les parties de l'état « terminée » ou « abandonnée » gardent leurs étoiles.

### 2.3 Niveaux de difficulté : des conditions réelles, jamais des règles truquées
**Principe.** Les règles de la plateforme sont **les mêmes à tous les niveaux** : frais, écarts d'achat et de vente, glissement de prix, taux de référence de l'époque, règles de la banque (plafond d'emprunt, seuils d'appel de marge), cours et événements réels. Rendre un niveau « plus dur » en durcissant ces règles serait de la triche envers le joueur. Un niveau change donc seulement **d'où l'on part**, comme dans la vraie vie.

Je propose **trois niveaux** : **Normal** (gratuit), **Difficile**, **Expert** (Pro). *Variante possible : un quatrième niveau « Découverte » plus facile, gratuit ou non, à décider.*

| Paramètre qui varie | Normal | Difficile | Expert | Pourquoi c'est « réel » |
|---|---|---|---|---|
| **Capital de départ** (InvestCoins ; valeur de jeu) | 10 000 (valeur actuelle) | 5 000 | 2 500 | On ne commence pas tous avec la même épargne |
| **Situation de départ** | Aucune | Une **position héritée** imposée, concentrée sur un seul actif réel du scénario (la moitié du capital) | Position héritée **et** un petit prêt déjà en cours (mêmes taux et règles de la banque qu'ailleurs) | On hérite d'une situation, on ne repart pas de zéro |
| **Immobilier : profil de revenus** (existe déjà : étudiant, salarié, cadre) | Salarié | Étudiant | Étudiant, **sans apport de départ** | Les revenus décident de la capacité d'emprunt, par les règles réelles de la banque |
| **Objectif des étoiles** | ★ terminer ; ★★ finir au-dessus du capital de départ ; ★★★ ne jamais perdre plus de la moitié du patrimoine | ★★ finir à +10 % ; ★★★ battre le simple « acheter et garder » de l'actif de référence du scénario | ★★★ battre « acheter et garder » avec une perte maximale d'au plus 30 % | Un objectif plus exigeant, pas une règle différente |
| **Récompense** | XP et étoiles de base | XP et étoiles plus généreuses | Idem, plus généreuses encore | On récompense davantage, on ne triche pas |

**Ce qui ne varie JAMAIS entre niveaux** : frais et écarts (`cryptoMarketRules`, `tradingRules`), taux de référence et marges de la banque (`bankRules`), règles de l'immobilier (`immoRules`), cours, événements, nombre de jours entre deux avances du temps. Les événements réels du scénario arrivent **à tous les niveaux**, aux mêmes dates.

**Conséquences à traiter**
- Les **seuils de classement** (`RANKING_MIN_INVESTED` = 2 500 pièces, `RANKING_MIN_ACTIVE_DAYS`) deviennent une **part du capital du niveau** (sinon un capital de 2 500 ne pourrait jamais être « assez investi »).
- **Classement par niveau** : un classement par *(scénario, niveau)* ; on ne compare jamais Normal et Expert.
- **Bonus de départ du Pro** (`PRO_STARTING_BONUS` = 10 000, aujourd'hui « une seule fois ») : il est **incompatible** avec des classements équitables (un Pro avec 20 000 contre un gratuit avec 10 000 sur le même tableau). *Proposition* : le bonus ne s'applique plus aux parties de scénario (même capital pour tous, à niveau égal) et reste acquis aux comptes qui l'ont déjà eu ; la valeur du Pro devient « tous les scénarios, tous les niveaux, plusieurs parties ». *À décider.*
- Tous ces chiffres sont des **valeurs de jeu non sourcées** : marquées **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER** et ajoutées à `docs/PARAMETRES-A-RECONFIRMER.md`. Les niveaux se testent comme le reste (la partie Expert doit rester **gagnable** : simulation de contrôle avant ouverture).

### 2.4 Retirer proprement l'ancienne règle « un seul domaine gratuit »
**Ce qui existe aujourd'hui [sûr]** : colonnes `free_domain` et `free_domain_change_allowed` ; `getBuyAccess` (`FREE_DOMAIN_NOT_CHOSEN`, `DOMAIN_LOCKED`) appelé par le trading Bourse, le trading et les prêts Crypto, la banque (prêt personnel et sur portefeuille) et l'Immobilier ; la route de choix du domaine gratuit ; l'étape « Choisir ton domaine gratuit » de la liste de premiers pas ; les écrans (Bourse : carte « Choisis ton domaine gratuit » ; Immobilier : bandeau « tu peux consulter mais pas acheter » ; tableau de bord : cartes de domaine verrouillées) ; le texte de la page d'accueil et de la feuille de route (« un domaine gratuit au choix ») ; plusieurs tests qui créent des joueurs avec un domaine gratuit.

**Ce que ça change**
- **Comptes gratuits actuels** : **aucune perte**. Leur partie actuelle devient la **partie libre n°1** (voir chapitre 1). *Proposition* : elle **garde l'ancienne règle** (achats seulement dans leur domaine gratuit, ventes toujours possibles ailleurs) et **ne compte pas** dans les parties actives par domaine ; ils peuvent la terminer quand ils veulent. En plus, ils peuvent **commencer immédiatement** le premier scénario Normal des **deux autres domaines**, qui leur étaient fermés. Ceux qui n'avaient jamais choisi de domaine (achats impossibles jusqu'ici) peuvent enfin jouer partout.
- **Pages** : disparaissent la carte « Choisis ton domaine gratuit », le bandeau Immobilier « consulter mais pas acheter » et les cartes verrouillées du tableau de bord ; elles sont remplacées par les cartes de scénario (cadenas **Pro** sur ce qui est réservé) et la page « Mes parties ». La liste de premiers pas perd son étape « domaine gratuit » (les pièces déjà gagnées sont gardées ; le total de la liste change, donc les tests et textes qui le citent). Les textes qui promettent « un domaine gratuit » (accueil, plan, feuille de route) sont réécrits.
- **Classements** : aujourd'hui un joueur gratuit n'apparaît que dans son domaine. Demain il apparaît dans chacun des trois, sur le classement du **premier scénario Normal** (gratuits et Pro y sont ensemble, à capital égal). Les scénarios et niveaux Pro n'ont que des joueurs Pro. Les anciens classements restent sous la catégorie « libre ».
- **Code** : `getBuyAccess` (qui répond « ce domaine est-il ouvert à ce compte ? ») devient la fonction d'accès aux scénarios (chapitre 2.2) ; les colonnes `free_domain*` sont **ignorées d'abord, supprimées plus tard** (aucune suppression de colonne dans la même PR que le changement de règle). L'API garde sa forme le temps de la transition.

## 3. Fiche d'un scénario

**Où la stocker** : dans des **fichiers du dépôt** (`backend/src/config/scenarios/`, un par scénario), pas en base. Ils sont relus en PR, versionnés, et un test automatique vérifie chacun (dates dans la plage des données du domaine, aucun fait postérieur à la date de départ dans le texte d'introduction, chaque fait a une source). La base ne garde que `scenario_id` et `scenario_version` sur la partie. Si on veut un jour les éditer sans déployer, on pourra les charger en base : le format reste le même.

**Format proposé** (extrait, Crypto) :

```
id: crypto-terra-2022
domain: crypto            # un domaine par scénario ; « libre » pour les comptes existants
title: Terra, FTX : l'année où tout s'effondre
startDate: 2022-01-01
endDate: 2023-06-30       # au plus tard le dernier jour de données
freeScenario: true        # le scénario gratuit de son domaine (exactement un par domaine, vérifié par test)
levels:                   # trois niveaux, mêmes règles, conditions de départ différentes (chapitre 2.3)
  normal:    { startingCapital: 10000, startPosition: null, objectives: [ … ] }        # seul niveau gratuit
  difficile: { startingCapital: 5000,  startPosition: { asset: BTC, share: 0.5 }, objectives: [ … ] }
  expert:    { startingCapital: 2500,  startPosition: { asset: BTC, share: 0.5 }, startLoan: { coins: 500 }, objectives: [ … ] }
story: >                  # le contexte JUSQU'À startDate seulement (pas de spoiler)
  Début 2022, les cryptos viennent de passer leur sommet de novembre 2021. …
# étoiles de réussite par niveau, calculées par le serveur à partir des relevés de patrimoine, par exemple (niveau Normal) :
#   { stars: 1, text: "Termine le scénario", rule: finish }
#   { stars: 2, text: "Finis avec plus de pièces qu'au départ", rule: net_worth_gte_start }
#   { stars: 3, text: "Ne perds jamais plus de la moitié de ton patrimoine", rule: max_drawdown_lte, value: 0.5 }
assets: [BTC, ETH, LUNA, ...]   # cours à l'appui (renvoie au catalogue de données)
events:                         # journal : un fait n'apparaît qu'à sa date
  - { date: 2022-05-09, text: "…", source: "…", certainty: connu }
sources: [ … ]                  # références publiques
```

Règles : français simple, **aucun spoiler** (les événements arrivent dans le journal à leur date), objectifs **sans pression** (pas de compte à rebours, pas de culpabilité), capital et seuils marqués **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER** et ajoutés à `docs/PARAMETRES-A-RECONFIRMER.md`, rubrique « cours à l'appui » qui indique la source des données (et dit clairement « simulé » quand ce n'est pas un cours réel).

## 4. Scénarios réels possibles

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

## 5. Écran de choix et changement de partie
Un seul parcours, qui prolonge l'écran de choix du mode (idée 41) : **Mode** (Histoire disponible ; En ligne et Bac à sable affichés « pas encore disponibles », règles d'accès déjà décidées) → **Domaine** → **Scénarios** → confirmation.
- **Carte de scénario** : titre, période et durée, étoiles de difficulté, capital de départ, deux lignes d'histoire, bouton « Commencer », ou « Reprendre » (avec la date de jeu atteinte) si une partie existe déjà. Les scénarios Immobilier ou Bourse non disponibles sont grisés avec la raison.
- **Cadenas Pro** : un scénario ou un niveau réservé au Pro reste **visible et cliquable** ; le clic ouvre la carte d'explication du chapitre 2.2 (ce que le gratuit peut jouer dans ce domaine, ce que le Pro ouvre, bouton vers le plan), jamais un message d'erreur. Pour un compte gratuit qui a déjà une partie active dans le domaine : « Termine ta partie en cours pour en recommencer une, ou reprends-la » (avec les deux boutons), sans perte.
- **Confirmation** claire : « Une nouvelle partie commence au {date}. Tes autres parties restent comme tu les as laissées. » Aucun coût en pièces.
- **Changer de partie à tout moment** : un sélecteur permanent dans la barre du haut (« Partie : Crypto, Terra 2022 ▾ ») et une page « Mes parties » (date de jeu, niveau, patrimoine, état, dernière partie jouée ; reprendre, terminer, archiver ; compte gratuit : une ligne par domaine, avec « Terminer pour recommencer »). Sur 390 px : feuille en bas de l'écran, comme les autres fenêtres. Le bandeau des prix, le tableau de bord et les classements suivent **la partie active** et affichent sa date, pour qu'on ne confonde jamais deux parties.
- Accessibilité : clavier complet, focus géré, pas d'information portée par la couleur seule (comme la visite guidée).

## 6. Taille du chantier et petites PR
Estimation globale : **environ 48 jours (± 30 %)** (40 avant la nouvelle règle d'accès, plus 8 jours : retrait propre du domaine gratuit et niveaux), risque **élevé** sur le point 1 (refonte large de la clé « propriétaire »), moyen ensuite.

| # | Petite PR | Jours | Notes |
|---|---|---|---|
| 0 | Décisions (ci-dessous) | 1 | |
| 1 | Table `games`, partie active côté serveur, un seul `game` par joueur (aucun changement visible) | 3 | Fondation, tests anti-accès à la donnée d'autrui |
| 2a-2d | Rattacher les données de jeu à la partie, famille par famille : (a) pièces, registre, horloge ; (b) Bourse ; (c) Crypto ; (d) Immobilier et Banque | 10 | Une PR par famille, chacune verte seule |
| 2e | Instantanés de patrimoine et classements par partie | 3 | |
| 3 | Migration M2 des comptes existants (simulation, `--apply` avec sauvegarde) | 2 | Même méthode que M1 |
| 4 | Fiches de scénario (format, validation, tests, journal) + 2 scénarios Crypto pilotes | 4 | |
| 5a | API des parties (liste, créer, reprendre, activer, terminer) | 3 | |
| 5b | Fonction d'accès par plan, scénario et niveau (réponse structurée, tests serveur) | 2 | Une seule source de vérité pour l'écran et l'API |
| 5c | Retrait propre de l'ancienne règle « domaine gratuit » : pages, liste de premiers pas, textes, tests ; colonnes ignorées (suppression plus tard) | 4 | Comptes existants inchangés |
| 5d | Niveaux de difficulté : conditions de départ (capital, position héritée, prêt de départ, profil), objectifs par niveau, seuils de classement proportionnels | 2 | Simulation de contrôle : le niveau Expert doit rester gagnable |
| 6 | Écrans : choix du scénario, sélecteur de partie, « Mes parties » (390 px) | 5 | |
| 7 | Classements par scénario et date, étoiles, XP et badges par joueur | 5 | |
| 8 | Scénarios Crypto restants (3 à 4) | 2 | |
| 9 | Scénarios Immobilier (après activation DVF) | 2 | Dépend du travail Immobilier réel |
| 10 | Scénarios Bourse | ? | **Bloqué** tant qu'aucune source de cours réels n'est choisie |
| 11 | Tests navigateur, documentation, checklists | 3 | |

**Risques** : refonte large mais mécanique (tout service qui reçoit `userId`) ; anti-accès à la donnée d'autrui à tester partout ; invariants du registre de pièces (totaux par partie) ; migration des comptes existants ; limite de requêtes de l'API (les écrans de parties ne doivent pas multiplier les appels).

## 7. À décider avant tout code
*(Remplace la liste précédente ; la décision « limites par plan » est tranchée par le chapitre 2.)*
1. **Niveaux** : trois (Normal, Difficile, Expert) ou quatre avec « Découverte » ? Valeurs proposées : capital 10 000 / 5 000 / 2 500, position héritée, prêt de départ, profil de revenus (chapitre 2.3). *Recommandé : trois niveaux.*
2. **Bonus de départ du Pro** (+10 000, une fois) : le retirer des parties de scénario pour des classements équitables, en gardant ce que les comptes ont déjà reçu ? *(recommandé)*
3. **Partie libre des comptes gratuits actuels** : elle garde l'ancienne règle d'achat, ne compte pas dans « une partie active par domaine », et se termine quand le joueur veut ? *(recommandé)*
4. **Fin d'abonnement Pro** : les parties déjà commencées restent jouables, seules les nouvelles suivent la règle gratuite ? *(recommandé)*
5. **Classement** : seule la **première** partie d'un scénario (par niveau) est classée, les suivantes « libres » ? Pour un compte gratuit qui termine et recommence, la deuxième partie est donc libre. *(recommandé)*
6. **XP et badges** au joueur, jamais regagnés en recommençant ? *(recommandé)*
7. **Récompenses en pièces** : quota par joueur, crédit dans la partie active ? *(recommandé)*
8. **Bourse** : veux-tu qu'on cherche une source de **cours réels** (options et licences présentées, sans rien dépenser) ou qu'on garde la Bourse en simulation, clairement étiquetée, sans scénarios « faits réels » ? Tant que ce n'est pas tranché, **le premier scénario gratuit de la Bourse n'existe pas**.
9. **Comptes existants** : ta partie actuelle devient la « partie libre » n°1 (aucune perte) ? *(recommandé)*
10. **Immobilier** : ses scénarios commencent en 2022 ? (et la décision horloge de l'Immobilier s'en trouve réglée)
11. **Étape « Choisir ton domaine gratuit »** de la liste de premiers pas : la supprimer (les pièces déjà gagnées restent acquises) ? *(recommandé)*
