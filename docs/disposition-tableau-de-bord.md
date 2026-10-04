# Disposition du tableau de bord (6g, étape G4) — serveur seulement

Aucune interface ici : ce lot prépare l'enregistrement côté serveur, pour que la future page « Personnaliser » (G5) suive le joueur sur tous ses appareils.

## Règles
- Table `dashboard_layouts` : une ligne par joueur (modèle, liste de blocs, numéro de version). Supprimée avec le compte ; présente dans l'export.
- **Liste blanche de blocs** (`backend/src/config/dashboardLayout.ts`) : patrimoine, solde, Bourse, Crypto, Immobilier, Banque, Éducation, badges, classement, marché. Pas de doublon, au moins un bloc, taille limitée, jamais de HTML.
- **Compte gratuit** : choisit un des 3 modèles de départ (Débutant, Investisseur, Complet). **Plan Pro** : peut aussi envoyer sa propre liste (décision d'Andreja : réorganisation libre réservée au Pro).
- Le droit Pro est lu **en base**, jamais dans la requête ; l'identifiant du joueur vient du jeton.
- Un bloc retiré un jour du catalogue est ignoré à la lecture : la disposition reste valable.
- Par défaut (rien d'enregistré) : modèle Débutant.

## API
`GET /api/v1/dashboard-layout` et `PUT /api/v1/dashboard-layout` (`{ "template": "complet" }` ou, en Pro, `{ "widgets": ["wealth", "crypto"] }`).

## Valeurs de jeu
La composition des 3 modèles et la taille maximale sont des choix d'ergonomie : **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER**.
