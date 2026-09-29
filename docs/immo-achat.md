# Achat immobilier avec prêt (étape 3)

Code : `backend/src/engine/immo/purchase.ts` (calcul pur), `backend/src/services/realEstateService.ts` (opérations), `routes/realEstate.ts` (`/api/v1/realestate/*`). Tests : `tests/realEstate.test.ts`, `tests/immoEngine.test.ts`, `tests/realEstateCatalog.test.ts`.

## Parcours
1. `POST /start {profile}` : choix du profil (étudiant / salarié / cadre), **une seule fois**.
2. `GET /listings`, `GET /listings/:id` : annonces à l'année simulée. Libre d'accès (même pour un compte verrouillé).
3. `POST /listings/:id/expertise` : paie l'expertise (une seule fois par bien et par année) ; révèle travaux réels et défauts cachés.
4. `POST /purchase/preview {listingId, downPaymentCoins, months}` : **aucune écriture**. Budget, prêt, TAEG, décision de la banque expliquée, pièces nécessaires.
5. `POST /purchase` : même calcul, refait côté serveur dans une transaction verrouillée. Refus de la banque = 422 avec les motifs, aucun mouvement de pièces.
6. `GET /properties`, `POST /properties/:id/pay-works`.

Le client n'envoie que le bien, l'apport en pièces et la durée : prix, taux, frais, revenus, dettes sont lus/calculés par le serveur.

## Règles de la banque (config `immoRules.ts`, modifiables)
- Endettement ≤ 35 % (assurance et crédits en cours compris) ; loyers existants **et** loyer prévisionnel du bien retenus à 70 % (**à reconfirmer auprès d'un courtier**).
- **Apport ≥ frais de notaire** (100 %, paramétrable).
- Durée ≤ 25 ans, 27 ans si travaux ≥ 10 % du prêt (règle HCSF, extraits de presse/courtage, à reconfirmer sur le texte officiel). Différé d'amortissement (VEFA) non modélisé.
- Reste à vivre par profil : en dessous = accord sous réserve (pas un refus).
- Frais de dossier max(200 €, 0,2 %), assurance 0,36 %/an : valeurs de jeu.

## Pièces
Apport en pièces entières (1 🪙 = 20 €). Le ledger enregistre séparément : frais de notaire (`re_notary_fees`, **destruction**), frais de dossier (`re_loan_fees`, destruction), apport versé au vendeur (`re_exchange_down_payment`, **échange**), expertise (`re_expertise`, destruction), travaux payés (`re_exchange_pay_works`, échange). Tous arrondis contre le joueur.

## Expertise
Sans expertise : la banque finance les travaux annoncés ; l'écart avec les travaux réels devient une **dette de travaux** découverte après l'achat (à payer avant de pouvoir louer, étape 4). Avec expertise : la banque finance les travaux réels, aucune surprise.
