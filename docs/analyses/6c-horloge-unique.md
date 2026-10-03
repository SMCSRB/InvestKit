# 6c. Une seule horloge simulée par joueur

*Analyse sans code, le 3 octobre 2026, sur `release/design-complet`. Rien n'a été modifié.*

## En deux phrases
Aujourd'hui **chaque domaine a sa propre horloge, avec sa propre unité** (année pour la Bourse, jour pour la Crypto, mois pour l'Immobilier) : un joueur peut donc être en 2010 en Bourse et en 2020 en Crypto sur le même écran, et profiter de ce qu'il a vu dans un domaine pour jouer dans l'autre. Une horloge unique est faisable, mais elle touche le cœur du jeu (ordres, prêts, loyers, classements) : je propose de la construire **par étapes, avec une migration « neutre en valeur »** pour les joueurs existants.

---

## 1. Comment les horloges fonctionnent aujourd'hui

| Domaine | Où est la date ? | Unité et pas | Départ | Fin |
|---|---|---|---|---|
| **Bourse** (et l'ancien domaine Crypto « annuel ») | `virtual_portfolios.simulated_year` (une ligne par joueur, mode et domaine) | **1 an** par clic (`advanceYear`) | toujours **2010** pour la Bourse (2013 pour l'ancien Crypto), **sans choix** | 2026 |
| **Crypto (marché simulé)** | `crypto_accounts.start_at` et `simulated_at` (date et heure) | **jour, semaine, mois** (`day`, `week`, `month`) | **choisi par le joueur** à la création du compte parmi 2014, 2017 (défaut), 2020, 2021, 2022 | dernière bougie importée en base (`dataEnd`) |
| **Immobilier** | `re_games.simulated_year` + `simulated_month` | **1 à N mois** (`advanceTime`) | 2010, janvier, **sans choix** | 2026 |
| **Banque** | pas d'horloge propre : chaque prêt porte l'horloge **de son domaine** (`clockTotal` : l'année en Bourse, le numéro du jour en Crypto, le numéro du mois en Immobilier) | selon le domaine | — | — |

Règles actuelles (déjà décidées, voir `CLAUDE.md`) : chaque domaine a sa date ; **le serveur décide**, jamais le client ; aucune donnée postérieure à la date simulée n'est renvoyée ; aucun retour en arrière.

**Les classements** comparent « à année simulée égale » : l'instantané est rangé par domaine et par période `Y2010`, `Y2011`… (`leaderboard_rankings`). Il n'existe **aucun historique du patrimoine** dans le temps.

### 1.1 Pourquoi le bandeau montre des prix Crypto de 2020 alors que la Bourse est en 2010
D'après le code (je ne vois pas ta base) :
- Le bandeau lit les cours du **compte Crypto** du joueur (`/crypto/state`, `/crypto/assets`, `/crypto/candles`), donc à `crypto_accounts.simulated_at`.
- Ce compte a été créé avec **la date de départ choisie** : si le joueur a pris « Début 2020 », le bandeau affiche des prix de 2020.
- La Bourse, elle, démarre **toujours en 2010** (`simulated_year` vaut 2010 par défaut) et ne bouge qu'à chaque « année suivante ».
- Les deux horloges n'ont donc aucune raison de coïncider, et l'écran les affiche côte à côte.

**Avec une horloge unique** : le bandeau, la Bourse, l'Immobilier et la Banque lisent **la même date** ; le départ est choisi une seule fois pour tout le jeu ; le bandeau ne peut plus montrer une autre année que la Bourse.

---

## 2. Ce qu'on veut (cahier des charges)
Mode **Accéléré** : une horloge par joueur, partagée par tous les domaines.
- Avancer de **+1 jour, +1 semaine, +1 mois, +1 trimestre, +1 an**.
- **Lecture automatique** ×1, ×10, ×100, avec **pause**.
- **« Avancer jusqu'au prochain événement »**.
- **Arrêt automatique** sur les moments importants (appel de marge, vente forcée, locataire qui part, ordre exécuté, échéance de prêt, fin des données…) avec un **récapitulatif** de ce qui s'est passé.
- Plus tard, un mode **Direct** (temps réel) seulement pour Bourse et Crypto, avec **portefeuille et classement séparés**.

## 3. Architecture proposée

### 3.1 Une table, une date
`sim_clocks(user_id, mode, start_date, current_date, updated_at)` (DATE, pas d'heure : le jeu avance par jours). La colonne `mode` existe déjà dans les portefeuilles et les classements (`accelerated`) : on réutilise cette séparation pour le futur mode `live`. **Une seule ligne par joueur et par mode** : l'avancée se fait par une seule fonction serveur, `advanceTo(user, nouvelleDate)`, qui est la **seule** à changer la date.

### 3.2 Une avancée = une boucle de jours qui appelle tous les domaines
`advanceTo` traite les jours **dans l'ordre chronologique**, un domaine après l'autre, chaque jour :
1. cours (Bourse, Crypto, Immobilier) à la date du jour ;
2. ordres Crypto en attente (limite, stop, take-profit) évalués sur les bougies du jour ;
3. événements (historiques et aléatoires reproductibles) ;
4. intérêts et échéances de prêts, appels de marge, ventes forcées ;
5. passage de mois : loyers, impôts, charges, travaux (le règlement mensuel de l'Immobilier) ;
6. fin d'année : instantané de classement.
Tout se passe **dans une seule transaction par pas** (un jour ou un lot de jours) avec verrou sur la ligne du joueur : deux onglets ou un double clic ne peuvent pas avancer deux fois (le client envoie la date de départ qu'il croit être la bonne ; si elle a changé, le serveur refuse).

### 3.3 « Arrêt automatique » et récapitulatif
Chaque étape renvoie, en plus de ses effets, une liste d'**événements notables** avec une gravité. `advanceTo` s'arrête **le jour même** dès qu'un événement « important » apparaît et renvoie un **récapitulatif** (période parcourue, événements, variation du patrimoine par domaine, ordres exécutés). « Avancer jusqu'au prochain événement » est la même boucle avec un plafond de sécurité (par exemple 366 jours par appel) pour ne pas bloquer le serveur.

### 3.4 Lecture automatique ×1/×10/×100
La vitesse est un **minuteur côté navigateur** qui envoie des demandes d'avancée courtes (par exemple 1, 10 ou 100 jours par seconde selon la vitesse, jamais plus qu'un maximum fixé par le serveur). Le serveur ne fait confiance à rien : il applique son propre plafond, s'arrête sur les événements importants, et le navigateur se met en pause quand la réponse dit « arrêt : événement ». Limite de débit adaptée (la lecture ×100 fait beaucoup d'appels). **Pause = le minuteur s'arrête**, aucun état serveur à gérer.

### 3.5 Prêts, loyers, classements
- **Prêts** : `clockTotal` (année, jour ou mois selon le domaine) est remplacé par la **date**. Les prêts à échéance mensuelle règlent au passage de chaque mois ; les prêts sur portefeuille accumulent les intérêts **au jour le jour** (au lieu d'une fois par an en Bourse), réglés à la fin du mois. Les colonnes existantes (`last_clock_total`) restent pour la transition puis sont remplacées.
- **Immobilier** : les mensualités, loyers et événements restent mensuels ; le règlement mensuel s'exécute quand la date franchit le 1er du mois.
- **Classements** : on garde la comparaison « à date égale » : l'instantané est pris à la fin de chaque **année simulée** (comme aujourd'hui `Y2010`…) et après chaque action ; avec une seule horloge, deux joueurs sont comparés à la même année simulée **dans tous les domaines à la fois**.
- **Instantanés du patrimoine** : nouvelle table `wealth_snapshots(user_id, date, liquidités, titres, immobilier net, dettes)` écrite à chaque passage de mois (et à chaque action importante). Elle sert au graphique de patrimoine (voir 6g) ; sans elle, aucun historique n'existe.

### 3.6 Ce qu'il faut refactoriser
| Élément | Aujourd'hui | Demain |
|---|---|---|
| `tradingService.advanceYear` | avance d'un an, applique prêt et snapshot | supprimé : devient un appel à `advanceTo` avec filtre Bourse |
| `clockService` (Crypto) | date en millisecondes, pas jour/semaine/mois | lit `sim_clocks`, la heure du jour est minuit UTC |
| `realEstateLifeService.advanceTime` | mois | idem, via la date |
| `settleMonth` et les prêts | `clockTotal` par domaine | date unique |
| `getPriceAtYear` (Bourse) | un cours par an | **il faut un cours par date** (voir 5.1) |
| Bandeau de cours, Marché, page Crypto, Bourse, Immobilier | chacun avec son état de date | un seul composant « barre du temps » partagé |
| Création du compte Crypto avec choix de la date de départ | par domaine | choix unique à la première partie |

---

## 4. Migration des joueurs dont les domaines sont à des dates différentes
Objectif : **personne ne gagne ni ne perd de valeur** à cause de la migration, et personne ne peut voyager dans le temps.

Trois voies, de la plus simple à la plus fidèle :

- **M1 : valorisation neutre puis redémarrage commun (recommandée pendant le test fermé).** Pour chaque domaine, on calcule la **valeur nette à sa date actuelle** (positions au prix du jour, capital immobilier net de dette). On la transforme en **liquidités sans frais ni impôt** (écriture de registre `clock_migration`, nature « échange », donc neutre pour les statistiques), on solde les prêts avec ce produit, et on place le joueur sur la **date de départ commune** choisie. Le **patrimoine total est identique avant et après** (vérifié par un test et par un rapport par joueur). Contre-partie : on perd les positions et les biens en cours : acceptable à ce stade, à annoncer clairement, et c'est ce qui élimine tout risque de triche.
- **M2 : rattrapage des domaines en retard.** On avance les domaines en retard jusqu'à la date la plus avancée **avec les mêmes règles que le jeu normal** (loyers, intérêts, événements) mais **sans que le joueur agisse**. Fidèle, mais peut déclencher des ventes forcées ou des appels de marge pendant le rattrapage, donc modifie la valeur : à éviter sauf accord du joueur.
- **M3 : figer les domaines en avance** jusqu'à ce que l'horloge unique les rattrape. Aucune valeur perdue, mais deux régimes à gérer longtemps et des écrans compliqués.

**Recommandation : M1 maintenant, et construire l'horloge unique avant toute ouverture au public** (après, on ne pourra plus faire M1 sans fâcher des joueurs).

Sécurité de la migration : sauvegarde obligatoire avant, rapport « avant/après » par joueur (patrimoine, dette), script rejouable à sec sur une copie de la base, aucun joueur ne peut agir pendant le script (maintenance courte).

## 5. Les trois questions demandées

### 5.1 Quelle plage historique commune ?
| Domaine | Début des données | Fin des données | Nature |
|---|---|---|---|
| Bourse | 2010 | 2026 | **séries annuelles simplifiées, pas des cours réels** |
| Crypto, ancien domaine « annuel » | 2013 | 2026 | séries annuelles simplifiées (5 actifs), pas des cours réels |
| Crypto, marché simulé | selon l'actif ; départs proposés : 1er janvier **2014**, 2017, 2020, 2021, 2022 | **dernière bougie importée** (donc la date de ton dernier import) | **cours réels** après `npm run crypto:import` ; sinon jeu fictif « DEMO » |
| Immobilier | 2010 | 2026 | catalogue **fictif** |
| Banque (taux de base) | 2010 | 2026 | table annuelle de jeu |

**Plage commune : du 1er janvier 2014 (premier départ Crypto proposé) à la dernière date importée en Crypto**, jamais après 2026. Conséquences :
- Les départs possibles pour **tout** le jeu sont ceux de la Crypto : 2014, 2017, 2020, 2021, 2022 (on garde ces scénarios, qui ont un sens historique).
- **Il faut avoir lancé l'import des cours réels** avant d'ouvrir la partie, sinon le jeu tourne sur des données fictives.
- La date de fin du jeu est `min(fin Crypto, 2026)` ; arrivé là, « fin des données : tu ne peux plus avancer ». Quand l'import est refait plus tard, la fin recule.
- **À régler avant** : la Bourse n'a que des cours **annuels**. Une horloge au jour exige un cours **par date** (voir ci-dessous).

*Attention, c'est un vrai chantier de données* : la Bourse et l'Immobilier n'ont pas de données journalières. Deux voies : (a) **escalier annuel** (le cours change une seule fois, le 31 décembre ; aucune anticipation possible ; simple, mais plat entre deux années) ou (b) de **vrais cours journaliers** pour la Bourse (une vraie source, avec licence à vérifier : à choisir dans une analyse séparée). **Recommandation : (a) pour la première version**, puis (b).

### 5.2 Comment gérer un actif qui n'existe pas encore à la date de jeu ?
Aujourd'hui, c'est déjà géré pour la Crypto : un actif n'apparaît qu'à partir de sa **première bougie importée** (`first_candle_at`), jamais avant ; l'ancien domaine annuel renvoie « pas de prix » avant l'année de lancement ; un actif sans cotation depuis 7 jours ne peut plus être acheté. Avec l'horloge unique, la règle devient générale :
1. **Pas de prix ⇒ pas listé** : un actif absent à la date n'est ni affiché dans la liste d'achat, ni cherchable, ni valable dans un ordre limite (le serveur refuse).
2. **Dans la liste** : « Lancé le 14 mars 2018 » grisé, sans prix, avec une explication (« cet actif n'existait pas encore à ta date »). Aucune donnée postérieure n'est renvoyée, même la date de lancement : on affiche seulement l'année où il apparaîtra si on veut un indice (à décider).
3. **Quand la date de lancement est franchie** : l'actif devient achetable ; un événement discret « nouvel actif disponible » peut apparaître dans le récapitulatif.
4. **Classements et risque** : le calcul ne regarde que les actifs existants ; les corrélations utilisent seulement l'historique disponible.
5. **Actifs qui disparaissent** : règle actuelle conservée (vente possible au dernier cours, achat refusé).

### 5.3 Le mode Direct plus tard
Bourse et Crypto seulement, **portefeuille, classement et horloge séparés** (`mode = 'live'`, date = maintenant, aucune avancée possible) : ses propres lignes dans `virtual_portfolios`, `leaderboard_rankings`, `crypto_accounts`. Les pièces sont une monnaie commune, donc il faut décider d'un **plafond de transfert** entre modes, ou de **soldes séparés par mode** (recommandé : un seul solde, mais un capital engagé séparé par mode et aucun transfert de gains en pièces d'un mode à l'autre). Les cours Direct demandent une source temps réel (licence, coût) : **hors périmètre tant que cette décision n'est pas prise**.

## 6. Risques et tests
| Risque | Test |
|---|---|
| Avancer deux fois (deux onglets, double clic) | demande avec date de départ périmée refusée ; test de concurrence |
| Triche par voyage dans le temps | aucune route n'accepte une date du client ; toutes les routes de données lisent `sim_clocks` ; test : aucune donnée postérieure n'est renvoyée |
| Valeur créée ou perdue à la migration | patrimoine avant = après à la pièce près, sur des cas types (Bourse seule, Immobilier seul, mélange, prêts) |
| Événements manqués quand on avance de 100 jours d'un coup | test : avancer d'un coup = avancer jour par jour (mêmes événements, mêmes prix, même patrimoine) |
| Serveur bloqué par une grosse avancée | plafond par appel, test de durée |
| Prêts : intérêts doublés ou oubliés au changement d'unité | échéanciers avant/après identiques sur des prêts types |
| Fin des données | message clair, aucune erreur serveur |

## 7. Estimation et découpage
| # | PR | Effort | Risque |
|---|---|---|---|
| 1 | Table `sim_clocks` + fonction unique `advanceTo` + « barre du temps » (jour/semaine/mois/trimestre/an), **sans** lecture automatique ; la Bourse lit la date unique | 5 j | **élevé** |
| 2 | Immobilier et Banque sur l'horloge unique (prêts par date, règlement mensuel) | 4 j | **élevé** |
| 3 | Crypto sur l'horloge unique (ordres, événements, prêts) et suppression du choix de départ par domaine | 4 j | élevé |
| 4 | Cours par date pour la Bourse (escalier annuel) + règle « actif absent ⇒ non listé » partout | 3 j | moyen |
| 5 | Arrêt automatique, récapitulatif, « jusqu'au prochain événement » | 4 j | moyen |
| 6 | Lecture automatique ×1/×10/×100 + pause + limites de débit | 2 j | moyen |
| 7 | Migration des joueurs existants (M1) + rapport avant/après + répétition à sec | 3 j | **élevé** |
| 8 | Instantanés de patrimoine par date (`wealth_snapshots`) | 2 j | faible |
| 9 | Mode Direct (plus tard, après décision sur la source de données) | à chiffrer | — |
Total sans le mode Direct : environ **27 jours**, à répartir sur plusieurs semaines. **Les PR 1 à 3 et 7 doivent partir ensemble en production** (sinon deux horloges coexistent).
