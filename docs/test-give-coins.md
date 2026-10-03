# Se donner des InvestCoins pour les tests (`test:give-coins`)

**Avant ce script** : il n'existait aucune commande pour ça. Seule la fonction d'administration `adjustCoins` (écran admin / API, motif `admin_adjustment`) pouvait créditer un compte, mais elle demande un compte administrateur connecté.

## Utilisation (à la main, jamais automatique)
```
cd backend
npm run test:give-coins -- --user TEST --amount 50000
```
`--user` : nom d'utilisateur **ou** e-mail d'un compte **existant** (insensible à la casse). `--amount` : entier de 1 à 10 000 000.
Sortie : le nom de la base, le compte, le solde avant, le montant, le solde après.

## Sécurité
- **Refuse de tourner** si le nom de la base visée par `DATABASE_URL` ne finit pas par `_test` (ex. `investkit_design_test`). Sans `DATABASE_URL`, il refuse aussi. Rien n'est modifié ; rien n'est même connecté dans ces cas.
- Double contrôle après connexion (`SELECT current_database()`).
- N'affiche jamais l'adresse de connexion ni le mot de passe : seulement le nom de la base.
- Crédite **par le registre** (ledger) : motif `test_gift`, libellé « don de test », nature « création » (pièces créées hors domaine) + écriture dans le journal d'audit (`test_give_coins`). Pas de modification directe du solde.
- Compte inconnu : erreur, aucun compte n'est créé.
- **À retirer ou bloquer avant l'ouverture au public** : `docs/PARAMETRES-A-RECONFIRMER.md`, section « À traiter avant l'ouverture au public ».

## Tests
`backend/tests/testGiveCoins.test.ts` : lecture du nom de base, noms refusés (`investkit`, `investkit_design`, `investkit_test_backup`…), refus sans `DATABASE_URL`, aucun secret affiché, **lancement réel refusé sur une base dont le nom ne finit pas par `_test`**, crédit par le registre, audit, compte inconnu, e-mail.
