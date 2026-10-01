# Faille de l'éducation (pièces à l'infini) : correctif et marche à suivre

## Ce qui se passait
Avant ce correctif, le site acceptait n'importe quel « numéro de chapitre » envoyé par le navigateur et donnait **20 🪙 par chapitre** (100 🪙 par domaine) la première fois. Quelqu'un qui envoyait `chapitre 1, 2, 3 … 10 000` gagnait 200 000 🪙. L'XP était aussi fournie par le navigateur.

## Ce que le correctif change (dans `main`)
- Le serveur ne récompense que les chapitres et domaines **qui existent** (`backend/src/data/educationCatalog.ts`, généré depuis le contenu pédagogique et vérifié par un test).
- L'XP est fixée par le serveur (100 par chapitre, 500 par domaine : valeurs de jeu à reconfirmer), jamais par le navigateur.
- Un identifiant inventé reçoit une erreur 400 « Chapitre inconnu » ; rejouer un vrai chapitre ne rapporte toujours qu'une fois.

## Déployer le correctif EN PREMIER
Aucune migration. Suis `docs/DEPLOIEMENT-DEBUTANT.md` (sauvegarde avant). Après le déploiement, plus personne ne peut abuser.

## Repérer les comptes qui ont abusé (lecture seule, sans danger)
**Méthode 1 — script (conseillée)** : sur le serveur, dans le dossier `backend` :
```bash
npm run education-abuse
```
Il liste, par compte : lignes invalides, pièces obtenues, XP, solde actuel. **Il ne modifie rien.**

**Méthode 2 — SQL pur** :
```bash
psql "$DATABASE_URL" -f ops/sql/detecter-abus-education.sql
```
- Requête A : lignes d'avancement qui ne correspondent à aucun chapitre existant.
- Requête B : comptes dont le registre contient plus de récompenses que de chapitres existants (repère aussi les lignes effacées à la main).
- Requête C : total créé par l'éducation, à comparer au maximum honnête (15 chapitres × 20 + 2 domaines × 100 = 500 🪙 par joueur).

## Corriger proprement les soldes
1. **Sauvegarde d'abord** (`docs/sauvegardes.md`) : tu dois pouvoir revenir en arrière.
2. Lance le rapport (`npm run education-abuse`) et **lis la liste** : un compte honnête n'y figure pas.
3. Pour corriger tous les comptes de la liste :
   ```bash
   npm run education-abuse -- --apply
   ```
   Pour un seul compte : `npm run education-abuse -- --apply --user <identifiant>`.
4. Ce que fait la correction, compte par compte, dans une transaction :
   - retire les pièces obtenues indûment, **jamais plus que le solde** (personne ne passe en négatif) : la part déjà dépensée est affichée « non récupérable » ;
   - met à zéro les pièces et l'XP des lignes invalides (les lignes restent, pour la trace) ;
   - écrit une ligne au registre (`admin_adjustment`) et au journal d'audit (`education_abuse_corrected`), et prévient le joueur par une notification ;
   - c'est **idempotent** : relancer ne retire rien de plus.
5. Vérifie : relance `npm run education-abuse` → « ✅ Aucun compte suspect » (ou seulement les comptes du filet B à examiner).
6. Décision à prendre par toi pour les pièces « non récupérables » (déjà dépensées en immobilier, prêts, etc.) : les laisser (le plus simple), ou prendre une mesure au cas par cas depuis l'administration (`POST /users/:id/coins`, motif obligatoire). Un joueur qui a trafiqué peut aussi être suspendu depuis l'écran Utilisateurs.

## Tests
`backend/tests/educationServerAuthority.test.ts` (le serveur refuse l'inventé, l'XP vient du serveur) et `backend/tests/educationAbuse.test.ts` (détection, correction exacte, solde jamais négatif, idempotence, filet par le registre, SQL à jour).

## À tester chez toi après déploiement
1. Termine un vrai chapitre : tu gagnes toujours 20 🪙 une seule fois ; le refaire ne rapporte rien.
2. Envoie un chapitre inventé (`domainId: "crypto", chapterId: "9999"`) : le serveur répond « Chapitre inconnu » et ton solde ne bouge pas.
3. Sur le serveur : `cd backend && npm run education-abuse` → liste (ou « Aucun compte suspect »). Rien n'est modifié sans `--apply`.
4. Après correction (`--apply`), un compte listé voit son solde baisser des pièces indues (jamais sous 0) et reçoit une notification.
