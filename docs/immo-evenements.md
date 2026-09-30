# Événements aléatoires (étape 5)

Code : `backend/src/engine/immo/events.ts` (règles pures), `services/realEstateLifeService.ts` (application mois par mois), migration `018_real_estate_events.sql`. Tests : `tests/realEstateEvents.test.ts`.

## Reproductibilité
Chaque tirage = f(graine de la partie, annonce d'origine + date d'achat, mois, sorte d'événement). Donc : mêmes actions + même graine = mêmes événements (testé sur 60 mois) ; l'ordre des appels n'a aucune influence ; impossible de « rejouer » un mois.

## Ce qui peut arriver à un bien loué
| Événement | Règle |
|---|---|
| **Type de locataire** | Tiré à chaque nouveau bail selon le type de bien (studio → surtout étudiants, maison → familles). |
| **Départ du locataire (préavis)** | Probabilité mensuelle = 1 / durée moyenne d'occupation (étudiant 18 mois, actif 36, famille 60), ajustée par la tension de la ville (marché tendu : on part moins). **Préavis : 3 mois ; 1 mois en zone tendue ou pour motif personnel** (mutation, emploi, santé…). Le locataire paie son loyer pendant tout le préavis. |
| **Sortie** | État des lieux de sortie (30 % de dégradations chiffrées en fraction du loyer), **dépôt de garantie** (1 mois hors charges, encaissé à l'arrivée) restitué après retenues : impayés d'abord, dégradations ensuite. Frais de remise en location. Remise en location automatique (gel F/G : jamais au-dessus de l'ancien loyer). |
| **Retard de paiement** | Décalage d'un mois, rattrapé ; à chaque mois avec une probabilité par type de locataire. |
| **Impayé** | Dette enregistrée chaque mois ; chaque mois : 25 % de chance que l'épisode se termine (moitié : le locataire régularise, moitié : il part) ; au bout de 3 mois la procédure aboutit et il part. Le dépôt couvre une partie, le reste est perdu. |
| **Travaux imprévus** | Probabilité mensuelle selon l'état (bon 0,6 %, à rafraîchir 1 %, à rénover 1,5 %), ×1,5 en classe F/G, ×0,3 dans le neuf ; coût 25–120 €/m² (inflation comprise). |
| **Congé du propriétaire** | Action du joueur, **uniquement à l'échéance du bail** (3 ans), **au moins 6 mois avant**, pour **vente** ou **motif légitime et sérieux** (exige ≥ 2 mois d'impayés constatés pendant le bail). Vente : le bien est libre après le départ (`sale_planned`, mise en vente à l'étape 6). |

Chaque événement est consigné dans `re_events` (`GET /events`) et expliqué dans le relevé du mois (avec son montant exact).

## Règles de droit reprises (extraits de presse, courtage et notaires, 2026-09-29 ; pages officielles inaccessibles depuis l'environnement de développement : à reconfirmer sur Légifrance / service-public.fr)
- Le locataire peut partir à tout moment avec préavis : 3 mois (location vide), 1 mois en zone tendue, en meublé ou pour motif personnel justifié.
- Dépôt de garantie : 1 mois de loyer hors charges au maximum (location vide) ; restitué sous 1 mois si l'état des lieux de sortie est conforme, 2 mois sinon ; 10 % du loyer par mois de retard.
- Le propriétaire ne peut donner congé qu'à l'échéance du bail, avec 6 mois de préavis, pour vendre, reprendre pour habiter, ou motif légitime et sérieux.

## Non modélisé (extensions)
Location meublée (aucun bien meublé au catalogue, alors que le préavis y est d'un mois), reprise pour habiter, droit de préemption du locataire, assurance loyers impayés, trêve hivernale, pénalité de retard de restitution du dépôt (la restitution est automatique), zones tendues réelles (liste fictive dans le catalogue).

## Réglages de jeu
Toutes les probabilités, durées d'occupation, montants de dégradations et de travaux sont des choix de jeu dans `config/immoRules.ts` (`EVENT_PARAMS`), pas des statistiques.
