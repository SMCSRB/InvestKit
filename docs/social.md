# Amis et guildes

Tout est **réel** (base de données du serveur) : plus aucun profil d'exemple.

## Ce qui est visible, et pour qui
- Un joueur n'expose à ses **amis** et à sa **guilde** que : son nom de joueur (jamais l'e-mail ni le nom civil), son **niveau** et son **XP d'éducation** (somme de `education_progress`, niveau = XP / 500 + 1, règle dans `backend/src/config/socialRules.ts`).
- Personne ne peut parcourir une liste de joueurs : on trouve quelqu'un **uniquement avec son code ami exact** (8 caractères, sans ambiguïté). Un code inconnu et un joueur qui t'a bloqué renvoient **le même message** (le blocage n'est jamais révélé). Dans une guilde commune, un joueur lié à toi par un blocage apparaît « Joueur masqué » (ni nom, ni niveau, ni XP).

## L'XP est décidée par le serveur
Le niveau et l'XP montrés aux amis viennent de la table `education_progress`. **Avant ce lot, le client envoyait lui-même l'XP et n'importe quel identifiant de chapitre** : on pouvait gagner des InvestCoins et de l'XP à l'infini. Désormais `complete-chapter` / `complete-domain` refusent tout chapitre ou domaine absent du catalogue (`backend/src/data/educationCatalog.ts`, généré depuis `data/education.js`, test de fraîcheur) et fixent l'XP côté serveur (100 par chapitre, 500 par domaine, `config/game.ts`). L'XP compte au plus 500 par ligne côté social (anciennes lignes).

## Règles (valeurs de jeu, à reconfirmer : `socialRules.ts`)
100 amis maximum ; 20 demandes envoyées en attente ; 50 demandes reçues en attente ; guilde de 30 membres ; nom de guilde 3 à 24 caractères (lettres, chiffres, espace, `'`, `_`, `-`), unicité sans tenir compte des accents ni de la casse ; description 140 caractères.
Actions limitées à 40 par 10 minutes et par IP (`socialWriteLimiter`).

## Amis
Demande par code → l'autre accepte ou refuse (l'auteur peut annuler). Deux demandes croisées = amitié immédiate. Bloquer retire l'amitié et empêche toute nouvelle demande dans les deux sens ; l'autre n'est pas prévenu. Notifications réelles : demande reçue, demande acceptée, retrait d'une guilde.

## Guildes
Une guilde par joueur. Le **chef** (rôle `owner`) voit le code d'invitation, peut le changer, retirer un membre, passer la guilde à un membre, la dissoudre. Un membre peut quitter. Retirer un membre renouvelle le code d'invitation (sinon il reviendrait aussitôt). Chef parti ou compte supprimé : le membre le plus ancien reprend ; guilde vide : supprimée. Classement interne par XP.

## Pas (encore) de messagerie
Pas de discussion libre, de messages privés ni d'annonces : cela demande de la modération (signalement, filtrage, âge des joueurs). À décider avant de l'ouvrir. Un administrateur ne peut pas encore supprimer une guilde au nom offensant : à prévoir avant l'ouverture au public (aujourd'hui : action en base).

## RGPD
L'export du compte contient code ami, amitiés (identifiant de l'autre joueur et état seulement), blocages et guilde. La suppression du compte efface tout en cascade (amitiés, blocages, appartenance) ; les actions sensibles sont dans le journal d'audit (`social.*`).

## Technique
Migration `037_social.sql` ; `backend/src/services/socialService.ts` ; routes `/api/v1/social/*` (voir OpenAPI) ; interface `app/components/social/SocialHub.jsx` (pages `/friends` et onglet Amis du tableau de bord) ; tests `backend/tests/social.test.ts`.
