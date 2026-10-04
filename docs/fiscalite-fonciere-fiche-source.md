# Fiche de source : fiscalité des revenus fonciers (location nue)

**À relire par Andreja sur les pages officielles.** Mon environnement ne peut pas ouvrir `impots.gouv.fr`, `service-public.gouv.fr` ni `legifrance.gouv.fr` (accès réseau bloqué : testé le 5 octobre 2026). **Tous les chiffres ci-dessous viennent de ma mémoire ou de résumés de recherche : aucun n'a été relu sur une page officielle.** Ils sont dans `backend/src/config/rentTaxRules.ts` (et `config/immoRules.ts` pour 17,2 % et les tranches), chacun marqué « [à relire] ».

| Règle modélisée | Valeur dans le code | À relire sur | Doute |
|---|---|---|---|
| Micro-foncier : abattement | 30 % des loyers bruts | impots.gouv.fr, « micro-foncier » | Taux exact |
| Micro-foncier : plafond | 15 000 € de revenus fonciers bruts par an ; au-dessus, réel obligatoire | idem | Plafond en vigueur pour l'année de jeu ; les autres cas d'exclusion du micro (régimes spéciaux, etc.) **ne sont pas modélisés** |
| Régime réel : charges déductibles | taxe foncière, copropriété non récupérable, assurance, entretien et réparations, intérêts d'emprunt, assurance emprunteur, frais de dossier | impots.gouv.fr, « revenus fonciers, régime réel » | Liste complète (travaux d'amélioration, frais de gestion, etc. : non détaillés) |
| Déficit foncier imputable sur le revenu global | jusqu'à 10 700 € par an, **seulement** la part due aux charges autres que les intérêts | idem | Plafond ; le plafond relevé pour certains travaux d'économie d'énergie **n'est pas modélisé** |
| Report du déficit | sur les revenus fonciers des 10 années suivantes (part due aux intérêts : report seulement) | idem | Durée |
| Prélèvements sociaux | 17,2 % (location nue), même base que l'impôt sur le revenu | urssaf.fr / impots.gouv.fr | Taux de l'année de jeu |
| Impôt sur le revenu | tranche marginale du **profil** (étudiant 11 %, salarié 11 %, cadre 30 %) : **CHOIX DE JEU**, pas le barème exact | impots.gouv.fr, barème | Barème, quotient familial et CSG déductible **non modélisés** |
| Engagement au réel | trois ans | impots.gouv.fr | **Non modélisé** : la comparaison micro/réel est indicative |

## Ce que fait la PR 6
- `engine/immo/rentTaxRegimes.ts` : fonctions pures `microFoncierTax`, `realRegimeTax`, `compareRegimes` (arithmétique vérifiée à la main dans `tests/fiscaliteFonciere.test.ts`).
- `npm --prefix backend run immo:simulate-fiscalite` : tableau micro contre réel pour les trois profils, avec cinq cas types (**des exemples de calcul, pas des données**).
- **Pas branché** (`RENT_TAX_REGIMES_ENABLED = false`) : le moteur garde son calcul actuel (`computeRentTax`, un seul taux sur la base « loyers − charges − taxe foncière − intérêts », donc un régime réel simplifié sans déficit reporté). Brancher ces règles changerait l'impôt du jeu actuel ; à décider avec le branchement des annonces réelles. Un test garde que ni moteur ni route ne les importe.

## À relire par Andreja (liste précise)
1. **Abattement de 30 %** et **plafond de 15 000 €** du micro-foncier (page « micro-foncier »).
2. **Plafond de 10 700 €** du déficit imputable sur le revenu global, et règle « les intérêts ne s'imputent pas sur le revenu global ».
3. **Durée de report** du déficit (10 ans).
4. **17,2 %** de prélèvements sociaux sur les revenus fonciers pour l'année visée.
5. Que le micro-foncier n'est pas exclu pour d'autres raisons dans notre cas (liste des exclusions).
