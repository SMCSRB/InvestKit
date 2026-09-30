# Immobilier — valeur verte (effet du DPE sur le prix et la valeur)

Décision produit : ajouter la « valeur verte » juste après la Banque.

## Sources (recherche web du 2026-09-29, à reconfirmer sur les études des Notaires de France)
- Appartement : environ −4 % par classe perdue ; classe G environ −12 % par rapport à D.
- Maison : environ −8 % par classe perdue ; classe G environ −25 % par rapport à D ; classe A environ +17 %.

## Règle (`GREEN_VALUE_FACTORS` dans `backend/src/config/immoRules.ts`, facteurs par rapport à D)
| Classe | A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|---|
| Appartement / studio | 1,12 | 1,08 | 1,04 | 1 | 0,96 | 0,92 | 0,88 |
| Maison | 1,17 | 1,12 | 1,06 | 1 | 0,92 | 0,84 | 0,75 |

Sourcés : G (appartement, maison) et A (maison). **Extrapolés, VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER** : les classes A/B/C des appartements et B/C des maisons, et E/F.

## Où ça s'applique
- **Prix des annonces** (catalogue) : le prix de chaque annonce tient compte de sa classe.
- **Valeur d'un bien** (`valueOfProperty`) : valeur au marché de l'année × facteur de la classe actuelle / facteur de la classe à l'achat. Après une rénovation, la valeur monte du rapport des facteurs (G → E : 0,96 / 0,88 ≈ +9 %).
- **Devis de rénovation** : la valeur gagnée est déduite du coût pour calculer l'amortissement ; verdicts : rentable, rentable lentement, valeur qui ne couvre qu'une partie du coût, aucun gain direct.
- **Ventes** (amiable, forcée) : elles partent de la valeur, donc de la classe.
- Les loyers gardent leur propre effet énergie (`RENT_MODEL.energyFactors`), inchangé.

## Effets de calage
Les prix bougent de quelques pour cent selon la classe (jusqu'à −12 % en G, +8 % en B pour un appartement). Le catalogue « ventes pressées » a été réajusté (Brumevalle, Clairval) pour garder au moins 2 annonces proches de l'équilibre par ville.
