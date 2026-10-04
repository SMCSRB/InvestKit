# Scénarios réels et parties multiples : analyse (rien n'est codé)

*4 octobre 2026. Idée d'Andreja : pour chaque domaine (Bourse, Crypto, Immobilier), plusieurs scénarios tirés de faits réels, en mode Histoire seulement ; choisir un scénario met l'horloge à la date du scénario. Ce document est complémentaire du travail sur l'Immobilier réel (`docs/immobilier-reel-preparation.md`, `docs/analyse-immobilier-reel-et-horloge.md`) et n'y touche pas. Les étiquettes : **[sûr]** = vérifié dans le code du dépôt, **[connu]** = fait que je connais mais que je n'ai pas revérifié ici (pas d'accès aux sources), **[à vérifier]** = chiffre ou date à contrôler avant de l'écrire dans le jeu.*

> **Décisions d'Andreja du 4 octobre 2026 (soir)** : trois niveaux (Normal gratuit, Difficile et Expert Pro ; « Découverte » plus tard si besoin) ; bonus de départ Pro retiré des parties de scénario (il reste pour les parties libres et le Bac à sable) ; partie libre des comptes gratuits actuels validée ; Bourse : aucun scénario gratuit tant que la source de cours réels n'est pas tranchée ; seuils de classement = une part du capital du niveau ; **niveau Expert Immobilier NON figé** tant que la simulation (chapitre 8) n'est pas lue ; priorité de livraison : fondation des parties, puis scénarios Crypto et Immobilier, puis le reste. Les autres décisions du chapitre 7 sont **proposées** (à valider à la relecture).

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

Je propose **trois niveaux** : **Normal** (gratuit), **Difficile**, **Expert** (Pro). *Décidé : trois niveaux. Un quatrième niveau « Découverte » plus facile ne viendra que plus tard, si besoin.*

| Paramètre qui varie | Normal | Difficile | Expert | Pourquoi c'est « réel » |
|---|---|---|---|---|
| **Capital de départ** (InvestCoins ; valeur de jeu) | 10 000 (valeur actuelle) | 5 000 | 2 500 | On ne commence pas tous avec la même épargne |
| **Situation de départ** | Aucune | Une **position héritée** imposée, concentrée sur un seul actif réel du scénario (la moitié du capital) | Position héritée **et** un petit prêt déjà en cours (mêmes taux et règles de la banque qu'ailleurs) | On hérite d'une situation, on ne repart pas de zéro |
| **Immobilier : profil de revenus** (existe déjà : étudiant, salarié, cadre) | Salarié | Étudiant | Étudiant, **sans apport de départ** | Les revenus décident de la capacité d'emprunt, par les règles réelles de la banque |
| **Objectif des étoiles** | ★ terminer ; ★★ finir au-dessus du capital de départ ; ★★★ ne jamais perdre plus de la moitié du patrimoine | ★★ finir à +10 % ; ★★★ battre le simple « acheter et garder » de l'actif de référence du scénario | ★★★ battre « acheter et garder » avec une perte maximale d'au plus 30 % | Un objectif plus exigeant, pas une règle différente |
| **Récompense** | XP et étoiles de base | XP et étoiles plus généreuses | Idem, plus généreuses encore | On récompense davantage, on ne triche pas |

**Ce qui ne varie JAMAIS entre niveaux** : frais et écarts (`cryptoMarketRules`, `tradingRules`), taux de référence et marges de la banque (`bankRules`), règles de l'immobilier (`immoRules`), cours, événements, nombre de jours entre deux avances du temps. Les événements réels du scénario arrivent **à tous les niveaux**, aux mêmes dates.

**Conséquences à traiter**
- **Décidé** : les **seuils de classement** (`RANKING_MIN_INVESTED` = 2 500 pièces, `RANKING_MIN_ACTIVE_DAYS`) deviennent une **part du capital du niveau** (sinon un capital de 2 500 ne pourrait jamais être « assez investi »). La part exacte reste à fixer (aujourd'hui 25 % du capital de 10 000) et sera marquée **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER**.
- **Le niveau Expert de l'Immobilier n'est pas figé** : la simulation du chapitre 8 montre que le tableau ci-dessus ne marche pas tel quel pour ce domaine.
- **Classement par niveau** : un classement par *(scénario, niveau)* ; on ne compare jamais Normal et Expert.
- **Bonus de départ du Pro** (`PRO_STARTING_BONUS` = 10 000, aujourd'hui « une seule fois ») : il est **incompatible** avec des classements équitables (un Pro avec 20 000 contre un gratuit avec 10 000 sur le même tableau). **Décidé** : le bonus ne s'applique plus aux parties de scénario (même capital pour tous, à niveau égal) ; il **reste pour les parties libres et le Bac à sable**, et reste acquis aux comptes qui l'ont déjà eu. La valeur du Pro devient « tous les scénarios, tous les niveaux, plusieurs parties ».
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
title: Terra / Luna : la stablecoin qui s'effondre
startDate: 2022-04-01
endDate: 2022-08-31       # au plus tard le dernier jour de données
freeScenario: false       # exactement UN scénario gratuit par domaine (vérifié par test)
levels:                   # trois niveaux, mêmes règles, conditions de départ différentes (chapitre 2.3)
  normal:    { startingCapital: 10000, startPosition: null, objectives: [ … ] }        # seul niveau gratuit
  difficile: { startingCapital: 5000,  startPosition: { asset: BTC, share: 0.5 }, objectives: [ … ] }
  expert:    { startingCapital: 2500,  startPosition: { asset: BTC, share: 0.5 }, startLoan: { coins: 500 }, objectives: [ … ] }
storyFacts:               # le CONTEXTE affiché au départ : chaque fait est daté AVANT OU LE JOUR de startDate (test automatique)
  - { date: 2021-11-10, text: "Le bitcoin a atteint son record de l'époque, près de 69 000 dollars.", source: "…", certainty: sûr }
events:                   # le JOURNAL : chaque fait n'apparaît qu'à sa date, strictement après startDate et au plus tard endDate (test automatique)
  - { date: 2022-05-09, text: "…", source: "…", certainty: sûr }
objectives: # étoiles de réussite par niveau, calculées par le serveur à partir des relevés de patrimoine, par exemple (niveau Normal) :
#   { stars: 1, text: "Termine le scénario", rule: finish }
#   { stars: 2, text: "Fais mieux que « acheter et garder » l'actif de référence", rule: beats_buy_and_hold, asset: BTC }
#   { stars: 3, text: "Finis avec au moins 70 % de ton capital de départ", rule: net_worth_gte_start_pct, value: 70 }
assets: [BTC, ETH, LUNA, ...]   # cours à l'appui (renvoie au catalogue de données)
sources: [ … ]                  # références publiques
```

Règles : français simple, **aucun fait postérieur à la date de départ dans le contexte** (le texte d'introduction ne s'appuie que sur `storyFacts`, tous datés au plus tard à `startDate` ; tout ce qui se passe ensuite arrive dans le journal, à sa date : un test automatique vérifie ces deux règles pour chaque fiche), objectifs **sans pression** (pas de compte à rebours, pas de culpabilité), capital et seuils marqués **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER** et ajoutés à `docs/PARAMETRES-A-RECONFIRMER.md`, rubrique « cours à l'appui » qui indique la source des données (et dit clairement « simulé » quand ce n'est pas un cours réel).

## 4. Scénarios retenus : des événements historiques connus, domaine par domaine
*Liste finale proposée (rien n'est figé avant ta validation). Chaque scénario est centré sur un **gros événement réel**, avec : un nom parlant, une date de départ et de fin, l'événement en quelques phrases, ce que le joueur doit gérer, l'objectif et les étoiles du niveau Normal. Les niveaux Difficile et Expert suivent le chapitre 2.3 (mêmes règles, conditions de départ plus dures).*

**Étiquettes des faits.** **[sûr]** = vérifié dans le code du dépôt, ou confirmé par au moins un résumé de recherche web qui cite une source (la page n'a pas pu être ouverte depuis ma session : **relecture de la page citée avant toute publication dans le jeu**) ; **[connu]** = je le connais mais je ne l'ai pas revérifié ; **[à vérifier]** = chiffre ou date incertain.

**Règle de rédaction.** Dans chaque scénario, la rubrique **« Contexte au départ »** ne contient que des faits datés **au plus tard à la date de départ**. Tout ce qui arrive ensuite est dans **« Pendant la partie »** (journal, affiché à sa date). Les objectifs de ce document sont des **valeurs de jeu non sourcées, à calibrer par simulation sur les vrais cours avant ouverture** (comme le niveau Expert de l'Immobilier, chapitre 8) : on ne fige aucun seuil sans avoir vérifié qu'il est atteignable.

**Gratuit ou Pro.** Un seul scénario gratuit par domaine, au niveau Normal : **le premier de la liste de ce domaine** ; tout le reste (autres scénarios, autres niveaux) est Pro. Marqué **GRATUIT** ci-dessous.

### Ce que les données permettent aujourd'hui
| Domaine | Données présentes | Verdict |
|---|---|---|
| **Crypto** | **Vrais** cours journaliers importés (CryptoCompare) **[sûr]** (`scripts/crypto-import.ts`) ; départs déjà proposés dans le code : 2014, 2017, 2020, 2021, 2022 **[sûr]** ; la plage exacte et la présence de chaque actif (par exemple LUNA, FTT) sont à confirmer par le rapport d'import sur le serveur | **Faisable maintenant**, sous réserve du catalogue d'actifs |
| **Bourse** | Séries **annuelles « plausibles », pas des cours réels** (en-tête de `stockPrices.ts`, à partir de 2010) **[sûr]** | **En attente d'une source de cours réels**, couvrant au moins **1999 à aujourd'hui** pour tous les scénarios ci-dessous |
| **Immobilier** | DVF officielles **2021 à 2025** **[sûr]** (rapport d'Andreja) ; médianes à fenêtre de 12 mois pleine dès décembre 2021 **[sûr]** (rapport) | Scénarios **2022 à 2025**, après l'activation des prix DVF (`DVF_MARKET_ENABLED`) |

### 4.1 Crypto (7 scénarios, dans l'ordre du temps)

**C1. « Mt. Gox : la chute de 2014 »** — **GRATUIT (Normal)** · 2014-01-01 → 2015-01-31
- *Contexte au départ.* Le bitcoin a connu sa première grande bulle fin 2013, la plus grosse plateforme d'échange est Mt. Gox **[connu]**. Peu d'actifs existent (bitcoin et quelques « altcoins ») **[à vérifier : liste du catalogue en 2014]**.
- *Pendant la partie.* Mt. Gox bloque les retraits le 7 février 2014, suspend les échanges le 24 février, puis demande sa mise en faillite à Tokyo le 28 février **[sûr]** (bitcoin.it, NBC News, bitcoin.com). Le bitcoin passe d'environ 800 à moins de 600 dollars en quelques jours **[sûr, ordres de grandeur]** ; environ 850 000 bitcoins ont disparu **[sûr]**. La baisse se prolonge ensuite **[connu : jusqu'en janvier 2015]**.
- *À gérer.* Un marché qui baisse longtemps : réduire le risque, garder des liquidités, éviter de tout miser sur un seul actif. *Limite honnête : le risque de plateforme (retraits bloqués) n'est pas simulé dans le jeu aujourd'hui ; il apparaît dans le journal du marché, pas comme une mécanique.*
- *Objectif Normal.* ★ terminer ; ★★ faire mieux que « acheter et garder » le bitcoin ; ★★★ finir avec au moins 70 % du capital de départ. **[à calibrer]**
- *Remarque.* Le premier scénario gratuit est ici un **krach** : c'est pédagogique (le risque d'abord) mais rude pour un débutant. Si tu préfères une entrée plus douce, mets C2 en premier : il suffit de changer l'ordre de la liste.

**C2. « La bulle de 2017 »** · 2017-01-01 → 2017-12-31
- *Contexte au départ.* Le bitcoin repart à la hausse depuis fin 2015, autour de 1 000 dollars au 1er janvier 2017 **[à vérifier]** ; l'Ethereum existe depuis 2015 **[connu]**.
- *Pendant la partie.* Une année de hausse très rapide : de 900 à près de 20 000 dollars **[sûr]** (CoinDesk) ; record le 17 décembre 2017, environ 19 783 dollars **[sûr]** ; vague d'ICO (levées de fonds en jetons) **[connu]**.
- *À gérer.* L'euphorie : savoir prendre des profits, ne pas emprunter pour acheter plus haut, repérer les actifs trop petits et peu liquides (écarts d'achat et de vente, glissement de prix du jeu).
- *Objectif Normal.* ★ terminer ; ★★ au moins doubler le capital ; ★★★ idem avec une perte maximale d'au plus 40 % en cours de route. **[à calibrer]**

**C3. « Le krach de 2018 »** · 2018-01-01 → 2018-12-31
- *Contexte au départ.* Le record de décembre 2017 (près de 20 000 dollars) vient d'être atteint **[sûr]**.
- *Pendant la partie.* En un an, le bitcoin perd environ 84 % depuis son sommet de décembre 2017, pour retomber autour de 3 100 à 3 500 dollars en décembre 2018 **[sûr]** (NBC News, Bitcoin Magazine).
- *À gérer.* Un marché baissier long : sortir à temps, ne pas « moyenner à la baisse » sans règle, garder de quoi attendre.
- *Objectif Normal.* ★ terminer ; ★★ faire mieux que « acheter et garder » ; ★★★ finir avec au moins 60 % du capital. **[à calibrer]**

**C4. « Jeudi noir : mars 2020 »** · 2020-01-01 → 2020-06-30
- *Contexte au départ.* Début 2020, le marché est calme ; aucun fait lié au virus n'est affiché au départ.
- *Pendant la partie.* Le 12 mars 2020, le bitcoin perd plus de 40 % en une journée (de 7 939 à 4 346 dollars sur BitMEX, environ −45 %), entraîné par la chute des marchés traditionnels et des liquidations en chaîne **[sûr]** (Cointelegraph, Wikipédia) ; il rebondit d'environ 50 % le lendemain **[sûr]**. Le « halving » (récompense des mineurs divisée par deux) a lieu le 11 mai 2020 **[connu]**.
- *À gérer.* Une chute brutale en une seule journée : les ordres et les appels de marge (prêts sur portefeuille) ; ne pas vendre au plus bas, ni acheter avec de l'argent emprunté.
- *Objectif Normal.* ★ terminer ; ★★ finir au-dessus du capital ; ★★★ idem sans jamais perdre plus de 50 %. **[à calibrer]**

**C5. « La montée de 2021 »** · 2021-01-01 → 2021-12-31
- *Contexte au départ.* Le bitcoin vient de dépasser son record de 2017 fin 2020 **[connu]**.
- *Pendant la partie.* Hausse jusqu'au record du 10 novembre 2021, environ 69 000 dollars (68 982) **[sûr]** (Bloomberg, CNBC) ; fin mai, la Chine annonce un durcissement contre le minage et les échanges : le bitcoin chute d'environ 30 % **[sûr]** (Fortune, TechNode) ; 90 % de la capacité de minage chinoise disparaît **[sûr, à relire]**.
- *À gérer.* Des allers-retours violents au sein d'une grande hausse : rester investi sans s'emballer.
- *Objectif Normal.* ★ terminer ; ★★ finir au-dessus de 1,5 fois le capital ; ★★★ idem avec une perte maximale d'au plus 40 %. **[à calibrer]**

**C6. « Terra / Luna : la chute d'une stablecoin »** · 2022-04-01 → 2022-08-31
- *Contexte au départ.* Le record de novembre 2021 est passé (environ 69 000 dollars) **[sûr]** ; une stablecoin « algorithmique » (UST, adossée à Luna) est très populaire **[connu]**.
- *Pendant la partie.* UST décroche une première fois le 7 mai 2022, puis définitivement le 9 mai ; plus de 90 % de la valeur de l'écosystème part en une semaine (9 au 15 mai) **[sûr]** (Riksbank, ScienceDirect, Baker Institute). Des faillites en chaîne suivent (juin-juillet) **[connu : à détailler et sourcer avant d'écrire le journal]**.
- *À gérer.* La contagion : un actif qui s'effondre fait baisser tout le marché ; diversifier, contrôler la taille d'une position.
- *Objectif Normal.* ★ terminer ; ★★ faire mieux que « acheter et garder » le bitcoin ; ★★★ finir avec au moins 70 % du capital. **[à calibrer]**
- *Dépendance.* Il faut que Luna et UST soient dans le catalogue importé **[à vérifier]** ; sinon le scénario reste valable (le bitcoin et l'Ethereum ont baissé aussi) mais perd son actif vedette.

**C7. « FTX : la faillite de novembre 2022 »** · 2022-10-15 → 2023-02-28
- *Contexte au départ.* Le marché est déjà bas après la chute de Terra et la hausse des taux **[sûr]** ; FTX est une des plus grandes plateformes **[connu]**.
- *Pendant la partie.* Le 2 novembre, un article de CoinDesk révèle les liens financiers entre FTX et Alameda ; le 6 novembre, Binance annonce vendre ses FTT (1 milliard de dollars de retraits en un jour) ; le 8 novembre, FTX bloque les retraits ; le 11 novembre, FTX demande sa mise en faillite et son fondateur démissionne **[sûr]** (The Block, Wikipédia, EBSCO).
- *À gérer.* La perte de confiance dans un acteur central : diversification, liquidités, ne pas confondre prix et solidité.
- *Objectif Normal.* ★ terminer ; ★★ finir au-dessus du capital ; ★★★ idem avec une perte maximale d'au plus 30 %. **[à calibrer]**

### 4.2 Bourse (7 scénarios au plus ; **aucun scénario gratuit tant que la source de cours réels n'est pas tranchée**)
*Tous dépendent de vrais cours (et, pour 1999 à 2009, d'une source qui remonte à 1999). Quand la source sera choisie, **le premier scénario que ses données permettent sera le gratuit** (la bulle internet si elle remonte à 1999, sinon la crise de 2008).*

**B1. « La bulle internet »** · 1999-10-01 → 2002-12-31
- *Contexte au départ.* Les valeurs technologiques montent depuis le milieu des années 1990 **[connu]**.
- *Pendant la partie.* Le Nasdaq atteint 5 048,62 points le 10 mars 2000, puis perd environ 78 % jusqu'à 1 114 points en octobre 2002 **[sûr]** (Wikipédia, Goldman Sachs). Le CAC 40 atteint son record de clôture le 4 septembre 2000, 6 922,33 points **[sûr]** (record battu seulement en 2021).
- *À gérer.* Les valorisations excessives, la concentration sur un secteur, tenir sur la durée ou sortir.
- *Objectif Normal.* ★ terminer ; ★★ faire mieux que l'indice ; ★★★ finir au-dessus de 80 % du capital. **[à calibrer]**
- *Dépendances.* Données dès 1999 **[à vérifier]** ; instruments disponibles à l'époque en PEA (actions ; fonds indiciels peu répandus) **[à vérifier]**.

**B2. « La crise de 2008 »** · 2007-10-01 → 2009-06-30
- *Contexte au départ.* Des tensions sur les crédits immobiliers américains apparaissent depuis l'été 2007 **[connu]**.
- *Pendant la partie.* Lehman Brothers dépose le bilan le 15 septembre 2008 **[sûr]** (History.com, Wikipédia) ; le CAC 40 touche son plus bas le 9 mars 2009, vers 2 464 à 2 519 points selon intrajournalier ou clôture **[à vérifier : valeur exacte]**, soit environ −58 % depuis fin 2007 **[à vérifier]**.
- *À gérer.* Une crise bancaire : liquidités, secteur financier, résister à la panique, et savoir quand racheter.
- *Objectif Normal.* ★ terminer ; ★★ faire mieux que l'indice ; ★★★ finir avec au moins 60 % du capital. **[à calibrer]**

**B3. « Le krach du Covid : 2020 »** · 2020-01-01 → 2020-12-31
- *Contexte au départ.* Les marchés sont à des niveaux élevés ; aucun fait lié au virus n'est affiché au départ.
- *Pendant la partie.* Chute des marchés mondiaux de fin février à mars 2020 **[sûr]** ; le 12 mars 2020 est la plus forte baisse en une séance de l'histoire de la Bourse de Paris **[sûr, à relire]** ; rebond massif ensuite **[connu]**.
- *À gérer.* Une chute éclair puis un rebond : ne pas vendre au plus bas, rester diversifié.
- *Objectif Normal.* ★ terminer ; ★★ finir au-dessus du capital ; ★★★ idem sans jamais perdre plus de 40 %. **[à calibrer]**

**B4. « Inflation et hausse des taux : 2022 »** · 2022-01-01 → 2022-12-31
- *Contexte au départ.* L'inflation monte depuis 2021 **[connu]**, les taux directeurs sont à leur plus bas **[connu]**.
- *Pendant la partie.* Invasion de l'Ukraine le 24 février **[connu]** ; la Fed relève ses taux pour la première fois le 16 mars 2022 (de 0 à 0,25–0,50 %) **[sûr]** (CNBC) ; la BCE le fait le 27 juillet 2022, de 50 points de base, sa première hausse depuis plus de dix ans **[sûr]** (BCE, CNBC).
- *À gérer.* Les actions « de croissance » souffrent de la hausse des taux ; arbitrer entre secteurs, garder des liquidités qui rapportent de nouveau.
- *Objectif Normal.* ★ terminer ; ★★ faire mieux que l'indice ; ★★★ finir au-dessus du capital. **[à calibrer]**

*Pistes pour plus tard (non retenues pour l'instant)* : la crise de la dette européenne 2011, le référendum britannique de juin 2016 **[sûr : 23 juin 2016, à sourcer]**, la faillite de Silicon Valley Bank en mars 2023 **[connu]**.

### 4.3 Immobilier (3 scénarios réels, à partir de 2022)

**I1. « La remontée des taux »** — **GRATUIT (Normal)** · 2022-01-01 → 2023-12-31
- *Contexte au départ.* Depuis le 1er janvier 2022, la décision du Haut Conseil de stabilité financière (29 septembre 2021) est **contraignante** : endettement limité à 35 % des revenus nets, assurance comprise, durée maximale de 25 ans (27 ans en VEFA ou travaux d'au moins 10 % du coût) **[sûr]** (Assemblée nationale, sites de courtage ; à relire sur le texte officiel). Taux moyen des crédits : **1,06 % en décembre 2021** **[sûr]** (Observatoire Crédit Logement/CSA).
- *Pendant la partie.* Le taux moyen passe à **2,35 % en décembre 2022 puis 4,20 % en décembre 2023** (hors assurance et garantie) **[sûr]** (Observatoire Crédit Logement/CSA, résumés de recherche) ; la Fed (mars 2022) et la BCE (juillet 2022) relèvent leurs taux **[sûr]**. Le prix des logements anciens se met à baisser fin 2023 après trois années de hausse **[sûr]** (Notaires-Insee).
- *À gérer.* La capacité d'emprunt fond quand les taux montent : acheter tôt ou attendre, durée du prêt, apport, rendement locatif face au coût du crédit.
- *Objectif Normal.* ★ terminer ; ★★ acheter un bien et le garder jusqu'à la fin ; ★★★ idem avec un loyer qui couvre au moins la mensualité. **[à calibrer par simulation, voir ci-dessous]**
- *Limites.* Le jeu utilise sa **propre courbe de taux fictive** (2,0 % en 2022, 4,0 % en 2023 dans `fictiveCatalog.ts` **[sûr]**) : à **recaler sur l'Observatoire Crédit Logement** (licence à vérifier) pour que le scénario soit honnête. **Le niveau Normal doit lui aussi être simulé** (capital 10 000, profil salarié : plafond d'achat d'environ 56 000 euros, chapitre 8) avant d'être ouvert : seules les villes bon marché et les parkings risquent d'être accessibles.

**I2. « Le retournement du marché »** · 2023-01-01 → 2024-12-31
- *Contexte au départ.* Le taux moyen est de **2,35 % fin 2022** et monte **[sûr]** ; les prix viennent de plusieurs années de hausse **[sûr]**.
- *Pendant la partie.* Les prix des logements anciens baissent : −0,2 % au premier trimestre 2023, −1,6 % au premier trimestre 2024 (en un trimestre) **[sûr]** (Insee, Informations rapides) ; les ventes reculent fortement (environ −24 % au premier trimestre 2024 sur un an ; 792 000 ventes en 2024, soit −9 % sur 2023) **[à vérifier : sources de presse]** ; le taux atteint 4,20 % en décembre 2023 **[sûr]**.
- *À gérer.* Acheter dans un marché qui baisse : négocier, attendre, éviter de s'endetter au plus haut ; l'effet sur la valeur d'un bien déjà acheté.
- *Objectif Normal.* ★ terminer ; ★★ finir au-dessus du capital ; ★★★ acheter au moins une fois sous le prix médian du quartier. **[à calibrer]**
- *Mesure.* Les baisses par ville se **mesurent avec nos propres médianes DVF** (le rapport) : ce fait deviendra **[sûr]** une fois mesuré.

**I3. « Les passoires thermiques »** · 2024-01-01 → 2025-… (fin à fixer selon le dernier mois DVF)
- *Contexte au départ.* La loi Climat et Résilience prévoit d'interdire progressivement la location des logements les moins performants (étiquettes G, F puis E) **[connu]**.
- *Pendant la partie.* Interdiction de louer les logements classés G à partir du 1er janvier 2025 **[connu, à sourcer]** ; F en 2028 et E en 2034 **[connu, à sourcer]**.
- *À gérer.* La valeur verte : rénover ou éviter les biens « G » ; arbitrer travaux et loyer (mécanique déjà dans le jeu : valeur verte, rénovation).
- *Objectif Normal.* ★ terminer ; ★★ ne posséder aucun bien interdit à la location à la fin ; ★★★ rendement net positif. **[à calibrer]**
- *Remarque.* Ce scénario s'appuie sur les **étiquettes énergétiques simulées** du jeu (aucune source ouverte fiable ne les rattache aux ventes DVF) : à dire clairement à l'écran. Il est le moins « réel » de la liste ; on peut le retirer.

### 4.4 Immobilier avant 2021 : ce que permettraient les indices officiels Notaires-Insee (aucune décision)
*Pour 2008 (après Lehman) ou 2014, il n'y a **pas de vraies ventes** (les DVF ne couvrent que 2021 et après). L'alternative serait un **indice de prix**, pas des ventes.*

| | Indices Notaires-Insee (logements anciens) |
|---|---|
| Ce que c'est | Indice de prix **à qualité constante** (pas des transactions), **trimestriel**, appartements et maisons anciens **[sûr]** (Insee, notaires.fr) |
| Couverture | Séries disponibles **depuis 1996** **[sûr]** ; Paris et Île-de-France (base BIEN des notaires) et province **[sûr]** ; le détail par région, par grande ville ou par arrondissement **[à vérifier]** |
| Base | Base 100 = moyenne annuelle 2015 **[sûr]** |
| Licence | Données Insee sous **Licence Ouverte**, réutilisation autorisée, **y compris commerciale** **[sûr]** (Insee, conditions d'utilisation) ; mention de la source et de la date à afficher **[à vérifier : texte exact]** |
| Ce que ça permettrait | Faire **évoluer le niveau de prix** d'une zone mois après mois et **revaloriser un bien déjà acheté** (le moteur sait déjà le faire avec `valueFromMarket`), pour des scénarios « après Lehman, 2008-2010 » ou « 2014, taux bas et marché atone » **[à étudier]** |
| Ce que ça ne permettrait PAS | Des **annonces réelles** : les biens à vendre resteraient **simulés** (catalogue du jeu recalé sur l'indice) ; pas de prix par quartier ; pas de loyers ni de taux (il faudrait d'autres sources : Observatoire Crédit Logement, Banque de France, indice des loyers) |
| Mention obligatoire à l'écran | « Évolution des prix réelle (indice Notaires-Insee), annonces simulées » |

Rien n'est décidé : ce tableau dit seulement ce que la donnée permettrait, avec sa licence et sa couverture.

### Sources consultées
Ces sources viennent de **résumés de recherche web** (les pages n'ont pas pu être ouvertes) ; elles sont à relire avant publication : [Collapse of Mt. Gox (Bitcoin Wiki)](https://en.bitcoin.it/wiki/Collapse_of_Mt._Gox) · [NBC News, Mt. Gox](https://www.nbcnews.com/news/amp/wbna54505295) · [CoinDesk, 2017](https://www.coindesk.com/markets/2017/12/29/from-900-to-20000-bitcoins-historic-2017-price-run-revisited) · [NBC News, 2018](https://www.nbcnews.com/business/markets/bitcoin-high-2017-decline-2018-data-n949576) · [Cointelegraph, Black Thursday](https://cointelegraph.com/news/black-thursday-anniversary-can-crypto-markets-see-another-huge-crash) · [Bloomberg, record 2021](https://www.bloomberg.com/news/articles/2021-11-10/bitcoin-hits-record-as-inflation-hedge-drumbeat-grows-louder) · [Fortune, Chine 2021](https://fortune.com/2021/05/21/china-ban-bitcoin-price-bubble-crypto/) · [Riksbank, Terra](https://www.riksbank.se/globalassets/media/konferenser/2023/session-1-liu_makarov_schoar-anatomy_of_a_run-_the_terra_luna_crash.pdf) · [The Block, FTX](https://www.theblock.co/post/256106/a-complete-timeline-of-ftx-from-alamedas-spiraling-debt-to-its-dramatic-implosion) · [Wikipédia, bulle internet](https://en.wikipedia.org/wiki/Dot-com_bubble) · [History.com, Lehman](https://www.history.com/this-day-in-history/september-15/lehman-brothers-collapses) · [CNBC, Fed 2022](https://www.cnbc.com/2022/03/16/federal-reserve-meeting.html) · [BCE, juillet 2022](https://www.ecb.europa.eu/press/pr/date/2022/html/ecb.mp220721~53e5bdd317.en.html) · [Moneyvox, record du CAC 40](https://www.moneyvox.fr/bourse/actualites/86273/le-cac-40-bat-un-record-datant-du-4-septembre-2000) · [Observatoire Crédit Logement](https://lobservatoire.creditlogement.fr/) · [Assemblée nationale, HCSF](https://questions.assemblee-nationale.fr/q15/15-41747QE.htm) · [Insee, indice des prix des logements anciens](https://www.insee.fr/fr/metadonnees/source/indicateur/p1643/description) · [Insee, conditions d'utilisation des données](https://www.insee.fr/fr/information/2381863) · [Insee, T1 2024](https://www.insee.fr/fr/statistiques/8190571)

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

## 7. Décisions (état au 4 octobre 2026, soir)
**Validées par Andreja** : trois niveaux ; bonus de départ Pro retiré des parties de scénario (conservé pour les parties libres et le Bac à sable) ; partie libre des comptes gratuits actuels ; Bourse sans scénario gratuit tant que la source de cours réels n'est pas tranchée ; seuils de classement en part du capital du niveau ; priorité de livraison (fondation, puis Crypto et Immobilier, puis le reste).

**Proposées (ma recommandation, à valider à la relecture)** :
| # | Décision proposée |
|---|---|
| P1 | **Fin d'abonnement Pro** : les parties déjà commencées restent jouables, seules les nouvelles parties suivent la règle gratuite |
| P2 | **Classement** : seule la **première** partie d'un scénario (par niveau) est classée, les suivantes sont « libres » (un compte gratuit qui termine et recommence joue donc une partie libre la deuxième fois) |
| P3 | **XP et badges** au joueur, jamais regagnés en recommençant (événements d'XP de scénario : une fois par joueur et par scénario) |
| P4 | **Récompenses en pièces** : quota par joueur, crédit dans la partie active |
| P5 | **Comptes existants** : la partie actuelle devient la « partie libre » n°1, avec le même identifiant que le joueur (aucune perte) |
| P6 | **Immobilier** : ses scénarios commencent en 2022 ; la décision horloge de l'Immobilier s'en trouve réglée |
| P7 | **Étape « Choisir ton domaine gratuit »** de la liste de premiers pas : supprimée (pièces déjà gagnées conservées) |
| P8 | **Colonnes `free_domain*`** : ignorées d'abord, supprimées dans une PR séparée plus tard |

| P9 | **Liste finale des scénarios** du chapitre 4 (7 Crypto, 4 Bourse en attente de cours, 3 Immobilier) ; premier scénario gratuit : C1 (Crypto), I1 (Immobilier), et pour la Bourse celui que la source de données permettra en premier |
| P10 | **Objectifs et étoiles** : tous « à calibrer par simulation sur les vrais cours » avant l'ouverture d'un scénario |
| P11 | **Immobilier avant 2021** : aucun scénario tant que tu n'as pas tranché la piste des indices Notaires-Insee (chapitre 4.4) |

**Ouvertes** : niveau Expert de l'Immobilier (chapitre 8) ; source de cours réels pour la Bourse ; le premier scénario gratuit Crypto est-il un krach (C1) ou une entrée plus douce (C2 en premier) ?

## 8. Simulation : le niveau Expert de l'Immobilier est-il jouable ?
*Demande : simuler « étudiant sans apport, 2 500 de capital, nos règles de banque (10 % d'apport, notaire, 35 %) » avec les vrais prix DVF, ville par ville. Le niveau n'est **pas figé** avant ta lecture.*

**Ce qui est fait.** Un outil en lecture seule, `npm --prefix backend run immo:simulate-niveau` (PR à part, aucun effet sur le jeu), applique **exactement** l'évaluation d'achat et les règles de banque du jeu (`evaluatePurchase`, `BANK_RULES`, `STARTING_PROFILES`) aux médianes du fichier `backend/data/dvf-marche.json` : pour chaque ville et chaque quartier, le prix au m², la surface finançable, et pour cinq types de bien (parking, studio, T2, T3, maison) combien de quartiers sont acceptés par la banque. Il se lance sur le serveur, là où sont les vrais prix : **je n'ai pas pu le faire tourner sur les vraies données depuis ma session** (réseau fermé), donc le tableau « ville par ville » avec les vrais prix est à produire par toi (une commande).

**Ce que les règles donnent déjà, sans les prix (calcul réel, moteur du jeu).** Prix d'achat maximum accepté (euros, bien ancien, prêt de 25 ans, aucun loyer retenu), selon le taux de crédit 2 % puis 4 % :

| Profil | 2 500 pièces | 5 000 pièces | 10 000 pièces |
|---|---|---|---|
| Étudiant | 13 100 / 13 100 | 24 900 / 21 100 | 29 600 / 25 800 |
| Salarié ou cadre | 13 100 / 13 100 | 27 400 / 27 400 | 56 000 / 56 000 |

Dans le neuf (frais de notaire plus bas), 2 500 pièces permettent environ **18 400 euros**. Ce qui limite :
- **L'apport minimal** (frais de notaire en entier + 10 % du prix) : avec 2 500 pièces, tout le capital y passe ; **« sans apport » ne peut pas exister** avec ces règles, car l'apport est obligatoire. L'apport est le seul frein pour un salarié ou un cadre (plafond d'environ 5,6 fois le capital dans l'ancien).
- **Le reste à vivre de l'étudiant** (500 euros exigés ; revenus 900, charges 300) : la mensualité plafonne vers 100 euros par mois, donc environ 20 000 à 30 000 euros empruntés **quel que soit le capital**. Un étudiant n'achètera jamais de vrai logement, même avec 10 000 pièces, sauf avec un loyer prévisionnel retenu par la banque (à 5 % brut, le plafond d'un étudiant à 5 000 pièces monte à 27 000 à 38 000 euros).

**Conclusion provisoire.** Pour juger avec les vrais prix, il faudra ta commande ; mais l'ordre de grandeur suffit déjà : avec **13 000 euros**, il faut un prix au m² **inférieur à environ 670 euros** pour acheter le plus petit studio du jeu (17 m², prix majoré de 15 % par rapport à un appartement). Les villes les moins chères de la liste sont, à ma connaissance, autour de 1 000 à 1 500 euros du m² **[connu, à vérifier : c'est précisément ce que la commande mesurera]**. Donc, **au niveau Expert tel qu'il est défini, la banque refuserait tout logement ; seuls des parkings dans les villes les moins chères seraient accessibles** (parking du jeu : 11 m² à 40 % du prix au m²). Ce n'est pas un niveau « difficile mais gagnable » : c'est un niveau presque injouable pour l'apprentissage de l'achat.

**Pistes (je ne choisis pas à ta place ; rien n'est figé)**
1. **Expert Immobilier = autre levier que le capital** : garder 10 000 pièces et le profil de revenus de Normal, durcir **l'objectif** (étoiles : rendement net minimal, ne jamais descendre sous un certain reste à vivre) et imposer un **bien hérité à rénover** comme situation de départ.
2. **Capital 5 000 pour Expert, salarié** (plafond environ 27 000 euros) : encore pas de logement dans la plupart des villes, à confirmer par la commande.
3. **Garder 2 500 pièces mais sur le thème « parkings »** : un niveau assumé comme « premier investissement locatif minuscule » (ticket d'entrée faible, objectif de rendement), à condition de le dire clairement à l'écran.
4. **Ne pas décliner les niveaux Immobilier par le capital** : niveaux Normal, Difficile, Expert différents seulement par le profil et les objectifs, jamais par un capital qui bloque la banque.
La commande à lancer (lecture seule, sur le serveur, ne touche aucune base) : `npm --prefix backend run immo:simulate-niveau`. Autres niveaux : `-- --capital 5000 --profile employee` ; avec un loyer retenu : `-- --yield 5`.

## 9. Fondation des parties : ce que je teste (avant tout code)
*Périmètre : PR 1, 2a à 2e et migration M2 du chapitre 6, sans aucun changement visible pour les joueurs. Je ne code rien avant ta validation de cette liste.*

1. **Filet de sécurité principal** : les **1 290 tests actuels passent sans être modifiés** (le joueur est la partie n°1), ainsi que les 4 parcours navigateur (téléphone, bureau, Crypto, guide). Les réponses de l'API gardent exactement leur forme (test de contrat sur la documentation de l'API).
2. **Migration M2 (comptes existants)** : simulation par défaut ; pour chaque famille de tables de jeu, **mêmes nombres de lignes avant et après**, mêmes soldes, même total du registre ; chaque joueur a une partie n°1 **dont l'identifiant est le sien** ; rejouable sans effet ; refus d'écrire sans `--apply` et sans sauvegarde ; essai sur la copie de test d'abord.
3. **Invariants des pièces** : somme du registre = solde, pour **chaque partie** ; aucune pièce créée ni détruite par la migration ; les statistiques de pièces s'additionnent par partie.
4. **Isolation entre parties** : test « propriété » : toute opération dans la partie 1 laisse la partie 2 **strictement inchangée** (pièces, positions, prêts, horloge, relevés, classement) ; un joueur ne peut ni lire ni agir sur la partie d'un autre (réponse identique à « introuvable », comme pour le reste de l'API) ; une partie qui n'est pas la sienne ou pas active est refusée.
5. **Horloge** : une horloge par partie, jamais en arrière ; deux onglets qui avancent la même partie en même temps ne la doublent pas (verrou par partie) ; les anciens boutons d'avance et la porte de l'horloge utilisent la partie active ; le cas « partie à migrer » reste géré.
6. **XP, badges, bonus de premiers pas** : restent au joueur ; créer une deuxième partie ne donne **aucun** bonus ni XP en double (test).
7. **Limites** : un compte gratuit ne peut pas avoir deux parties actives dans un domaine, **même avec deux demandes simultanées** (contrainte en base et verrou) ; un compte Pro peut en avoir plusieurs.
8. **Suppression de compte et export** : les parties partent avec le joueur, les totaux anonymes sont archivés comme avant, l'export de données contient les parties.
9. **Performance et limite de requêtes** : la résolution de la partie active se fait **une fois par requête** (aucune requête de plus par appel dans les parcours existants : mesure avant et après) ; aucune modification des limites de l'API.
10. **Marche arrière** : méthode « agrandir puis réduire » (expand/contract) : d'abord ajouter les nouvelles colonnes et la table des parties en gardant les anciennes, basculer les lectures, ne supprimer l'ancien qu'ensuite dans une PR séparée ; chaque PR est verte seule et revenable.

**Priorité de livraison** (décidée) : 1) fondation des parties ; 2) scénarios Crypto et Immobilier ; 3) le reste. **La Bourse attend sa source de cours réels.**
