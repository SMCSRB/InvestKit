# Graphique en aires empilées (6g, étape G2)

Composant `StackedArea` (`app/components/ui/charts.jsx`), prêt pour le futur graphique de patrimoine par domaine. **Il n'est branché sur aucune page du jeu** : seulement la démo de `/design-system`.

## Règles
- Une seule échelle, jamais de double axe ; couleurs = `--ik-series-1…` dans l'ordre ; légende dès 2 séries ; 2 px d'espace entre les aires.
- Les valeurs négatives (dettes) ne sont **pas dessinées** (règle dans `app/lib/stack.js`, testée) ; elles restent visibles dans l'infobulle et dans le tableau. Le futur graphique de patrimoine montrera les dettes à part.
- Lecture : survol, toucher, ou **clavier** (flèches gauche/droite, Échap). Tableau équivalent pour les lecteurs d'écran.
- Mobile : vérifié à 390 px sans défilement horizontal (contrôle manuel dans un navigateur : la page `/design-system` n'existe qu'en développement, donc la CI, qui teste une version de production, ne peut pas la visiter).
