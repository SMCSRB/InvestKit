# Migration M1 : passage des parties existantes à l'horloge unique et à la nouvelle économie (6b-fin + 6c)

À lancer **une seule fois, en maintenance**, juste après le déploiement de l'horloge unique. Sans elle, les joueurs qui ont déjà une partie reçoivent « ta partie doit être migrée » (`409`) et ne peuvent plus agir.

## Ce que fait la migration, joueur par joueur
1. **Liquidation à valeur conservée** : titres de Bourse, cryptos et biens immobiliers sont convertis en InvestCoins **à la valeur que le site affichait dans le patrimoine** (immobilier : net de revente, prêt déduit), **sans frais ni impôt**. Écritures « échange » : les statistiques de pièces créées/détruites ne bougent pas.
2. **Prêts soldés** avec ce produit (capital et intérêts échus, sans indemnité), écritures « remboursement ». Si le joueur n'a pas de quoi tout rembourser, le reste est **effacé et rapporté** : il ne repart jamais en négatif.
3. **Domaines remis à zéro** : portefeuilles de Bourse, compte Crypto (ordres en attente annulés avec un motif), partie Immobilier (biens, prêts, relevés), classements du joueur. Ils repartiront à la date de sa nouvelle partie (horloge unique créée à sa première action, ou choisie dans l'écran de création du compte Crypto).
4. **Capital de départ** : s'il a moins de 10 000 InvestCoins, complément tracé « economy_cutover_grant » ; sinon rien (jamais de retrait).
5. **Contrôle** : le solde après liquidation doit être **exactement** le patrimoine total d'avant (plus ce qui a été effacé faute de moyens). Au moindre écart, **rien n'est écrit** pour ce joueur. Taux de change indisponible : le joueur est laissé tel quel.

Le registre n'est **jamais réécrit** : on ajoute des lignes. Chaque joueur migré a une ligne `m1_cutover` (rapport avant/après, idempotence) et une ligne d'audit.

## Écarts avec l'analyse (à connaître)
- L'analyse proposait « archiver le registre et repartir du capital de départ » et « garder les biens immobiliers ». **Non retenu** : repartir du capital aurait fait perdre de la valeur aux joueurs qui avaient plus ; garder les biens aurait exigé de décaler toutes leurs dates (loyers, prêts, baux) vers la date commune, ce qui ne peut pas être neutre en valeur (les prix du marché changent entre deux dates). La liquidation à valeur conservée est la seule voie qui garantit « aucun gain, aucune perte ». Les testeurs perdent donc leurs positions et leurs biens, mais gardent leur patrimoine en pièces. **À annoncer clairement** aux joueurs.
- Aucun ancien montant en pièces d'Immobilier n'est converti « ×20 » : tout passe par la valeur affichée en euros de jeu, déjà égale aux pièces (1 InvestCoin = 1 €).

## Commandes (`backend`)
- `npm run cutover:m1` : **simulation** (par défaut). Exécute toute la migration dans une transaction puis l'annule : le rapport est exact et rien n'est écrit.
- `npm run cutover:m1 -- --apply --i-have-a-backup` : applique. **Sauvegarde de la base obligatoire juste avant** (`docs/sauvegardes.md`).
- Code de sortie 2 si au moins un joueur est refusé (il reste migrable après correction : relancer ne retouche pas les joueurs déjà migrés).

## Ordre conseillé
1. Sauvegarde. 2. Déployer. 3. Simulation, lire le rapport. 4. `--apply`. 5. Vérifier un compte (patrimoine inchangé, partie à zéro).

## Tests
`backend/tests/migrationM1.test.ts` (8 tests) : valeur identique avant/après, registre ajouté sans réécriture, complément au capital, dette effacée, simulation sans écriture, idempotence, taux indisponible, joueur qui rejoue.
