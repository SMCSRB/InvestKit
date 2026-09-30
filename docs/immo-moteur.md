# Moteur de calcul immobilier (étape 1)

Code : `backend/src/engine/immo/` — fonctions **pures** (pas de base de données,
pas de réseau, pas d'horloge), testées dans `backend/tests/immoEngine.test.ts`.
Les formules sont commentées dans chaque fichier.

| Fichier | Rôle |
|---|---|
| `loan.ts` | mensualité, tableau d'amortissement, différé, assurance (une seule fois), TAEG réel, coût du crédit |
| `acquisition.ts` | frais de notaire (taux fournis), budget total, montant à emprunter |
| `affordability.ts` | taux d'endettement, reste à vivre, décision de la banque **expliquée**, capacité d'emprunt |
| `indicators.ts` | rendement brut/net, cash-flow, rentabilité sur apport, délai de récupération, LTV, seuil de rentabilité |
| `capitalGains.ts` | plus-value à la revente (structure ; règles fiscales fournies par l'appelant) |

## Écarts avec tes deux simulateurs de référence (corrigés)
1. **Assurance comptée deux fois** (simulateur bancaire) : elle était ajoutée au taux *et* recomptée à part. Ici : une ligne séparée, une seule fois.
2. **Taux 0 %** : division 0/0 dans les deux simulateurs. Ici : capital ÷ durée.
3. **Endettement** : la référence ne comptait que la nouvelle mensualité. Ici, les crédits en cours sont inclus.
4. **« Rendement brut »** : la référence l'appliquait à un loyer déjà réduit par la vacance. Ici : brut = loyer potentiel, net = loyers encaissés − charges.
5. **« 999 ans »** comme délai de récupération : remplacé par « non calculable » (null).
6. **TAEG** : les frais (dossier, garantie) et l'assurance sont inclus, résolution exacte.

## Règles de jeu reprises de la référence (modifiables : `config/immoRules.ts`)
- Plafond d'endettement 35 % → refus ; reste à vivre < 1 200 € → accord sous réserve.
- Loyers existants retenus à 100 %, loyer futur du bien non retenu.

## Volontairement absent (à vérifier à la source officielle, étapes 3 et 6)
Aucun chiffre légal n'est écrit dans le moteur : taux de frais de notaire,
fiscalité de la plus-value (taux, abattements, forfaits, surtaxe), calendrier
des diagnostics énergétiques. Les tests utilisent des règles **fictives**.
