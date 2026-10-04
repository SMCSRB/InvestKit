# XP, niveaux et titres (6a, PR 1)

*Ce que le serveur sait faire depuis la PR 1 de 6a. Aucun affichage n'est modifié (le tableau de bord et l'Éducation seront refaits) : la lecture se fait par `GET /api/v1/xp`.*

## Le journal d'XP (`xp_events`)
- Chaque gain d'XP est une **ligne ajoutée**, jamais modifiée : joueur, domaine (`education`, `bourse`, `crypto`, `immobilier`, `banque`, `communaute`), source, clé d'événement, montant, date.
- **Clé d'unicité** `(joueur, source, clé)` : un même événement ne rapporte qu'une fois, même avec deux onglets ou un double clic (verrou par joueur, testé en parallèle).
- **L'XP globale et par domaine se recalculent** à partir du journal : aucune colonne « total » à tenir à jour.
- **Plafond quotidien** par source (jour UTC) pour les sources qui en ont un (`lesson` 300, `mini_question` 100) : au-delà, l'action reste possible, elle ne rapporte plus d'XP ce jour-là, sans erreur ni message culpabilisant. Les quiz de chapitre n'ont pas de plafond propre (déjà une seule fois par chapitre côté serveur).
- **Le client ne décide jamais** : ni XP, ni niveau, ni clé. Un quiz raté ne rapporte rien ; un quiz réussi rapporte le montant fixé par le serveur.
- Chaque chapitre ou quiz final d'éducation validé écrit un événement du même montant (plafonné à 500, comme dans les classements).
- La correction d'abus d'éducation retire aussi du journal l'XP des lignes invalides.
- L'export de compte contient le journal ; la suppression du compte l'efface (cascade).

## Import de l'existant (sans perte)
La migration `048_xp_events.sql` crée un événement `legacy_import` par ligne d'éducation déjà enregistrée par le serveur (même montant, plafonné à 500). Rejouable sans doublon. **Le total de chaque joueur ne change pas.**
**Non importé** : le bonus « premier essai » de +50 XP qui n'existait que dans le navigateur (non vérifiable). À trancher quand l'affichage du niveau sera branché sur le serveur (PR 3 de 6a, reportée) : le créditer une fois pour que les niveaux affichés ne baissent pas, ou l'abandonner.

## Niveaux et titres (`config/levelRules.ts`)
Courbe progressive sur 25 niveaux (l'XP cumulée pour atteindre le niveau n est dans `LEVEL_THRESHOLDS`) et un titre par palier : 1 Curieux · 3 Apprenti · 5 Initié · 8 Investisseur · 12 Stratège · 18 Expert · 25 Maître. Tout le contenu d'éducation actuel (2 500 XP) mène au niveau 9 (Investisseur). **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER** : la courbe sera ajustée avec le nouveau contenu.
`GET /xp` renvoie : XP, niveau, titre, progression vers le suivant, titre du prochain palier, XP par domaine et niveau par domaine (seulement ceux où le joueur a de l'XP), les 20 derniers gains.
L'ancienne formule (500 XP par niveau, `levelFromXp`) reste utilisée par les classements d'amis et de guilde tant que leur affichage n'est pas basculé.

## Badges attribués par le serveur (6a, PR 2)
- **Définitions en code** (`config/badgeRules.ts`) : 19 badges, chacun avec une **condition pure** qui ne lit que des faits du serveur (chapitres validés, quiz finaux, achats, jours actifs, prêts remboursés, amis, guilde, niveau). **Aucun badge sans règle codée et testée** : les badges de saison, d'événement et « secrets » n'existent pas encore.
- Catégories : apprentissage, pratique, régularité, prudence, domaine, communauté. Raretés : commun, rare, épique, légendaire (aucun légendaire pour l'instant : pas de règle).
- Table `user_badges` (migration 049) : clé unique (joueur, badge), avec la **référence du fait déclencheur**. Un badge ne s'obtient qu'une fois, même avec deux onglets.
- **Récompense** : de l'XP seulement (20 / 50 / 100 / 250 selon la rareté), une fois, par le journal d'XP (clé `badge:<id>`). **Aucune pièce** : `coins` reste à 0 tant que l'équilibrage n'est pas décidé.
- **Notification unique** à l'attribution (table `notifications`) : le navigateur n'a plus à retenir « annoncé ou non ».
- **Évaluation** à la lecture (`GET /api/v1/xp/badges`) et après un quiz réussi ; idempotente, et en cascade bornée (l'XP d'un badge peut débloquer un badge de niveau). Une erreur de badge n'empêche jamais une récompense déjà versée.
- **Rareté réelle** : part des joueurs vérifiés qui ont le badge, **masquée (null) tant qu'il y a moins de 50 joueurs** ; plus aucun faux pourcentage côté serveur. (Le champ `rarity_percent` du tableau de bord actuel n'est affiché nulle part ; il disparaîtra avec la refonte.)
- **Anciens badges du navigateur** : non importés (non vérifiables) ; ceux que le serveur peut prouver sont **recalculés** à la prochaine lecture, sans rien faire. Les badges impossibles à obtenir (niveaux 10+, saisons inventées) ne sont pas repris.
- Export de compte : contient les badges. Suppression du compte : badges effacés (cascade).
