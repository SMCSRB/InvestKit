# Confidentialité du profil (6a, PR 5)

Trois niveaux, réglés dans **Profil → Confidentialité du profil** et appliqués par le serveur (colonne `users.profile_visibility`, liste fermée) :

| Niveau | Classements publics (Bourse, Crypto, Immobilier) | Amis et guilde | Recherche par pseudo |
|---|---|---|---|
| **Public** (par défaut : rien ne change pour les joueurs existants) | pseudo, photo, # et indicateur Pro visibles | visibles | oui |
| **Amis** | « **Joueur anonyme** » avec son **rang**, sans pseudo, photo, # ni indicateur Pro | visibles normalement | oui |
| **Privé** | comme « Amis » | visibles normalement | **non** : seul le code ami permet de le trouver (même message qu'un inconnu) |

- Le joueur **voit toujours son propre rang** avec son vrai nom.
- Les trois classements publics passent par une seule fonction (`leaderboardRepository.getBoard`) : la règle est appliquée **une seule fois**. Un test vérifie que la vraie route publique ne laisse apparaître aucune trace du vrai nom.
- Les classements d'amis et de guilde restent visibles de leurs membres (ils se sont acceptés).
- Le réglage ne concerne que le joueur connecté (aucun identifiant accepté dans la requête).
- Hors périmètre de cette PR (parce qu'ils n'existent pas encore) : l'activité envoyée aux amis et la visibilité des badges des autres joueurs ; la règle « privé : badges visibles de lui seul » s'appliquera quand une route exposera les badges d'autrui.
