# Guide du site (lot A)

Un guide pour un **débutant total**, en deux formats qui partagent **la même source** (`app/lib/guide.js`) :
- **Le parcours du premier lancement** : six cartes courtes (InvestKit c'est quoi, le temps, les modes, les domaines, récompenses et classements, bêta). Il s'ouvre une seule fois, pour un joueur connecté, sur une page du jeu (pas sur la connexion, l'administration ni l'accueil). On peut le **passer** (bouton Passer, croix ou touche Échap) et il ne revient pas tout seul. Mémorisé dans le navigateur (`ik-guide-seen-v1`) : sur un autre appareil il s'ouvre une fois de plus.
- **La page d'aide complète** : `/guide`, mêmes rubriques en détail, avec la liste des modes (disponible ou non), les quatre domaines, et des liens vers le glossaire et les cours.
- **« Aide et support »** (`/support`, avant : simple redirection vers Contact) : relancer le parcours, ouvrir le guide, glossaire et cours, contact. « Guide du site » a aussi son entrée dans le menu.

## Règles de rédaction
- Français simple, tutoiement, mobile (testé à 390 px). Aucun emoji ; l'icône de pièce remplace le symbole de l'euro pour les montants du jeu (on écrit « 1 InvestCoin vaut 1 euro de jeu » avec la précision « aucune valeur réelle »).
- **Le guide pointe, il ne répète pas** : mots du glossaire, cours de chaque domaine, pages du site. Les règles détaillées restent à leur place.
- **Aucun chiffre écrit en dur** : ils viennent de `app/lib/siteFacts.js`, et un test les compare aux réglages du serveur (capital de départ, récompense du jour, jours payés par semaine, seuil de classement, jours actifs, nombre de niveaux, nombre d'actifs Crypto).
- **Modes** : Histoire « disponible aujourd'hui » ; Bac à sable et En ligne « pas encore disponibles », avec les règles d'accès décidées (En ligne : plan Pro ; Bac à sable : périodes déjà jouées pour un compte gratuit, choix libre pour le Pro). La liste vient de `MODE_AVAILABILITY` (`backend/src/config/clockRules.ts`), la même que celle du serveur : quand un mode ouvrira, on change cette seule valeur et un test rappelle de mettre le guide à jour.

## Valeurs de jeu citées
Récompense du jour, jours payés par semaine, seuil de classement, jours actifs, nombre de niveaux, capital de départ : **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER** (déjà listées dans `docs/PARAMETRES-A-RECONFIRMER.md` ; le guide les affiche depuis `siteFacts.js`).

## Tests
`backend/tests/guideDuSite.test.ts` (17) : rubriques, exactitude des chiffres, modes, tous les liens existent, aucun emoji ni « € », parcours passable. `e2e/guide.spec.ts` (4, exécution à part à 390 px) : six étapes sans défilement horizontal, Passer et Échap, relance depuis « Aide et support », page Guide.
