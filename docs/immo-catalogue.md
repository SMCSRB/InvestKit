# Catalogue immobilier fictif (étape 2)

Code : `backend/src/data/realEstate/`. Tests : `backend/tests/realEstateCatalog.test.ts`.

## Principe : une interface, plusieurs sources
`RealEstateDataSource` (fichier `types.ts`) est le contrat que remplit toute
source de données : villes, marché d'une ville pour une année, taux de crédit,
annonces, expertise. Le reste du jeu n'appelle que `getRealEstateDataSource()`.
**Passer aux vraies données DVF** = écrire une source qui respecte ce contrat,
l'ajouter dans `index.ts` et régler `REAL_ESTATE_SOURCE=dvf`. Rien d'autre à changer.

## Contenu de la source `fictive`
- 8 villes **imaginaires** (métropole, grandes villes, ville étudiante, bourg rural, ancienne ville industrielle…), 56 annonces (studio, T2, T3, maison, T2 à rénover).
- Années 2010–2026. Prix et loyers évoluent année par année : cycle national **fictif** + tendance et aléa propres à chaque ville.
- **Déterministe** : graine fixe, l'aléa dépend seulement de (ville, année). Mêmes appels = mêmes résultats, sur tout serveur, dans n'importe quel ordre.
- Taux de crédit **fictifs** par année et par durée.
- **Expertise** : l'annonce ne montre que les travaux annoncés ; la vérité (travaux réels, défauts cachés) n'est révélée que par `getExpertise`. ~30 % des biens ont un défaut caché.

## Réglages de jeu
`config/immoRules.ts` : frais de notaire (7,5 % ancien / 2,5 % neuf, milieu des fourchettes officielles, à reconfirmer), profils de départ (revenus, charges, reste à vivre), règles bancaires.
