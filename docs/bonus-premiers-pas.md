# Bonus « premiers pas »

Trois bonus **uniques par compte**, sans limite de temps, **décidés et plafonnés par le serveur** (valeurs dans `backend/src/config/economy.ts`, `FIRST_STEP_BONUSES`).

| Clé | Pièces | Quand le serveur le verse |
|---|---|---|
| `first_investment` | 30 | Premier achat (Bourse, Crypto ou bien immobilier) d'au moins **100 🪙** (`FIRST_STEP_MIN_INVESTMENT_COINS`), pour éviter un achat symbolique fait pour toucher la prime |
| `first_lesson` | 30 | Premier **chapitre** d'éducation validé par la correction du quiz du chapitre (côté serveur) |
| `first_quiz` | 40 | Premier **quiz final** de domaine réussi |

Total : **100 🪙** au maximum par compte (`FIRST_STEPS_TOTAL_COINS`).

> Hypothèse à confirmer : le serveur ne sait pas si une leçon a été *lue* (seule la réussite du quiz est une preuve). « Première leçon » = premier chapitre validé ; « premier quiz réussi » = premier quiz final. Les clés sont indépendantes du déclencheur : si le guide « premiers pas » (lot 4) veut un autre déclencheur, seule l'appel à `grantFirstStep()` change.

## Garanties
- **Une seule fois** : clé primaire (compte, clé) dans `first_step_bonuses`. Versements simultanés : un seul passe.
- **Plafond** : trois clés possibles, imposées par une contrainte en base (`step_key IN (...)`). Une clé inconnue est refusée.
- **Dans la transaction de l'action** : si l'achat échoue, le bonus aussi. Il est inscrit au registre (motif `first_step_bonus`, nature « création de pièces »).
- **Aucune route pour demander un bonus** : le navigateur ne peut rien réclamer, il ne fait que lire l'état.
- **Pas de gain en boucle** : refaire un quiz, racheter ou rejouer ne redonne rien.

## État lisible (pour le futur guide « premiers pas », lot 4)
`GET /api/v1/economy/first-steps` → `{ steps: [{ key, coins, earned, earnedAt }], earnedCoins, totalCoins, minInvestmentCoins }`.

`POST /education/submit-quiz` renvoie en plus `firstStepBonus` (pièces du bonus versé par cette réponse, 0 sinon).

## Tests
`backend/tests/firstSteps.test.ts` : montants et plafond, Bourse / immobilier / crypto, achat symbolique, chapitre / quiz final, quiz raté, simultanéité, annulation de transaction, clé inconnue, API (état, aucune route de réclamation).
Les comptes de test des autres fichiers ont les trois bonus « déjà reçus » par défaut (`createUser`, option `firstStepsPending`), pour que leurs montants exacts restent centrés sur leur sujet.
