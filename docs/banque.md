# Banque (module unique) — noyau

Décisions produit validées : crédit fléché par domaine ; prêts suivant l'horloge de leur domaine ; pièces créées à l'emprunt (nature « credit »)
et détruites au remboursement (capital ET intérêts, nature « repayment ») ; prêt personnel plafonné (fléché Immobilier) ; prêt sur portefeuille
avec appel de marge ; blocage après défaut puis « procédure de rétablissement » ; taux = base + écart (non sourcé) ; pas de taux d'usure en v1 mais la structure existe ;
classement en richesse nette de dettes. Unification 1 🪙 = 20 € : plus tard.

## RÈGLE DE CONCEPTION
Les InvestCoins n'existent que dans le jeu : pas de boutique, pas de retrait, pas d'achat avec de l'argent réel, pas d'échange ni de transfert entre joueurs.
C'est ce qui rend acceptable qu'un prêt crée des pièces. Écrit dans `backend/src/config/bankRules.ts` (`COIN_DESIGN_RULE`, testé).

## Ce que contient ce premier lot
- **Registre des dettes** `bank_loans` (montants en centièmes de pièce entiers), comptes `bank_accounts` (blocage, défauts), journal `bank_events`, crédit fléché `bank_credit_balances`.
- **Échéancier** en pièces (annuité constante, dernière échéance solde exactement) : `engine/bank/schedule.ts`.
- **Pièces** : `bank_disburse` (+, nature « credit », domaine du prêt) ; `bank_repayment` (−, nature « repayment »). Les intérêts et l'indemnité sont une destruction nette.
  Invariant testé : pièces créées par crédit − capital remboursé = capital restant dû.
- **Crédit fléché** : les pièces empruntées non dépensées ne se dépensent que dans le domaine du prêt (garde dans le registre : un débit d'un autre domaine, ou sans domaine, ne peut pas entamer la réserve). Elles sont dépensées en premier dans leur domaine.
- **Horloge** : une échéance par mois d'horloge du domaine (`settleMonth`), jamais deux fois le même mois.
- **Défaut** : échéance impayée → dette conservée ; 3 échéances impayées de suite = défaut, compte bloqué (aucun nouveau prêt) tant que la dette n'est pas soldée.
- **Plafonds** : 3 prêts actifs, 50 000 🪙 de dette totale (valeurs de jeu).
- **Remboursement anticipé** : capital + intérêts échus + indemnité (1 % si plus d'un an restait, 0,5 % sinon).
- **API** : `GET /bank/overview`, `GET /bank/events`, `POST /bank/loans/:id/repay`, `GET /bank/admin/stats` (administrateurs). Le script `npm run coins-stats` affiche aussi le crédit créé / remboursé par domaine et la dette en cours.

## Valeurs de jeu, NON SOURCÉES, À RECONFIRMER (toutes dans `config/bankRules.ts`)
Taux de base annuel (ordre de grandeur de l'Euribor 12 mois, plancher 0) ; écarts par produit (personnel +4,5 points, portefeuille +2, immobilier 0) ;
plafonds (3 prêts, 50 000 🪙) ; 3 échéances avant défaut ; indemnité de remboursement anticipé (1 % / 0,5 %, repère du crédit à la consommation à reconfirmer).

## Simplifications assumées
Pas de pénalités de retard ; le paiement est « tout ou rien » chaque mois ; l'horloge d'un prêt est celle de son domaine (pas d'horloge unique).

## Lot 2 — prêt personnel (fléché Immobilier)
- **Plafond** : 6 mois de revenus nets du profil (étudiant 270 🪙, salarié 720 🪙, cadre 1 350 🪙), minimum 25 🪙, 6 à 60 mois, un seul prêt personnel actif, un seul par mois de jeu.
- **Taux** : taux de base de l'année + 4,5 points (toujours plus cher que le prêt immobilier de la même année : test). Fictif, non sourcé, à reconfirmer.
- **Décision de la banque expliquée** : plafond, endettement (35 % des revenus, loyers retenus à 70 %), reste à vivre, blocage après défaut. La mensualité compte ensuite dans l'endettement des achats immobiliers.
- **Accès** : suit le domaine Immobilier (domaine gratuit ou Pro).
- **Fléchage** : les pièces ne servent que dans l'Immobilier ; l'aperçu d'achat n'affiche que les pièces utilisables dans l'Immobilier.
- **Échéances** : une par mois de jeu de l'Immobilier ; un impayé est signalé dans le mois, 3 de suite = défaut et blocage.
- **Classement net de dettes** : gain du bien moins les intérêts payés, rapporté au capital propre (investi − part financée par emprunt, plancher 10 % de l'investi) ; le **levier** (investi / capital propre) est affiché au classement (colonne « Levier », migration 023). Sans emprunt : formule inchangée, levier ×1.
- **Page `/banque`** : vue d'ensemble (dette, crédit fléché non dépensé), simulation et emprunt, liste des prêts, remboursement anticipé, journal.
