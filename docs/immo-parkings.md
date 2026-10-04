# Immobilier : les parkings

Trois formes de parking sont proposées dans chaque ville : **garage fermé**, **box**, **place de parking** (10 à 15 m²).

## Ce que le joueur voit
- Un ticket d'entrée faible (quelques milliers de pièces), des charges réduites, une vacance plus faible, un rendement brut correct.
- Pas de nombre de pièces, **pas de DPE** (pas de classe énergie, pas de rénovation énergétique), pas de travaux lourds, pas de défaut caché.
- Filtre « Type de bien » : Parking. Un parking n'apparaît pas quand on filtre par classe DPE.
- Illustration dessinée par le code (garage, rangée de box, place au sol) et un plan simple ; pas de vues séjour ni cuisine.

## Ce qui est codé
- `backend/src/config/immoRules.ts` : `PARKING_RULES` et `TENANCY_MONTHS.parking`. **Toutes ces valeurs sont des VALEURS DE JEU, NON SOURCÉES, À RECONFIRMER** (voir `docs/PARAMETRES-A-RECONFIRMER.md`).
- `backend/src/data/realEstate/fictiveCatalog.ts` : trois parkings par ville, générés après les logements (les logements existants ne changent pas).
- Le loyer d'un parking suit le même modèle que les logements, avec un multiplicateur propre au type (`unitRentFactor`).
- Frais de dossier d'un très petit emprunt plafonnés à 25 % du capital (un parking peut ne demander que quelques centaines d'euros de crédit).

## Ce qui n'est PAS fait (à sourcer avant l'ouverture au public)
Un parking n'est pas un logement : le bail de parking n'a pas la trêve hivernale, a un préavis libre, et l'assurance loyers impayés « habitation » ne s'y applique pas. Ces règles juridiques ne sont **pas** codées : le parking suit aujourd'hui les mêmes mécanismes que les logements (durée de bail, préavis, impayés), sans DPE. Il faut une source officielle pour chaque règle avant de la coder.
