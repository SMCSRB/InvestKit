# Immobilier réel et horloge unique : options à décider (rien n'est codé)

*4 octobre 2026. Décision d'Andreja : l'Immobilier réel part de **2021**, aucune source non officielle (les DVF 2014 à 2020 n'existent plus sur les sites officiels). Ce document propose les options, sans choisir à sa place. Il s'appuie sur le code actuel : une seule horloge par joueur (`sim_clocks`), les départs Crypto 2014, 2017 et 2020, des parties Immobilier qui démarrent à l'année de l'horloge (`re_games.data_source`, aujourd'hui « fictive », catalogue 2010 à 2026), des prêts par domaine (`bank_loans.domain`) et la date de fin de jeu = le plus petit des plafonds des domaines (`lastPlayableDay`).*

## En deux phrases
Les prix réels n'existent qu'à partir de janvier 2021 (et seulement de façon stable une fois la fenêtre de 12 mois remplie), alors que l'horloge unique peut partir de 2014. Je recommande **l'option A : l'Immobilier réel s'ouvre quand l'horloge du joueur atteint janvier 2021**, car elle ne casse aucun scénario, ne crée aucune règle exceptionnelle pour la Bourse et la Crypto, et se vérifie simplement côté serveur.

## Les données (ce qui est établi)
- DVF disponibles : **2021 à 2025** pour les 54 quartiers (Paris, Lyon, Marseille par arrondissement), de 2 400 à 33 000 ventes retenues par ville et par an (rapport réel d'Andreja).
- Une médiane glissante sur 12 mois n'est « pleine » qu'à partir de **décembre 2021** : de janvier à novembre 2021 elle repose sur moins de 12 mois de ventes (le rapport l'affiche : « mois de chauffe »). Les petits quartiers retombent alors sur la ville entière.
- À une date D du joueur, seul le **dernier mois entièrement passé** est utilisé (jamais le mois de D, qui contient des ventes postérieures à D).

## Les options

| | **A. S'ouvre en janvier 2021** | **B. « Non disponible dans ce scénario »** | **C. De nouveaux départs 2021 et plus** | **D. Catalogue fictif avant 2021, réel après** | **E. Tout recaler à 2021** |
|---|---|---|---|---|---|
| Principe | Un joueur qui part en 2014 ou 2017 joue Bourse et Crypto ; l'onglet Immobilier affiche « ouvre en janvier 2021 » jusqu'à ce que son horloge l'atteigne | L'Immobilier n'existe que dans les scénarios dont le départ est en 2021 ou après ; les départs 2014, 2017, 2020 n'y ont jamais accès | On ajoute des départs « Début 2021 », « Début 2022 »… (idéal avec B, utile aussi avec A) | Avant 2021 on garde le catalogue inventé, après on passe aux vrais prix | Plus aucun départ avant 2021 |
| Joueur | Un seul monde, pas de scénario perdu ; l'Immobilier devient un objectif à atteindre (comme les périodes à débloquer) | Clair mais frustrant : les 3 départs actuels perdent l'Immobilier pour toujours ; il faut choisir un autre départ | Plus de choix de départs, donc plus de scénarios à maintenir | Immobilier jouable dès le début, mais un **saut de prix** à la jonction 2020/2021 et deux sources de nature différente | On perd l'histoire Crypto 2014 et 2017 (valeur pédagogique forte) |
| Scénarios | Aucun changement ; départs 2014, 2017, 2020 inchangés | Chaque scénario porte la liste de ses domaines disponibles | Nouveaux départs à créer ; la Crypto doit les couvrir | Inchangés | Supprime 3 scénarios |
| Prêts en cours | Aucun prêt immobilier n'existe avant l'ouverture (il faut un achat) ; les prêts sur portefeuille (Bourse, Crypto) ne changent pas ; un joueur déjà endetté en 2014 arrive en 2021 avec ses dettes, sans interaction | Aucun changement pour les départs sans Immobilier | Idem A | **Problème** : un bien acheté avant 2021 serait revalorisé à la jonction sur une autre base, et un prêt de 20 ans traverse la jonction | Hors sujet |
| Classements | Classement Immobilier **séparé par source** (réelle ou fictive) et comparé à la même année de jeu ; les parties fictives restent en dehors | Idem, plus simple (un seul monde par scénario) | Idem | Mélange de deux natures de prix : à éviter | Idem |
| Règle serveur à ajouter | Une date d'ouverture (constante) vérifiée sur le serveur ; blocage clair avant | Une liste de domaines par scénario, vérifiée sur le serveur | Création de scénarios | Gestion de la jonction (complexe) | Suppression de scénarios |
| Risque | Joueur du plan gratuit qui a choisi l'Immobilier comme seul domaine **et** un départ avant 2021 : rien à faire pendant des années de jeu (à traiter : le guider vers un départ 2021, option C) | Même cas, mais traité dès le choix du départ | Charge de maintenance | Élevé | Élevé |

## Points communs à toutes les options (à trancher quelle que soit l'option)
1. **Fin du jeu.** La date de fin = le plus petit plafond des domaines. Si l'Immobilier réel finit en 2025, il fixe la fin pour tout le monde (comportement actuel avec le catalogue fictif, qui finit en 2026). Les DVF sont mis à jour par semestre : la fin avancera. *À décider* : garder cette règle (simple, cohérente) ou laisser l'Immobilier se figer seul.
2. **Parties Immobilier déjà commencées** (catalogue fictif) : décision déjà prise, elles restent sur le fictif jusqu'à la refonte (liquidation à valeur conservée si de vrais joueurs arrivent avant). Les nouvelles parties réelles sont marquées « dvf » (`data_source`).
3. **Mois de chauffe (janvier à novembre 2021).** Ouvrir en janvier 2021 donne des médianes plus bruitées pendant 11 mois ; ouvrir en janvier 2022 donne des fenêtres pleines mais perd un an. *Sous-décision* (je recommande janvier 2021 avec repli sur la ville, tant que le rapport montre assez de ventes par quartier).
4. **Équilibrage banque** (déjà noté dans l'analyse initiale) : les prix réels de 2021 sont à mesurer contre le capital de départ avant toute ouverture.
5. **Loyers** : la Carte des loyers existe en 2018, 2022, 2023, 2024 et 2025 ; 2021 devra être estimé (marqué comme tel).

## Recommandation : option A (avec C plus tard)
- **Pourquoi** : elle garde l'horloge unique intacte, ne retire rien aux scénarios existants, n'invente aucun prix, et s'explique en une phrase au joueur (« l'Immobilier ouvre en janvier 2021, la première année des prix réels »).
- **À côté** : prévoir plus tard (option C) un départ « Début 2021 » pour les joueurs du plan gratuit qui ne veulent que l'Immobilier.
- **Pourquoi pas B** : elle est plus pure mais retire l'Immobilier aux trois départs actuels, ce qui oblige à ajouter des scénarios avant de pouvoir ouvrir quoi que ce soit.
- **Pourquoi pas D et E** : D crée un saut de prix et mélange deux sources ; E détruit l'histoire Crypto 2014 et 2017.

## Ce qui est déjà prêt (étape 3), non activé
L'import des médianes en base (source « dvf », tables `immo_dvf_market` et `immo_dvf_imports`, script `immo:load-dvf` limité aux bases « _test ») et un service de lecture qui n'utilise que des mois entièrement passés. **Rien n'est branché sur le jeu** : `DVF_MARKET_ENABLED = false`, et un test vérifie qu'aucun moteur ni aucune route n'importe ce service. Le choix de ta décision change surtout une constante d'ouverture et la liste des domaines par scénario.
