# Checklists « à tester chez moi après déploiement »

**Ordre de fusion sur GitHub :** PR #3 (base), puis #5 (prix de vente), #6 (rénovation), #7 (classement), #8 (bouton du domaine gratuit),
#9 (assurance loyers impayés + trêve hivernale), puis la PR de documentation. Après chaque fusion, redéploie (guide `DEPLOIEMENT-DEBUTANT.md`)
et déroule la section correspondante ci-dessous. Tu peux aussi fusionner toutes les PR puis déployer une seule fois : lance alors toutes les sections.

Une section par pull request, en langage simple. Ouvre le site en navigation privée, connecte-toi, va sur `/immobilier`.
Pour tester l'achat, ton compte doit avoir choisi l'Immobilier comme domaine gratuit (PR « bouton du domaine ») ou être Pro.

## PR 7b-1 — Prix de vente d'un bien
1. Achète un bien (n'importe quel studio), onglet **Mon portefeuille**.
2. Clique **Vendre** : tu vois des boutons 85 % … 110 % ; en cliquant sur chacun, le prix, la chance de vendre par mois et le délai changent. **Attendu :** plus le prix est haut, plus la chance mensuelle baisse.
3. Choisis 110 % puis **Mettre en vente** : un message confirme, une ligne « 🏷️ En vente à … » apparaît.
4. Clique **Modifier le prix de vente**, choisis 90 %, **Appliquer le nouveau prix** : message « Prix demandé ramené à … », la chance de vendre monte.
5. Clique **Avancer d'un mois** plusieurs fois : le bien finit par être vendu ; le bilan explique le prêt remboursé, les frais et les impôts.

## PR 7b-2 — Rénovation énergétique
1. Onglet **Mon portefeuille**, sur un bien **vide** (pas de locataire) dont le DPE n'est pas déjà C ou mieux : clique **Rénover (énergie)**.
2. Tu vois un devis : classe avant → après, coût en € et en 🪙, effet sur le loyer, et si la location de la classe actuelle est interdite (et à partir de quelle année).
3. **Lancer les travaux** : message « Rénovation terminée : classe D → C pour … ». Ton solde baisse du montant annoncé, le DPE du bien change.
4. Sur un bien **loué** : le devis dit « Impossible de rénover un logement occupé ». Sur un bien déjà en C : « rien à gagner ».

## PR 7b-3 — Classement Immobilier
1. Sur `/immobilier`, clique l'onglet **Classement**.
2. Tu vois l'explication de la performance (avec l'icône « ? ») et un cadre **Ma performance** : argent investi, fonds propres, flux encaissés.
3. Sans achat, ou avec moins de 100 🪙 investis : le cadre te dit que tu n'es pas encore classé et pourquoi.
4. Après un achat, clique **Avancer d'un an** puis reviens sur Classement : ton rang apparaît (« Ton rang en 20XX : n°… sur … ») et ta ligne est surlignée dans le tableau.
5. Change l'année de comparaison : le tableau change.

## PR 7b-4 — Bouton « Immobilier » du domaine gratuit
1. Avec un compte **gratuit qui n'a pas encore choisi de domaine** : tableau de bord → menu **📈 Simulateur** → « Choisis ton domaine gratuit ».
2. Le bouton **🏠 Immobilier** est actif (plus « Bientôt disponible »). Clique : une fenêtre te prévient que le choix est **définitif** ; accepte.
3. **Attendu :** tu arrives sur `/immobilier`, et tu peux acheter un bien.
4. Retour au tableau de bord → Simulateur : en haut, le bouton **🏠 Immobilier →** mène à la page Immobilier pour tout le monde. Sur la Bourse, tu vois maintenant « 🔒 … nécessite le plan Pro » (ton domaine gratuit est l'Immobilier).
5. Un compte qui avait déjà choisi un domaine peut le changer **une seule fois** (bouton « Changer mon domaine gratuit ») : le bouton Immobilier y est aussi proposé.

## PR Extension 1 — Assurance loyers impayés (GLI) et trêve hivernale
1. Onglet **Mon portefeuille**, sur un bien : clique **🛡️ Assurance loyers**. Tu vois la prime estimée (≈ 3 % du loyer + charges), le délai de carence de 3 mois et le plafond.
2. **Souscrire l'assurance** : message de confirmation ; le bouton devient « 🛡️ Assuré ». Mets le bien en location et clique **Avancer d'un mois** : dans **Bilan du mois**, une ligne « Prime d'assurance loyers impayés » apparaît (et elle réduit ton impôt).
3. **Résilier** : la prime s'arrête le mois suivant ; un message explique que la carence repartira si tu te réassures.
4. Locataire **étudiant** : « L'assureur refuse le dossier » (souscription impossible).
5. Avance d'un an ou plus jusqu'à un impayé : si tu es assuré depuis plus de 3 mois, une ligne « Assurance loyers impayés : … remboursés » apparaît dès le 2e mois d'impayé ; sinon le journal des événements dit que le délai de carence n'est pas passé.
6. **Trêve hivernale** : si un impayé arrive à son terme entre novembre et mars, le journal écrit « Trêve hivernale… le locataire ne peut pas être expulsé avant le 1er avril » ; il part en avril.
7. Glossaire (`/glossaire`) : les entrées « Assurance loyers impayés », « Délai de carence », « Trêve hivernale » existent.

## PR Ajustements (devis de rénovation, explication du refus des étudiants)
1. Portefeuille → bien **vide** → **Rénover (énergie)** : le devis affiche maintenant le loyer avant → après (en €/mois et €/an), la valeur du bien avant/après (« 0 € : dans ce jeu la valeur ne dépend pas de la classe énergétique »), le nombre d'années pour amortir, et un verdict (✅ rentable / ⚠️ lent / ⚠️ aucun gain direct).
2. Sur un bien classé D : le devis dit « aucun gain direct… ne se justifie que pour éviter l'interdiction de louer ».
3. Bien avec un locataire **étudiant** → **🛡️ Assurance loyers** : le refus est expliqué et une icône « ? » ouvre l'explication (« Pourquoi l'assurance refuse les étudiants »).
4. `/glossaire` : l'entrée « Assurance loyers impayés (GLI) » mentionne l'absence de franchise (simplification).

## PR Banque 1 — noyau (aucun écran nouveau)
Cette PR ne change rien de visible pour les joueurs ; elle sert de socle. À vérifier après déploiement (dans le dossier `backend` du serveur) :
1. `npm run coins-stats` : le tableau affiche deux colonnes nouvelles, « crédit créé » et « remboursé » (à 0 tant que personne n'a emprunté), puis une section « Banque : dette en cours » vide.
2. Le site fonctionne comme avant : achat/vente en Bourse, achat d'un bien en Immobilier, récompense quotidienne. (La règle de dépense a été touchée dans le registre : ces trois actions doivent rester normales.)
3. Dans les journaux de démarrage de l'API : « ✅ 022_bank_core.sql completed » (ou « Already exists » au 2e démarrage), aucune ligne « ❌ ».

## PR Banque 2 — prêt personnel
Compte avec l'Immobilier comme domaine gratuit (ou Pro), partie Immobilier commencée.
1. `/immobilier` : un lien **🏦 Ma banque** apparaît en haut. Clique dessus → page `/banque`.
2. **Simuler** un prêt de 100 🪙 sur 24 mois : tu vois le taux (plus haut que l'immobilier), la mensualité, le coût total, le plafond de ton profil et la décision de la banque (endettement, reste à vivre).
3. Essaie un montant au-dessus du plafond (par ex. 5 000 🪙) : refus expliqué. **Emprunter** un montant raisonnable : message « Prêt personnel accordé… », ton solde monte, la carte « Crédit fléché non dépensé » apparaît.
4. Va en **Bourse** (Simulateur) et essaie d'acheter pour plus que tes propres pièces : refusé, car les pièces empruntées ne servent qu'à l'Immobilier.
5. `/immobilier` → Annonces : l'aperçu d'achat compte ton solde utilisable ; achète un bien avec l'apport financé par le prêt.
6. Avance de quelques mois : chaque mois une mensualité est prélevée ; page `/banque` → mois écoulés 1/24, 2/24… Onglet **Classement** : ta ligne montre un **levier ×N** et la performance est nette des intérêts.
7. **Solder ce prêt** : une confirmation explique l'indemnité (0,5 à 1 %), le prêt passe « Soldé ».
8. Glossaire : « Prêt personnel », « Crédit fléché », « Taux de base », « Défaut de paiement », « Rembourser par anticipation ».

## PR Banque 3 — prêt sur portefeuille
Compte avec la Bourse (ou la Crypto) comme domaine gratuit, ou Pro.
1. Simulateur (tableau de bord) → Bourse : achète quelques actions (ex. 10 LVMH). Va sur `/banque` → carte **Prêt sur portefeuille** : choisis « Bourse », un montant (100 🪙), **Simuler**.
2. Tu vois : la valeur de ta garantie, le maximum empruntable (50 % des actions, 30 % de la crypto), le taux variable, le levier, l'avertissement sur l'appel de marge et la phrase sur la simplification (cours de clôture annuels). Un montant au-dessus du maximum est refusé avec explication.
3. **Emprunter** : message de confirmation ; « Crédit fléché non dépensé » indique « utilisables en Bourse seulement ». Essaie d'acheter en Crypto ou en Immobilier avec plus que tes propres pièces : refusé.
4. Dans « Mes prêts », la carte du prêt montre la valeur des titres, la dette, le **rapport prêt/valeur** et les seuils d'appel et de vente forcée. Dans le Simulateur, un bandeau bleu rappelle le prêt.
5. **Avancer d'un an** (Simulateur) : les intérêts sont prélevés (pièces détruites), le taux est mis à jour. Si les cours ont beaucoup baissé, un message (rouge) annonce un **appel de marge** : rembourse une partie (carte du prêt → « Rembourser une partie ») ou achète des titres.
6. Sans régularisation, au passage d'année suivant, tes titres sont **vendus de force** (décote 3 %) et le message l'explique, avec la mention de la simplification.
7. Essaie de **vendre** des titres pendant que le prêt est ouvert : une partie du produit rembourse le prêt automatiquement, ou la vente est refusée si elle laisserait le prêt sans garantie.
8. **Solder** (sans indemnité) : la garantie est libérée. Onglet Classement de la Bourse : ta ligne montre le levier utilisé.
9. Glossaire : « Prêt sur portefeuille (Lombard) », « Appel de marge et vente forcée ».

## PR Banque 4 — procédure de rétablissement
À tester avec un compte de test, jamais avec un compte de joueur. Il faut un prêt en défaut (voir la note ci-dessous).
1. `/banque` : quand un prêt est « En défaut », une carte rouge **Procédure de rétablissement** apparaît, ainsi que le bandeau « Crédit bloqué ».
2. Choisis le domaine, **Voir ce qui se passerait** : liste de ce que tu perds (titres ou biens, rang, badges), de ce qui est effacé, du capital de base, de l'interdiction de crédit de 30 jours et du nombre de procédures.
3. Le bouton **Lancer la procédure** reste grisé tant que tu n'as pas écrit RETABLISSEMENT. Une fois lancé : message de confirmation, prêt « Dette effacée », domaine remis à zéro (Bourse : portefeuille vide et année 2010 ; Immobilier : nouveau choix de profil), rang disparu du classement.
4. Le bandeau indique « aucun nouveau crédit avant le … » ; une tentative d'emprunt est refusée.
5. Une deuxième procédure tout de suite est refusée (« encore N jour(s) d'attente »).
Pour provoquer un défaut sur un compte de test : emprunter en Bourse puis dépenser toutes ses pièces, laisser passer plusieurs années sans payer les intérêts ; ou me demander un script de mise en situation.

## PR Valeur verte
1. `/immobilier` → Annonces : à surface et quartier proches, une annonce classée G est moins chère qu'une annonce classée C ou D. Le glossaire a une entrée « Valeur verte ».
2. Mon portefeuille → bien **vide** classé G ou F → **Rénover (énergie)** : le devis affiche maintenant une **valeur avant → après en hausse** (environ +9 % pour un appartement G → E), le loyer avant/après, et un amortissement qui tient compte de la valeur gagnée (« coût des travaux moins la valeur gagnée »).
3. **Lancer les travaux** : dans « Mon portefeuille », la **valeur** du bien et le **patrimoine net** montent du montant annoncé.
4. Bien classé D → C : le devis dit que la valeur récupère une partie du coût (« ne se justifie que… »), sans gain de loyer.

## PR Sécurité 1 — authentification et journal d'audit
1. Dans `backend/.env.local`, ajoute `FIELD_ENCRYPTION_KEY=` suivi de 64 caractères tirés avec `openssl rand -hex 32`, redémarre l'API : plus d'avertissement « FIELD_ENCRYPTION_KEY non défini » dans le journal de démarrage.
2. `cd backend && npm run encrypt-totp` : le message indique combien de secrets ont été chiffrés (0 si personne n'avait la 2FA).
3. Connecte-toi avec un compte qui a la 2FA : la connexion en deux étapes fonctionne comme avant (secret relu correctement). Active la 2FA sur un compte de test : OK.
4. Inscription : le code reçu par email a bien 6 chiffres.
5. Compte administrateur **sans** 2FA : `/api/v1/economy/admin/coins-by-domain` répond 403 « Active d'abord la double authentification ». Avec 2FA : OK.
6. Journal d'audit : `psql … -c "UPDATE audit_logs SET action='x'"` est refusé (« ajout seul »).
