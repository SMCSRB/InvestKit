# Immobilier — extension 1 : assurance loyers impayés (GLI) et trêve hivernale

## Sources (recherche web du 2026-09-29, à reconfirmer sur les contrats et textes officiels)
- **GLI** : prime de 2 à 4 % du loyer charges comprises ; délai de carence en général 3 mois ; indemnisation déclenchée après ~2 mois d'impayés ;
  plafond de 70 000 à 120 000 € ; taux d'effort du locataire exigé ≤ 33–35 % (sites d'assureurs et de courtiers : Manda, Foncia, Qoridor, JeChange…).
- **Trêve hivernale** : du 1er novembre au 31 mars, pas d'expulsion même avec une décision de justice ; la procédure et la dette continuent ;
  forcer un départ pendant la trêve est un délit (service-public.gouv.fr, ANIL, INC).

## Règles du jeu (`GLI_PARAMS`, `WINTER_TRUCE` dans `backend/src/config/immoRules.ts`)
| Règle | Valeur | Statut |
|---|---|---|
| Prime | 3 % du (loyer + charges), les mois où le bien est loué | milieu de la fourchette sourcée |
| Carence | 3 mois après la souscription (repart à zéro si on résilie puis se réassure) | sourcé |
| Déclenchement | dès le 2e mois d'impayé consécutif, remboursement **rétroactif** du 1er mois, puis mois par mois | sourcé |
| Plafond | 70 000 € par bien et par contrat | bas de la fourchette sourcée |
| Locataires refusés | étudiants | **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER** |
| Fiscalité | prime déductible ; remboursements imposables comme des loyers | simplification cohérente avec le régime réel du jeu |
| Trêve | si la procédure aboutit (3 mois d'impayés) entre novembre et mars, le locataire reste jusqu'en avril ; les impayés continuent | sourcé |

Simplifications : l'assureur paie dans le mois où le seuil est atteint ; pas de franchise ni de dossier à constituer ; une seule formule d'assurance.

## Où c'est calculé
`engine/immo/monthly.ts` (lignes `gliPremium`, `gliReimbursed`, explication `GLI_REIMBURSED`), `services/realEstateLifeService.ts` (`processMonth`, `setGli`),
migration `021_real_estate_gli.sql` (ajouts uniquement). API : `POST /realestate/properties/:id/gli` `{ "active": true|false }`. Le portefeuille expose `gli` pour chaque bien.
