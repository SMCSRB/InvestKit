# Banque aux règles françaises (Immobilier et prêt personnel)

## Ce qui change
1. **Apport minimal = frais de notaire + 10 % du prix.** En France, un prêt immobilier finance le bien, pas les frais de notaire, et les banques demandent en pratique environ 10 % d'apport. Réglage : `BANK_RULES.minDownPaymentPctOfNotaryFees` (100) et `minDownPaymentPctOfPrice` (10) dans `backend/src/config/immoRules.ts`. Les 10 % sont une **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER**.
2. **Plus de « caution » ni d'« accord sous réserve ».** Un dossier est **accordé** ou **refusé**. Un reste à vivre trop faible est maintenant un refus.
3. **Réserve de sécurité** : après l'achat (ou en prenant un prêt personnel), il faut garder en **pièces propres** (non empruntées) l'équivalent de **4 mensualités**, assurance comprise, **de tous tes prêts** (immobiliers et personnels, existants + le nouveau). Réglage : `BANK_RULES.reserveMonthlyPayments` (0 = désactivée). **VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER.** Pour un achat, on retire de tes pièces propres ce que tu paies (apport + frais de dossier) après avoir consommé d'abord les pièces empruntées réservées à l'Immobilier ; si tu n'as pas de quoi payer, c'est l'erreur « solde insuffisant » qui s'affiche, pas un faux refus de réserve.
4. **Messages chiffrés** (en InvestCoins, jamais en « € ») :
   - apport : proposé, exigé (notaire + 10 %), montant manquant ;
   - reste à vivre : ce qu'il te resterait, le seuil du profil, et la **mensualité maximale compatible** ;
   - endettement : taux obtenu, plafond de 35 %, mensualité maximale acceptable ;
   - réserve : pièces libres après l'opération, réserve exigée, montant manquant.

## Règles réelles conservées
Endettement maximal 35 % assurance comprise (HCSF), durée 25 ans (27 ans avec travaux ≥ 10 % du prêt). Sources et état de vérification : `docs/PARAMETRES-A-RECONFIRMER.md`.

## Ce que ça change pour le joueur (repères de la simulation d'avant)
Avec 10 000 InvestCoins, environ 9 à 15 des 39 annonces du catalogue de départ restent accessibles ; le refus pour reste à vivre retire 0 ou 1 annonce de plus.

## Tests
`backend/tests/immoEngine.test.ts` (règles pures : apport au centime près, refus du seul notaire, réserve exacte, désactivation, motifs cumulés, messages) et `backend/tests/banqueReglesFrancaises.test.ts` (parcours réel : refus d'apport sans mouvement de pièces, refus de réserve, solde insuffisant, prêt personnel). Les tests d'achat existants utilisent `minDownCoins` (`tests/helpers.ts`).
