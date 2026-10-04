# Fiche de source : frais de notaire par département (PR 4)

**À lire par Andreja sur les pages officielles AVANT de t'y fier.** Mon environnement ne peut pas ouvrir `impots.gouv.fr`, `notaires.fr` ni `legifrance.gouv.fr` (accès réseau bloqué, testé le 5 octobre 2026) : tout vient de **résumés de recherche** ou de ma mémoire, et reste **à confirmer**.

## Ce que calcule le jeu pour l'ANCIEN (`backend/src/config/notaryRules.ts`, `backend/src/engine/immo/notaryDepartment.ts`)
`frais = droits de mutation (taux du département à la date de jeu) + émoluments du notaire (barème réglementé par tranche) + TVA 20 % sur les émoluments + contribution de sécurité immobilière 0,10 % + frais divers`. Exemple chiffré à 200 000 euros en Gironde après mai 2025 : droits 12 640 + émoluments 1 995,25 + TVA 399,05 + CSI 200 + divers 1 000 = environ 16 234 euros, soit **8,1 %** (contre 7,5 % forfaitaire avant). Dans les Alpes-Maritimes (5,81 %) : environ 7,8 %.
Le **neuf** reste à **2,5 %** (milieu de la fourchette de 2 à 3 % citée par un résumé), faute de source plus précise. **Pas branché au moteur actuel** (catalogue fictif sans département) : seule la simulation de niveau (`immo:simulate-niveau`) l'utilise, ville par ville.

## Valeurs, source et ce qu'il reste à relire
| Paramètre | Valeur utilisée | Source (non confirmée) | Doute / ligne à relire |
|---|---|---|---|
| Droits de mutation, taux de base | 5,80665 % (département à 4,5 %) | résumés de recherche (toutsurmesfinances, cpim) | **Tableau officiel** [impots.gouv.fr, droits d'enregistrement : taux](https://www.impots.gouv.fr/sites/default/files/media/1_metier/3_partenaire/notaires/dmto/dmto_2026-02.pdf) : valeur exacte, décomposition |
| Droits de mutation, taux relevé | 6,32 % (département à 5 %) | idem ; hausse permise à partir du 1er avril 2025 pour 3 ans (loi de finances 2025) | Valeur exacte (6,32 % ou 6,3185 %…), durée de la mesure |
| Départements restés à 4,5 % | Hautes-Alpes, **Alpes-Maritimes**, Ardèche, Charente, Drôme, Lozère, Oise, Hautes-Pyrénées, Saône-et-Loire, Guadeloupe, Mayotte (11, au 1er juin 2026) | résumé de recherche | **Liste officielle** : parmi nos 12 villes, seules les Alpes-Maritimes (Nice) sont concernées |
| Date de la hausse par département | 1er avril 2025 : Côte-d'Or, Haute-Garonne, Hérault, Ille-et-Vilaine, Loire, Loire-Atlantique, Rhône ; 1er mai 2025 : Bouches-du-Rhône, Gironde | résumé de recherche | **Paris (75) et Nord (59)** : date **non trouvée**, j'ai supposé le **1er avril 2025** (hypothèse à relire) |
| Émoluments proportionnels | 3,870 % jusqu'à 6 500 €, 1,596 % jusqu'à 17 000 €, 1,064 % jusqu'à 60 000 €, 0,799 % au-delà (HT) | ma mémoire du barème réglementé | **À relire** : notaires.fr / Code de commerce art. A444-174 ; remises facultatives du notaire non modélisées |
| TVA sur les émoluments | 20 % | usage courant | À relire |
| Contribution de sécurité immobilière | 0,10 % du prix | résumés de recherche | À relire (minimum de perception éventuel) |
| Frais divers (débours, formalités) | **1 000 €** | **aucune** | **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER** |
| Neuf | 2,5 % | résumé de recherche (2 à 3 %) | À relire ; droits réduits de 0,715 % mentionnés par un résumé |

## Règles
- **Avant le 1er avril 2025** (ou dans un département resté à 4,5 %) : taux de base 5,80665 % ; **jamais un taux relevé avant sa date**.
- Le taux effectif **baisse quand le prix monte** (barème dégressif, frais fixes) : entre 7 et 9 % pour des prix de 80 000 à 600 000 euros, un peu plus pour un très petit prix.
- **Rien n'est téléchargé**, aucune base n'est lue.
