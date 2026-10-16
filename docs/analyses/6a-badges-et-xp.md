# 6a. Badges, XP, niveaux, séries : état des lieux et proposition

*Analyse sans code, faite le 3 octobre 2026 sur la branche `release/design-complet` (PR #92 à #95 fusionnées). Rien n'a été modifié dans le site.*

## En deux phrases
Aujourd'hui, l'XP n'est vraiment enregistrée par le serveur que pour les quiz de cours ; les **badges, les niveaux affichés et la « série » d'éducation vivent dans le navigateur du joueur** (donc falsifiables, perdus si on change d'appareil), et plusieurs sont **impossibles à obtenir**. Je propose un système serveur unique (journal d'XP + règles de badges vérifiées par le serveur), avec une série « douce » sans pression, branché sur le futur espace Éducation, le tableau de bord et la règle « profil privé ».

---

## 1. Ce qui existe aujourd'hui (audit)

### 1.1 XP et niveaux
| Sujet | Où | Ce que fait le code |
|---|---|---|
| XP serveur | table `education_progress` (colonne `xp_earned`) | 100 XP par chapitre (premier quiz réussi), 500 XP pour le quiz final d'un domaine (`config/game.ts`). Une ligne par chapitre : impossible de gagner deux fois. |
| Niveau | `config/socialRules.ts` et `EducationContext.jsx` | `niveau = XP ÷ 500 (arrondi bas) + 1`. Même formule des deux côtés. |
| XP « classement » (amis, guildes) | `socialService.xpFor` | somme des `xp_earned` du serveur, plafonnée à 500 par ligne. |
| XP affichée sur le profil et le tableau de bord | `EducationContext` (navigateur, `localStorage`) | **ajoute en plus +50 XP « premier essai » qui n'existent pas côté serveur**. Le niveau affiché à toi peut donc être différent du niveau que les autres voient dans les classements. |
| Contenu total gagnable | catalogue serveur | parcours `crypto` : 10 chapitres + quiz final = 1 500 XP ; `crypto_market` : 5 chapitres + final = 1 000 XP. **Total : 2 500 XP, soit le niveau 6.** |

### 1.2 Badges (trois systèmes qui ne se parlent pas, aucun sur le serveur)
1. **Badges d'éducation** (`EducationContext`, page profil) : 3 badges (« Premier sang », « Parfait », « Sans erreur »). Calculés dans le navigateur.
2. **Badge de domaine** : une icône donnée après le quiz final (`domain.badge`), calculée dans le navigateur.
3. **21 badges du tableau de bord** (`badgeDefinitions`, `dashboard/page.jsx`) : rareté commun → unique, catégories (étape, éducation, événement, saison, secret), enregistrés dans `localStorage`.
   - Seules deux familles se déclenchent : **par niveau** (1, 10, 15, 20, 50) et **par cours terminé**. Les badges de saison, d'événement et « secrets » (13 sur 21) n'ont **aucun code qui les attribue**.
   - **Niveaux 10, 15, 20, 50 : inatteignables** (le contenu total donne le niveau 6 ; le niveau 10 demande 4 500 XP, le 50 demande 24 500 XP).
   - **Badges de cours cassés** : la liste des domaines terminés contient des objets `{domainId, date}` alors que le test cherche un texte (`'crypto'`), et les domaines « stocks » et « realestate » n'ont pas de cours : ces badges ne se déclenchent jamais.
   - Le champ `rarity_percent` (« 98,5 % des joueurs », « 0,1 % »…) est **inventé** : c'est un faux chiffre affiché comme une statistique.
   - L'XP promise par chaque badge (50 à 1 000) n'est ajoutée nulle part.
4. Le serveur le sait : `bankRecoveryService` écrit que les badges « seront retirés quand ils seront rattachés au serveur ».

### 1.3 Séries
- **Série de jours (serveur)** : `users.daily_streak`, récompense quotidienne `50 + 10 × (jour − 1)` pièces, plafonnée au 30e jour (**340 pièces par jour**). Un jour manqué remet la série à 1.
- **« Série » d'éducation (navigateur)** : compte les chapitres réussis d'affilée, ne se remet jamais à zéro tout seul : ce n'est pas une série de jours malgré son nom.

### 1.4 Classements, saisons
- Classements de trading par domaine et par année simulée (`leaderboard_rankings`, période `Y2010`…), en pourcentage de performance, capital minimum 100 pièces. Classement Immobilier idem. Classement d'XP entre amis et dans la guilde.
- **Pas de saisons** côté serveur (le mot n'apparaît que dans les badges de saison inventés et dans le catalogue immobilier).
- **Fil d'activité des amis** : propre au navigateur, pas réel (déjà noté dans `docs/dashboard-reel.md`).
- **« Profil privé » n'existe pas** côté serveur : seul `show_pro_badge` (cacher la couronne) existe. Le classement mondial affiche le pseudo de tous les joueurs classés.

### 1.5 Récompenses en pièces liées à la progression
Quiz : 20 pièces par chapitre, 100 par domaine (une fois). Checklist d'accueil : 10 pièces par étape (6 étapes, une fois chacune). Série quotidienne : voir 1.3. Parrainage : 100 pièces par filleul vérifié (sans plafond, acceptable en test fermé). Tout passe par le registre des pièces, avec idempotence côté serveur.

### 1.6 Problèmes à retenir
1. Rien de vérifiable : un joueur peut s'attribuer n'importe quel badge en éditant son navigateur (les badges ne rapportent rien aujourd'hui, mais le risque existe dès qu'ils rapporteront).
2. Niveau affiché ≠ niveau des classements.
3. Badges inatteignables ou cassés, faux pourcentages de rareté.
4. La récompense quotidienne croissante est une **pression à venir tous les jours** (reset à 1 si on manque un jour) : contraire à la règle d'engagement sain.

---

## 2. Proposition

### 2.1 Principes (règle d'engagement sain)
- Aucune fausse urgence, aucun compte à rebours, aucune culpabilisation, aucune notification de rappel « ne perds pas ta série ».
- **Le serveur décide de tout** : l'XP, les niveaux, les badges et leurs récompenses ne viennent jamais du navigateur.
- **Chaque gain est tracé** dans un journal ; **chaque gain est plafonné** ; **aucun gain en boucle** (clé d'unicité par événement).

### 2.2 Journal d'XP
Nouvelle table `xp_events` (en ajout seul) : joueur, **domaine** (`education`, `bourse`, `crypto`, `immobilier`, `banque`, `communaute`), source (`lesson`, `mini_question`, `quiz`, `domain_final`, `first_trade`, `risk_check`…), **clé d'unicité** (par exemple `quiz:crypto:3`), montant, date.
- **XP globale = somme de tout** ; **XP par domaine = somme du domaine**. Jamais de colonne « total » à mettre à jour à la main : le total se recalcule.
- La clé d'unicité `(joueur, source, clé)` empêche tout double gain, y compris avec deux onglets ou un double clic.
- **Plafond quotidien** par domaine et par source (valeurs de jeu à reconfirmer, ex. 300 XP de leçons par jour) : au-delà, l'action reste possible mais ne rapporte plus d'XP ce jour-là, sans message culpabilisant (« tu as déjà bien avancé aujourd'hui »).
- Les actions de trading ne rapportent de l'XP que pour des **premières fois** (premier achat, première vente, premier prêt remboursé…), jamais au volume : sinon on encourage le trading compulsif.

### 2.3 Niveaux avec titres
Courbe progressive (au lieu de 500 XP fixes) et un **titre** par palier, par exemple : 1 Curieux · 3 Apprenti · 5 Initié · 8 Investisseur · 12 Stratège · 18 Expert · 25 Maître. Les valeurs seront ajustées pour que l'ensemble du contenu (aujourd'hui 2 500 XP, bien plus après la refonte de l'Éducation) mène aux niveaux « Stratège / Expert » et que le dernier palier demande un vrai parcours. Niveau global + niveau par domaine (affiché seulement quand il a un sens).

### 2.4 Badges
- **Catégories** : Apprentissage · Pratique (premières fois) · Régularité · Prudence (diversification, pas de levier excessif) · Domaine (un par domaine terminé) · Communauté · Événements (plus tard).
- **Raretés** : Commun, Rare, Épique, Légendaire. **La rareté affichée est calculée sur les vrais joueurs** (part réelle de joueurs qui l'ont), masquée tant qu'il y a moins de 50 joueurs, pour ne plus afficher de faux chiffres.
- **Définitions en code** (`config/badgeRules.ts`), chacune avec une **condition pure** qui lit uniquement des faits du serveur (quiz réussis, ordres exécutés, jours actifs, dette remboursée…). Table `user_badges` : joueur, badge, date, référence du fait déclencheur. Clé unique : un badge ne s'obtient qu'une fois.
- **Récompenses limitées et tracées** : un badge peut donner de l'XP et, pour les plus rares, quelques pièces ; versement unique, écriture `badge_reward` dans le registre des pièces, plafond global de pièces par type de badge (VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER).
- **Notification unique** : le serveur crée une notification à l'attribution (table `notifications` existante) ; le navigateur n'a plus besoin de retenir « annoncé ou non ».
- Les badges **secrets / saisonniers** : on ne les crée que lorsque leur condition est codée et testée (aucun badge « promis » sans règle).

### 2.5 Série « douce » (remplace la série de jours)
- On compte des **jours actifs** (un jour avec au moins une action utile) sur une fenêtre glissante, par exemple « 5 jours actifs ces 7 derniers jours », pas des jours d'affilée.
- **Pas de remise à zéro punitive** : manquer un jour ne casse rien ; un « jour de repos » est offert automatiquement chaque semaine.
- **Récompense quotidienne plate et petite** (plus de montant croissant) : voir 6b, car 340 pièces par jour aujourd'hui sont incompatibles avec l'économie.
- Aucun texte du type « il ne te reste que X heures ».

### 2.6 Liens avec le reste
1. **Refonte de l'Éducation** (leçons en petits écrans, mini-questions, quiz, quiz final, parcours débutant → expert) : chaque étape émet un événement d'XP avec une clé stable (`lesson:crypto:3:2`, `mini:…`, `quiz:…`, `final:…`). Les mini-questions rapportent peu d'XP (plafonnées par jour), les quiz davantage, le quiz final le plus ; un parcours terminé donne un badge de domaine. Les niveaux « débutant / intermédiaire / avancé » du parcours sont des étiquettes ; les badges de parcours se débloquent quand le serveur voit tous les quiz réussis. L'idempotence de l'actuel `submit-quiz` est reprise telle quelle.
2. **Tableau de bord** : « jours actifs de la semaine », niveau et titre avec la barre vers le suivant, **rang** au classement (seulement si le joueur y est visible), **activité des amis** (voir 3) construite sur des événements réels (badge obtenu, niveau gagné) et non sur le faux fil actuel.
3. **Profil privé** : nouveau réglage serveur `profile_visibility` (`public`, `amis`, `prive`). Un profil **privé n'apparaît pas dans les classements publics** (ou apparaît comme **« Joueur anonyme »** avec son rang mais sans pseudo, photo, #, badges), n'envoie aucune activité à ses amis, et ses badges ne sont visibles que de lui. Il continue de voir son propre rang. Les classements d'amis et de guilde restent visibles de leurs membres. Le classement s'appuie déjà sur `cardsFor` / `getBoard` : c'est le bon endroit pour appliquer la règle une seule fois.

---

## 3. Migration sans perte pour les joueurs existants
1. **L'XP existante vient du serveur** : à la mise en service, on écrit un événement `legacy_import` par ligne de `education_progress` (clé = identifiant de la ligne) avec le même montant. Le total ne change pas.
2. **Le bonus « premier essai » local (+50)** n'a jamais été enregistré : on ne peut ni le vérifier ni le retirer. Proposition : le créditer **une seule fois** à tous les joueurs ayant au moins une ligne d'éducation (50 XP par chapitre réussi, calculé par le serveur), pour qu'aucun niveau visible ne baisse. Effet : léger gonflement unique, sans conséquence sur le classement (le classement actuel ne l'incluait pas, donc il ne change que dans le bon sens).
3. **Badges du navigateur : non importés** (non vérifiables). Ils sont **recalculés** à partir des faits du serveur : un joueur qui a vraiment terminé un domaine retrouve son badge de domaine sans rien faire. Les badges impossibles à obtenir (niveaux 10+, saisons inventées) disparaissent ; message d'information unique « tes badges ont été remis à jour ».
4. **Série de jours** : on conserve la valeur actuelle comme « record » affiché, sans la perdre ; la nouvelle mesure démarre à partir des 7 derniers jours d'activité visibles dans le registre.
5. **Réversible** : tout est additif (nouvelles tables, aucune colonne supprimée) ; l'ancien affichage reste utilisable tant que le nouveau n'est pas activé par un drapeau (`featureFlagService` existe).
6. **Aucun joueur ne perd ni pièces ni progression.**

## 4. Sécurité et tests à prévoir
- Un même événement envoyé deux fois, en parallèle, ne donne qu'une fois (test de concurrence comme `submit-quiz`).
- Plafond quotidien : au-delà, aucun XP, aucune erreur bruyante.
- Un client qui envoie son propre niveau, XP ou badge : ignoré (le serveur ne lit rien de tel).
- Conditions de badges testées une par une avec des faits simulés ; aucun badge sans test.
- Profil privé : un joueur privé n'apparaît dans aucune réponse publique (classement mondial, recherche, fiches), vérifié sur chaque route qui liste des joueurs.
- Le registre des pièces reste cohérent : toute récompense de badge est une écriture tracée (`badge_reward`) ; test de somme registre = solde.

## 5. Découpage en petites PR (ordre conseillé)
| # | PR | Effort | Risque |
|---|---|---|---|
| 1 | Journal d'XP serveur + niveaux/titres + import de l'existant (sans changer l'affichage) | 3 j | faible |
| 2 | Règles de badges + attribution + notification unique + nettoyage des faux pourcentages | 3 j | moyen |
| 3 | Affichage : profil, tableau de bord, page Éducation lisent le serveur (suppression des copies locales) | 3 j | moyen |
| 4 | Série douce + récompense quotidienne plate (dépend de 6b) | 2 j | moyen (équilibrage) |
| 5 | `profile_visibility` + règle « Joueur anonyme » dans tous les classements | 3 j | moyen (beaucoup de routes) |
| 6 | Branchement du nouvel espace Éducation (quand il existera) | 2 j | faible |
| 7 | Saisons (optionnel, plus tard) | 3 j | faible |

Total : environ 16 jours de travail hors refonte Éducation. Les PR 1 à 3 apportent déjà l'essentiel (fiabilité) ; la PR 5 est indépendante et peut être faite en premier si la confidentialité est prioritaire.
