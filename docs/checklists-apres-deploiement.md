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

## PR Sécurité 2 — RGPD (export et suppression du compte)
À faire avec un compte de test, jamais un vrai compte de joueur : la suppression est définitive.
1. Pied de page → **Mes données (RGPD)** (`/mes-donnees`). Connecté, la page s'ouvre.
2. **Télécharger mes données** : un fichier JSON se télécharge. Ouvre-le : ton profil, tes pièces, tes portefeuilles, ta banque, tes biens… Vérifie qu'il n'y a **ni mot de passe, ni secret 2FA**.
3. **Supprimer mon compte** : le bouton reste grisé tant que tu n'as pas écrit SUPPRIMER et saisi ton mot de passe. Avec un mauvais mot de passe : refus.
4. Compte avec 2FA : un champ « code à 6 chiffres » apparaît ; sans code valide : refus.
5. Si le compte avait un abonnement Pro Stripe, il est résilié avant la suppression (si Stripe échoue, le compte n'est PAS supprimé et un message l'explique).
6. Après suppression : impossible de se reconnecter ; le classement n'affiche plus le joueur. Le journal d'audit garde les lignes mais sans lien avec un utilisateur.
7. Plus de 5 essais en une heure : message « trop de demandes ».
8. `/privacy` : la section « Vos droits » et « Conservation » parlent de `/mes-donnees` et d'une suppression immédiate (texte à faire valider par un juriste).

## PR Tests HTTP (supertest)
Refactorisation sans changement visible : l'application Express est maintenant dans `backend/src/app.ts`, `index.ts` la démarre.
1. Redémarre l'API : le démarrage affiche les mêmes messages qu'avant (connexion PostgreSQL, schéma, encadré « InvestKit Backend »).
2. `curl http://localhost:5000/health` répond `{"status":"ok",...}`.
3. Le site fonctionne comme avant (connexion, Immobilier, Banque) : aucune différence attendue.
4. (Facultatif) `cd backend && npm test` : tous les tests passent, dont `tests/http.test.ts`.

## PR Intégration continue (CI)
Aucun effet sur le site. Après fusion : onglet **Actions** du dépôt GitHub → le workflow « CI » se lance sur chaque PR (tests du backend avec une base PostgreSQL, vérification des types, build du site). Une croix rouge = quelque chose est cassé ; le détail est cliquable. `npm audit` est informatif (n'échoue pas). Si cette PR n'a pas pu inclure le fichier (droits GitHub), l'étape est à faire à la main : voir la description de la PR.

## PR Documentation de l'API (OpenAPI)
1. `https://ton-site/api/v1/openapi.json` (ou `http://localhost:5000/api/v1/openapi.json`) affiche du texte JSON commençant par `"openapi":"3.0.3"`.
2. `…/api/v1/docs` affiche la page **Swagger UI** avec les routes classées par thème (Compte, Banque, Immobilier…). En production cette page est **désactivée** par défaut ; pour l'activer, ajoute `DOCS_ENABLED=true` dans `backend/.env.local`. (La page charge Swagger depuis un CDN : il faut internet.)
3. Rappel pour le développeur : ajouter une route sans la décrire dans `backend/src/openapi.ts` fait échouer `npm test`.

## PR Pages publiques (démo, nouveautés, référencement)
1. Sans être connecté (navigation privée) : `/demo` s'ouvre, trois onglets (PEA, Immobilier, Prêt bancaire) affichent chacun un simulateur qui fonctionne.
2. `/changelog` : liste des nouveautés, la plus récente en premier (à mettre à jour dans `app/lib/changelog.js`).
3. Pied de page : liens « Essayer les simulateurs » et « Nouveautés ».
4. `/robots.txt` affiche `Disallow: /` : **le site demande aux moteurs de ne rien indexer**. C'est voulu pendant la phase d'invitation.
5. Pour ouvrir au référencement (plus tard, une fois les pages légales validées par un juriste) : dans `.env.local` du site, mettre `NEXT_PUBLIC_SEO_ENABLED=true` et `NEXT_PUBLIC_SITE_URL=https://ton-domaine`, puis reconstruire (`npm run build`). `/robots.txt` autorise alors les pages publiques et indique `/sitemap.xml`.
6. `/sitemap.xml` liste les pages publiques (avec `NEXT_PUBLIC_SITE_URL` renseigné, les adresses sont les bonnes).

## PR Glossaire Bourse / Crypto
1. `/glossaire` : une nouvelle rubrique **Bourse et crypto** (action, ETF, obligation, cryptomonnaie, volatilité, diversification, cours de clôture annuel, année simulée, valeur des positions, performance). La recherche (« volatil… ») les trouve.
2. Dashboard → onglet Bourse ou Crypto : sur les cartes **Année simulée**, **Valeur positions** et **Performance**, une petite bulle « ? » ouvre l'explication, avec un lien vers le glossaire.
3. Lis les textes : ils doivent être compréhensibles par un débutant complet. Dis-moi ce qui est obscur.

## PR Fiscalité et frais Bourse / Crypto
1. Dashboard → Bourse : à côté de « Acheter », un choix **PEA / Compte-titres** et la mention « + courtage (~0,5 %) ». Sous le cadre, une phrase explique le PEA (ouverture à ton premier achat, exonération à partir de l'année N+5).
2. Achète quelques actions : ton solde baisse du prix **plus** le courtage (1 🪙 minimum).
3. **Vendre tout…** ouvre un **aperçu** : produit, courtage, impôt, ce que tu reçois, et une explication (« PEA de plus de 5 ans : pas d'impôt sur le revenu… »). Rien n'est vendu tant que tu n'as pas cliqué **Confirmer la vente**.
4. Avance de 5 ans, vends une position PEA gagnante : impôt faible (prélèvements sociaux seulement). Même chose sur un compte-titres : impôt plus élevé.
5. Crypto : vends une petite quantité (total de l'année sous 305 🪙) : aucun impôt ; au-dessus : impôt.
6. La ligne « Payé depuis le début » cumule courtage et impôts. Glossaire : courtage, PEA, compte-titres, flat tax, impôt sur les cryptos.
7. Admin : `/api/v1/economy/admin/coins-by-domain` contient `sinks` (frais et impôts par domaine).

## PR Capital de départ Pro
1. Compte gratuit neuf : après validation de l'e-mail, solde = capital de départ (10 000 🪙).
2. Compte gratuit qui passe Pro (paiement test Stripe) : le solde augmente de **10 000 🪙** (une seule fois). Historique : ligne « pro_starting_bonus ».
3. Résilie puis reprends l'abonnement Pro : aucun nouveau bonus.

## PR Sessions par cookie httpOnly + CSRF
Avant : lis `docs/sessions-cookies.md` (réglages `CORS_ORIGIN`, `COOKIE_SECURE`). En production HTTPS, rien à régler sauf `CORS_ORIGIN=https://ton-site`.
1. Déconnecte-toi, reconnecte-toi : la connexion marche ; dans les outils du navigateur (Application → Cookies) `ik_session` est coché **HttpOnly**, et `localStorage.token` vaut seulement `cookie-session`.
2. Sans te déconnecter avant le déploiement : après déploiement, recharge le site : tu restes connecté (migration automatique de l'ancien jeton).
3. Dashboard, Bourse, Immobilier, Banque : tout fonctionne (achat, vente, avancer d'une année…).
4. Bouton **Déconnexion** : tu es renvoyé à l'accueil, le cookie `ik_session` disparaît.
5. Compte avec double authentification : après le mot de passe, une case « Code de double authentification » apparaît ; un mauvais code est refusé, le bon connecte.
6. Si la connexion semble réussir mais que tu es aussitôt renvoyé à la page de connexion : le cookie n'est pas enregistré (voir « Piège n°1 » : `COOKIE_SECURE=false` en HTTP, ou `CORS_ORIGIN` incorrect).

## PR Sécurité — contrôle d'accès (anti-IDOR)
Aucun changement visible, sauf un point :
1. Page d'inscription : saisir plusieurs adresses e-mail valides de suite fonctionne ; au-delà de 20 vérifications en 15 minutes, l'indicateur « e-mail disponible » ne s'affiche plus (limite anti-espionnage), l'inscription reste possible.
2. (Facultatif) `cd backend && npm test` : `tests/idor.test.ts` passe.

## PR Sécurité — connexion, mots de passe, réinitialisation
1. `backend/.env.local` : vérifie `FRONTEND_URL=https://ton-site` (utilisé dans le lien du mail) et, derrière nginx/Caddy, `TRUST_PROXY=1` (défaut en production).
2. Connexion avec un mauvais mot de passe 8 fois de suite (même depuis plusieurs appareils) : message « compte temporairement verrouillé », même avec le bon mot de passe. Attends la durée indiquée (ou utilise « Mot de passe oublié » : ça débloque).
3. Page de connexion → **Oublié ?** : `/forgot-password` s'ouvre. Entre ton e-mail : message neutre (identique pour une adresse inconnue). Tu reçois un e-mail avec un bouton « Choisir un nouveau mot de passe ».
4. Le lien ouvre `/reset-password` : les règles s'affichent (8 caractères, majuscule, minuscule, chiffre) ; un mot de passe conforme est accepté, redirection vers la connexion, connexion avec le nouveau mot de passe OK. Le même lien réutilisé est refusé.
5. Inscription : un mot de passe trop faible est refusé avec un message clair.
6. Si aucun e-mail n'arrive : l'envoi d'e-mails n'est pas configuré (voir `EMAIL_PROVIDER` dans `.env.local` : Resend ou SMTP).

## PR Sécurité — en-têtes du site (CSP) et scripts hébergés
1. Ouvre le site et parcours : accueil, inscription (le captcha s'affiche), connexion, dashboard, Immobilier, Banque, glossaire, démo. Tout fonctionne comme avant. Si un écran est cassé, ouvre la console du navigateur (F12) : un message « Content Security Policy » indique ce qui est bloqué — envoie-le moi.
2. `/simulateurs/pea`, `/simulateurs/loan1`, `/simulateurs/loan2`, `/demo` : les graphiques s'affichent (ils fonctionnent même sans accès au CDN) ; l'export PDF marche. Le graphique « Patrimoine » du simulateur immobilier apparaît désormais.
3. Après déploiement, l'API doit être joignable depuis le site : si des données ne chargent plus, vérifie que `NEXT_PUBLIC_API_URL` est bien défini **au moment du build** (la CSP en reprend l'adresse).
4. Facultatif, quand le HTTPS est stable : ajouter `ENABLE_HSTS=true` dans l'environnement du site puis reconstruire.

## PR Sécurité — mises à jour des dépendances
Après fusion : `npm ci` dans le dossier du site **et** dans `backend/` (les versions ont changé), puis reconstruction (`npm run build`) et redémarrage.
1. Le site et l'API démarrent ; connexion, dashboard, Bourse, Immobilier, Banque fonctionnent.
2. Connexion avec mot de passe : OK (bcrypt a changé de version : les anciens mots de passe restent valides).
3. `cd backend && npm audit --omit=dev` affiche `found 0 vulnerabilities`.

## PR Montée de version Next.js 15 / React 19
Après fusion : `npm ci` à la racine du site, puis `npm run build` et redémarrage. Node 18.18 ou plus récent requis (vérifie avec `node -v`).
1. Parcours complet du site (accueil, inscription, connexion, dashboard et ses onglets, Bourse : acheter/vendre, Crypto, Immobilier, Banque, glossaire, démo, pages légales, profil) : tout doit fonctionner comme avant, sans écran blanc.
2. Regarde la console du navigateur (F12) : pas de texte rouge sur les pages principales.
3. Si une page est cassée, note laquelle et le message : c'est probablement une particularité de React 19, à corriger en une ligne.

## PR Sécurité — gouvernance (signalement, plan d'incident, scans automatiques)
1. Sur GitHub : onglet **Security** → la politique (`SECURITY.md`) apparaît. Onglet **Actions** : le workflow « Sécurité » (CodeQL + gitleaks) se lance sur la PR. S'il signale un secret, révoque-le immédiatement.
2. Onglet **Pull requests** : Dependabot ouvrira des PR de mise à jour le lundi (à regarder, pas à fusionner sans lire).
3. Lis `docs/plan-incident.md`, complète le tableau « Contacts » (responsable, hébergeur) et garde une copie hors du serveur.
4. Réglages du dépôt (à activer toi-même) : Settings → Code security → activer **Secret scanning** et **Push protection**, et protéger la branche `main` (PR obligatoire).

## PR Sauvegardes automatiques et test de restauration
Sur le serveur, dans le dossier du projet :
1. `./ops/backup.sh` : finit par « ✓ Terminé » ; un fichier `investkit-….dump` et son `.sha256` apparaissent dans `~/investkit-backups/`.
2. `./ops/restore-test.sh` : finit par « ✓ TEST DE RESTAURATION RÉUSSI ». S'il refuse de créer la base, donne le droit : voir `docs/sauvegardes.md`.
3. Installe les deux lignes `crontab` de `docs/sauvegardes.md`, vérifie le lendemain que `~/investkit-backups/backup.log` montre « Terminé ».
4. Organise la copie hors du serveur (et note la phrase de chiffrement).

## PR Administration — API, drapeaux de fonctionnalité, suspension de comptes
(L'interface visuelle `/admin` arrive dans la PR suivante ; ici on teste l'API avec un outil comme l'interface Swagger `/api/v1/docs`.)
1. `cd backend && npm run set-admin -- ton@email.fr on`, puis active la 2FA sur ce compte (Paramètres → Sécurité).
2. Dans Swagger (`/api/v1/docs`, cliquer « Authorize » avec ton jeton), essaie `GET /admin/system` : la base est « ok » et la liste de contrôles montre ce qui reste à configurer.
3. `GET /admin/alerts` : lis les alertes (les « soldes différents du registre » peuvent concerner d'anciens comptes créés avant le registre : à examiner).
4. Avec un compte de test : `POST /admin/users/{id}/disable` avec un motif → le compte ne peut plus se connecter ; `enable` le rétablit. `POST /admin/users/{id}/coins` (+10 puis −10, avec motif) → le registre du joueur montre deux lignes « admin_adjustment ».
5. Un compte non-admin, ou admin sans 2FA, reçoit 403 sur toutes les routes `/admin/…`.
6. `GET /admin/audit` montre tes actions (consultations de fiches, ajustements…).

## PR Administration — interface `/admin`
Avant : `npm run set-admin -- ton@email.fr on` et 2FA activée sur ton compte.
1. Va sur `https://ton-site/admin` : vue d'ensemble avec tes chiffres réels et les alertes (lis-les une par une).
2. Utilisateurs : cherche un compte de test, ouvre sa fiche, **suspends-le avec un motif** : le joueur ne peut plus se connecter (essaie dans une fenêtre privée) ; **réactive-le**.
3. Ajuste de +10 pièces avec un motif : le solde du joueur monte de 10 et la ligne apparaît dans ses mouvements.
4. Journal : tes actions y sont (consultations, suspension…).
5. Drapeaux : crée `test_flag` activé à 100 %, vérifie qu'il apparaît, supprime-le.
6. Système : base de données « OK » et liste des contrôles : complète ce qui est marqué ⚠️ (voir `docs/securite.md`).
7. Avec un compte **non administrateur** : `/admin` affiche « Accès refusé ».

## PR Administration — « Voir comme » (impersonation en lecture seule)
1. `/admin` → Utilisateurs → fiche d'un compte de test → **Voir comme cet utilisateur** → confirme : tu arrives sur son dashboard avec un **bandeau rouge** « Lecture seule ».
2. Essaie d'acheter une action ou de réclamer la récompense quotidienne : refus (« lecture seule »). Les pages (Bourse, Immobilier, Banque) s'affichent avec les données du joueur.
3. **Quitter** : retour sur `/admin`, tu es de nouveau administrateur.
4. `/admin` → Journal : `admin_impersonate_start` et `admin_impersonate_stop` sont présents.

## PR Retours utilisateurs et annonces (mini-CMS)
1. Connecté, une bulle **« 💬 Un retour ? »** apparaît en bas à droite de chaque page. Essaie 👍, puis un **Bug** avec une phrase : message « Merci ».
2. `/admin` → **Retours** : ton retour est là, avec la page d'origine. Marque-le « Traité » : il quitte la liste « Nouveau ».
3. `/admin` → **Annonces** : crée une annonce de type *maintenance* publiée : un bandeau orange apparaît en haut du site (teste dans une fenêtre privée, même sans connexion). « Fermer » le masque ; « Dépublier » le retire pour tous.
4. Crée une annonce de type *nouveauté* : elle apparaît en haut de `/changelog`.
5. Le texte est affiché tel quel : écris `<b>gras</b>` dans une annonce, tu dois voir les balises, pas du gras.

## PR Moteur de risque (API : Monte Carlo, crises, score, corrélations)
(L'interface dans les simulateurs et le dashboard arrive dans les PR suivantes ; ici on teste l'API dans Swagger `/api/v1/docs`.)
1. `POST /tools/monte-carlo` avec `{"initial":5000,"monthly":150,"years":12,"annualReturnPct":6.5,"annualVolPct":14}` (sans être connecté) : P10 < P50 < P90 et un texte « pas un conseil ». Deux appels identiques donnent les mêmes chiffres.
2. `POST /tools/stress-test` avec `{"allocation":{"equity_world":60,"bonds":40},"capital":20000}` : 5 crises avec la perte en % et en euros.
3. `POST /tools/risk-score` avec `{"allocation":{"crypto":60,"equity_world":40},"horizonYears":2}` : score élevé, six facteurs expliqués.
4. `GET /tools/correlation?domain=all` : matrice des actifs.
5. Connecté : `GET /risk/portfolio?domain=stocks` après avoir acheté quelques titres : répartition, score, crises de ton portefeuille.

## PR Interface Monte Carlo & Risque (simulateur PEA)
1. `/demo` (sans compte) ou `/simulateurs/pea` → onglet **🎲 Monte Carlo & Risque**.
2. Règle capital 5 000 €, versement 200 €/mois (onglet Simulateur), reviens, **Lancer la simulation** : six cartes (défavorable, médian, favorable, total versé, risque de perte, pouvoir d'achat) et un graphique en éventail.
3. Augmente la volatilité à 30 % et relance : l'éventail s'élargit, le risque de perte monte.
4. **Résiste-t-il aux grandes crises ?** : choisis « 100 % crypto » puis **Tester** : le tableau montre −84 % pour l'hiver crypto 2018 ; le score de risque est « Élevé » avec ses six facteurs expliqués. Choisis « Prudent » : score bas.
5. Onglet **Scénarios Crise** : plus aucune phrase promettant un gain garanti.
6. Si le calcul indique « indisponible » : l'API n'est pas joignable (`NEXT_PUBLIC_API_URL` au build, CORS).

## PR Carte « Risque de ton portefeuille » (tableau de bord)
1. Dashboard → **Simulateur** (Bourse ou Crypto) : sans position, la carte invite à acheter un premier titre.
2. Achète une action : la carte affiche un score sur 100, la pire crise (en % et en 🪙), la répartition (actions françaises / liquidités…).
3. **Voir le détail** : six facteurs avec barres et explications, cinq crises historiques.
4. Achète beaucoup d'une seule action : « Concentration » monte ; en Crypto, « Exposition aux cryptomonnaies » et le score montent nettement.
5. Emprunte sur ton portefeuille (Banque) : le facteur « Endettement » apparaît.

## PR Sécurité — robustesse des entrées (fuzz)
Aucun changement visible pour un usage normal.
1. Formulaire de connexion avec des données normales : inchangé. Erreurs : un mauvais mot de passe affiche toujours le même message.
2. (Facultatif) `cd backend && npm test` : le test `fuzz.test.ts` (environ 20 secondes) passe.
3. Si le paiement Stripe n'est pas encore configuré, le bouton d'abonnement affiche « Le paiement n'est pas disponible pour le moment » (avant : une erreur technique).

## PR Notifications réelles
1. Dashboard → **🔔 Notifications** : plus aucune fausse notification (« Alice Dupont a commencé à vous suivre »…). Liste vide = « Aucune notification pour le moment ».
2. Provoque un événement : change ton mot de passe (Oublié ?) → « Mot de passe modifié » ; active/désactive la 2FA ; emprunte puis laisse passer des années sans payer (Banque) → « Mensualité impayée » / « Appel de marge » ; en Immobilier laisse un locataire ne plus payer → « Loyers impayés ». Un administrateur qui ajuste tes pièces → notification avec le motif.
3. Le nombre de non lues apparaît à côté de « Notifications » ; une pastille s'affiche quelques secondes pour une nouvelle notification (au plus 1 minute après).
4. Cliquer sur une notification la marque comme lue (elle le reste après rechargement) et ouvre la page concernée.

## PR Checklist d'accueil et profil d'investisseur
1. Dashboard → Vue d'ensemble : carte **« 🚀 Tes premiers pas »** avec 7 étapes et une barre de progression ; la prochaine étape est mise en avant.
2. **C'est parti** sur « Remplir ton profil » : 4 questions (niveau, réaction à −30 %, objectifs, marchés) → **Enregistrer** : un encadré vert donne un conseil de départ adapté.
3. Un bouton **Récupérer mes N 🪙** apparaît (10 🪙 par étape terminée) : après clic, ton solde augmente et la mention « récompense reçue » s'affiche. Recliquer ne donne rien de plus.
4. Fais d'autres étapes (leçon, récompense quotidienne, premier achat…) : elles se cochent toutes seules au rechargement, et leur récompense est récupérable.
5. Tout terminé : « Masquer cette carte ».

## PR Tableau de bord : données réelles
1. Dashboard → Vue d'ensemble : plus aucun chiffre du genre « 246 k€ », « +18,3 % », « Jean Dupont », « KYC vérifié », « Sharpe ». Les montants sont en 🪙 et cohérents avec le Simulateur ; un compte neuf affiche des zéros ou « — ».
2. Achète des titres dans le Simulateur, reviens : « Pièces + titres », « Performance », « Positions ouvertes », « Score de risque » ont changé en conséquence.
3. Démarre l'Immobilier et emprunte : « Dette bancaire » et « Biens immobiliers » se mettent à jour.
4. La carte affiche ton vrai pseudo et « INVESTKIT » (ou « INVESTKIT PRO » si tu es Pro) ; la barre latérale affiche ta vraie date d'inscription.

## PR Test de charge
Facultatif, hors heures d'usage : `./ops/load-test.sh https://ton-site-api 10 30` depuis le serveur. Lis « Req/Sec » et « Latency » ; des 429 sont normaux (limite de débit). Si la latence dépasse 1 s avec 30 connexions, préviens-moi.

## PR Crypto (simulation) — données, catalogue et horloge serveur
Voir `docs/crypto-donnees.md` (section « À tester chez moi » et commandes d'import à lancer depuis ton serveur).
- [ ] Migrations 033 et 034 appliquées au démarrage (tables `crypto_assets`, `crypto_candles`, `crypto_import_runs`, `crypto_accounts`).
- [ ] Import réel lancé (journalier d'abord) ; vérifier dans `crypto_import_runs` qu'aucune ligne n'est en erreur.
- [ ] Aucun actif « DEMO* » en production (jeu fictif réservé aux essais).

## PR Crypto — page Marché et graphique
Voir `docs/crypto-graphique.md` (section « À tester chez moi »).

## PR Crypto — ordres et portefeuille
Voir `docs/crypto-ordres.md` (section « À tester chez moi »).

## PR Crypto — impôt, échanges, événements
Voir `docs/crypto-frais-evenements.md` (section « À tester chez moi »).

## PR Crypto — prêt sur portefeuille, classement, administration
Voir `docs/crypto-banque-classement.md` (section « À tester chez moi »).

## PR Crypto — éducation (glossaire, quiz, « ? »)
Voir `docs/crypto-education.md` (section « À tester chez moi »).

## PR Design 1 — Socle du nouveau design (variables, composants, coque)

Cette PR ne change pas encore l'apparence des pages existantes (elles restent comme avant, en sombre). Elle pose les fondations : variables de design, composants,
menu latéral, barre supérieure, recherche. Elle change aussi, pour TOUT le site : la police (Plus Jakarta Sans), le fond de page, l'ancien CSS passé en « priorité basse »,
les bandeaux d'annonce / « voir comme », le bouton « Un retour ? » et les messages de confirmation (toasts).

1. Ouvre le site en navigation privée, connecte-toi, parcours **Tableau de bord, Immobilier, Crypto, Banque, Éducation, Glossaire, Profil** : les pages marchent comme avant (pas de texte coupé, pas de boutons déformés). La police a changé (plus arrondie), c'est normal.
2. En bas à droite, le bouton **« Un retour ? »** s'ouvre : choisis « Avis », clique « Utile » : un message de remerciement s'affiche. Essaie aussi « Bug » avec un texte de plus de 5 caractères.
3. Sur téléphone (ou fenêtre étroite, 390 px) : aucune page n'a de barre de défilement horizontale.
4. **Zoom** : tu peux maintenant zoomer avec deux doigts sur téléphone (avant, c'était bloqué).
5. Si une annonce « info » ou « maintenance » est publiée depuis l'administration, le bandeau s'affiche en haut (violet ou ocre), avec un bouton « Fermer » qui marche.
6. En tant qu'administrateur, **Voir comme** un utilisateur : le bandeau rouge « Lecture seule » s'affiche et « Quitter » te ramène à l'administration.
7. Un compte **administrateur** : `GET /api/v1/auth/me` contient maintenant `isAdmin: true` ; pour un joueur normal, `false`.
8. `/design-system` : **404 en production** (la page de démonstration n'existe qu'en développement). Normal.
9. Aucune erreur rouge dans la console du navigateur (touche F12) sur les pages ci-dessus.

## PR Design 2 — Nouvelle page d'accueil, connexion et inscription (lot 2/6)

À fusionner **après** la PR « Design 1 ». Ouvre le site en navigation privée (tu n'es pas connecté).

**Accueil (`/`)**
1. L'accroche montre « Apprends à investir, sans risquer un centime », trois pastilles **Immobilier / Crypto / Bourse et PEA** avec un point vert « disponible », et une pastille « Bientôt ».
2. Bouge la souris sur l'aperçu : il s'incline en 3D, la pièce tourne, les pastilles flottent. Sur téléphone, il se balance doucement tout seul.
3. Descends : la bande « 3 domaines disponibles aujourd'hui · d'autres arrivent », puis les étapes, les domaines (badge « Disponible »), les fonctionnalités, l'éducation, la sécurité, les tarifs, la FAQ. Les cartes arrivent en profondeur et s'inclinent vers le curseur.
4. **Quiz d'exemple** (section Éducation) : clique une mauvaise réponse, puis « Recommencer », puis la bonne : l'explication s'affiche.
5. **Tarifs** : bascule Mensuel / Annuel ; le prix passe de 7,99 € / mois à 79 € / an. Le bouton Pro affiche « Bientôt disponible » tant que le paiement n'est pas branché (aucun faux paiement).
6. **Bouton principal** : « Rejoindre avec un code d'invitation » tant que l'inscription est sur invitation ; « Créer mon compte » si tu ouvres l'inscription (`INVITE_ONLY=false`). Connecté, il devient « Reprendre là où j'en étais ».
7. Menu : Domaines, Fonctionnalités, Éducation, Tarifs, FAQ font défiler jusqu'à la bonne section ; le bouton soleil/lune bascule sombre/clair ; sur téléphone, le menu (burger) s'ouvre et se ferme.
8. Il n'y a **aucun faux chiffre** (plus de « 10K+ investisseurs » ni de « 99,9 % ») ; les chiffres affichés sont réels (110 actifs, 110 termes du glossaire). Le graphique est étiqueté « données d'exemple ».
9. Pied de page : liens légaux, contact, glossaire ; le lien Discord n'apparaît que si `siteInfo.js` le renseigne.
10. Menu « Animations : Non » (dans `/design-system` en développement, ou `localStorage.ik-motion = off`) : tout reste immobile et à plat.

**Connexion (`/login`)**
11. Connecte-toi avec ton compte : tu arrives sur le tableau de bord. Un mauvais mot de passe affiche un message d'erreur rouge. Le bouton œil affiche/masque le mot de passe. Un compte avec 2FA demande le code à 6 chiffres.
12. « Mot de passe oublié ? » mène à la demande de lien ; le lien reçu mène à « Nouveau mot de passe ».

**Inscription (`/signup`)**
13. Avec un code d'invitation valide : e-mail (vérifié automatiquement : « Email disponible »), mot de passe (les exigences se cochent, la force s'affiche), confirmation, case RGPD, captcha, puis « S'inscrire » : un code arrive par e-mail et la page « Vérifie ton email » s'ouvre (6 cases, saisie chiffre par chiffre, « Renvoyer le code » avec compte à rebours).
14. Les boutons FR / EN / ES changent la langue ; « Voir les détails RGPD » ouvre une fenêtre qui se ferme avec Échap.
15. Le texte ne parle plus de « milliers d'investisseurs » (c'était faux).

**Partout**
16. Mobile (390 px) : pas de défilement horizontal sur l'accueil, la connexion et l'inscription. Mode clair : tout reste lisible.

## PR Design 3 — Tableau de bord (lot 3/6)

À fusionner **après** la PR « Design 2 ». Connecte-toi avec ton compte de test.

**Coque et navigation**
1. `/dashboard` : menu latéral à gauche, barre du haut avec ton solde d'InvestCoins (réel), tes jours actifs, tes notifications.
2. Les onglets sont : Vue d'ensemble, Marché, Simulateur, Académie, Amis, Notifications, Activité, Paramètres. Les anciens onglets « Projets » et « Risques » (qui n'affichaient que « Section en développement ») sont masqués ; un ancien lien `?tab=risk` ouvre l'analyse de risque réelle (dans le Simulateur).
3. Clique chaque onglet : l'adresse change (`?tab=…`), F5 te remet sur le même onglet. Les liens du menu latéral (Bourse et PEA, Éducation, Amis, Paramètres…) ouvrent le bon onglet.

**Vue d'ensemble (chiffres réels uniquement)**
4. Quatre cartes : Patrimoine, Liquidités, Titres, Dette bancaire ; répartition (anneau + barre) ; risque du portefeuille ; trois cartes de domaine Bourse / Crypto / Immobilier ; synthèse. Compare avec ton solde en haut : mêmes valeurs.
5. Compte **gratuit** : les domaines non choisis sont floutés avec « Voir l'offre Pro » (mène à Paramètres). Compte Pro : tout est visible.
6. « Tes premiers pas » : la checklist affiche tes étapes réelles ; « C'est parti » ouvre la bonne page.
7. « Ouvrir l'analyse » / « Voir l'analyse » ouvrent l'analyse de risque (onglet Simulateur), pas une page vide.

**Marché**
8. L'onglet Marché n'affiche plus de faux cours (CAC 40, BTC…). Il montre les vrais cours du marché Crypto simulé (8 actifs, mini-courbes) s'il est activé sur ton compte, sinon un message honnête et un bouton vers `/crypto`.

**Données d'exemple signalées**
9. Onglet Amis : un bandeau « Exemple » rappelle que les amis/guildes/messages sont des profils d'exemple (réseau social pas encore connecté). Onglet Activité : plus de personnes inventées, message « Pas encore d'activité ».
10. Simulateur → Classement : **20 lignes au maximum** (avant, des centaines de joueurs à égalité pouvaient s'afficher).

**Partout**
11. Bascule Mode clair/sombre : texte lisible partout (checklist, risque, info-bulles « ? »).
12. Mobile (390 px) : pas de défilement horizontal ; la barre d'onglets défile sur le côté.
13. Aucune erreur rouge dans la console (F12). Note : en développement, recharger la page très souvent peut déclencher « Trop de requêtes » (limite de 300 requêtes par 15 minutes) : attendre ou relancer le serveur.

## PR Design 4 — Marché Crypto et graphiques (lot 4/6)

À fusionner **après** la PR « Design 3 ». Connecte-toi avec ton compte de test.

**Marché Crypto (`/crypto`)**
1. La page s'ouvre dans la même coque que le reste du site (menu à gauche, barre du haut, bandeau de cours). Le bouton soleil/lune passe en clair : tout reste lisible (tableaux, cartes, bandeaux d'avertissement).
2. Si tu n'as pas encore de compte Crypto, tu choisis une date de départ ; les dates sans données importées sont grisées avec la mention « données pas encore importées ».
3. Ouvre un actif : le graphique pro s'affiche (bougies, ligne, aire ; échelle linéaire/log/% ; indicateurs ; lignes à tracer). Passe de sombre à clair **sans recharger** : les couleurs du graphique suivent. Le logo TradingView reste affiché.
4. Les vrais achats/ventes, ordres limite/stop, portefeuille, banque, classement, journal fonctionnent comme avant (rien n'a été retiré). Les données de test restent étiquetées « fictif ».

**Bourse (Tableau de bord → Simulateur)**
5. Une carte « Historique · LVMH » (ou le titre choisi dans « Acheter ») montre la courbe des cours de clôture **annuels**, étiquetée « Données illustratives » : ce ne sont pas de vrais cours. Au début (année 2010) un seul point existe : un message l'explique ; après « Avancer d'un an », la courbe se dessine.
6. La courbe s'arrête **toujours à ton année simulée** (jamais de futur, même si tu modifies l'adresse). « Voir les valeurs (tableau) » donne les mêmes chiffres en liste.
7. Change de titre dans « Acheter » : la courbe suit. En mode clair, le texte des cartes du simulateur (Année simulée, Solde…) est lisible et le bouton « Avancer d'un an » a un texte clair sur fond violet.

**Partout**
8. Mobile (390 px) : pas de défilement horizontal sur `/crypto` ni sur le Simulateur ; le graphique se zoome au doigt.
9. Aucune erreur rouge dans la console (F12).

## PR Design 5 — Immobilier et Banque (lot 5/6)

À fusionner **après** la PR « Design 4 ». Connecte-toi avec ton compte de test.

**Immobilier (`/immobilier`)**
1. La page s'ouvre dans la coque du site (menu, barre du haut). Bascule clair/sombre : annonces, cartes, bandeaux et boutons restent lisibles.
2. Parcours complet comme avant : filtrer les annonces (ville, type, prix max), ouvrir une annonce, acheter (si domaine gratuit/Pro), « Avancer d'un mois / d'un an », « Mon portefeuille », « Bilan du mois », « Classement », vente, travaux, locataires. Rien n'a été retiré.
3. Si Immobilier n'est pas ton domaine gratuit, le bandeau « Tu peux consulter… l'achat demande… » s'affiche et les achats sont refusés comme avant.

**Banque (`/banque`)**
4. Même coque. Les cartes « Dette en cours » et « Crédit fléché non dépensé » affichent tes vraies valeurs (compare avec le Tableau de bord).
5. « Simuler » un prêt personnel et un prêt sur portefeuille : le résultat s'affiche, la confirmation demande bien l'accord ; « Mes prêts » liste tes prêts ; la procédure de recours (bouton rouge) est lisible en clair comme en sombre.

**Partout**
6. Mobile (390 px) : pas de défilement horizontal sur les deux pages.
7. Aucune erreur rouge dans la console (F12).

## PR Design 6 — Éducation, Glossaire, Amis (lot 6/6, première partie)

À fusionner **après** la PR « Design 5 ». Connecte-toi avec ton compte de test.

**Éducation**
1. `/education` ouvre l'onglet Académie du tableau de bord (comme avant). Ouvre un domaine (ex. `/education/crypto`) : titre, progression, recommandations, chapitres (verrouillés tant que le précédent n'est pas fini), quiz final. Passe en mode clair : tout reste lisible.
2. Ouvre un chapitre : le cours s'affiche, les « mots à retenir » mènent au glossaire, le quiz de fin de chapitre se valide et débloque le suivant.
3. Quiz final (quand tous les chapitres sont terminés) : réponds, valide, le score et le badge s'affichent.

**Glossaire (`/glossaire`)**
4. La recherche filtre les mots ; un lien `/glossaire#cash-flow` ouvre le bon mot ; « Teste-toi » mène au chapitre lié.

**Amis (`/friends`)**
5. **Cette page n'avait plus de mise en forme** (elle utilisait des classes Tailwind alors que Tailwind n'est pas installé : tout s'affichait en texte brut). Elle est maintenant stylée : ton code d'ami + « Copier », onglets Amis / Demandes / Ajouter / Bloqués, listes lisibles en clair et en sombre. Teste l'ajout d'un ami avec un 2e compte de test.

**Partout**
6. Mobile (390 px) : pas de défilement horizontal.
7. Aucune erreur rouge dans la console (F12).

## PR Design 7 — Paramètres, légal, administration, états d'erreur (lot 7, fin de la refonte)

À fusionner **après** la PR « Design 6 ». C'est la dernière : à partir d'ici **toutes** les pages suivent le thème clair/sombre (plus aucune page n'est forcée en sombre).

**Paramètres (`/profile`)**
1. Nouvelle carte **Apparence** : Thème Sombre/Clair et **Animations Auto / Oui / Non**. Choisis « Non » : plus aucun mouvement sur le site ; « Auto » suit le réglage de ton appareil. Les choix restent après rechargement (sur cet appareil).
2. L'interrupteur « Mode Sombre » de l'onglet Affichage change maintenant vraiment le thème (avant, il ne faisait rien). Les « Thèmes Disponibles » (déblocables par XP) restent affichés comme avant.
3. La page était mal mise en forme (classes Tailwind sans Tailwind) : elle est maintenant lisible en clair et en sombre, sans défilement horizontal à 390 px.

**Pages légales et publiques**
4. `/privacy`, `/conditions`, `/cookies`, `/legal`, `/contact`, `/changelog`, `/demo` ont l'en-tête et le pied de page du site (même habillage que l'accueil), une carte lisible en clair et en sombre. **Le texte juridique n'a pas été modifié** (il reste à faire valider).

**Pages internes**
5. `/mes-donnees` (export / suppression RGPD), `/simulateurs/pea|loan1|loan2`, `/guild/<id>` (guilde d'exemple), `/admin` (si ton compte est administrateur avec 2FA) sont dans la coque et lisibles en clair/sombre. Fonctionnement inchangé.

**États d'erreur**
6. Une adresse inexistante (ex. `/nimportequoi`) affiche une page « Cette page n'existe pas » avec les boutons « Retour à l'accueil » / « Mon tableau de bord » (statut 404, non indexée).
7. En cas d'erreur inattendue, une page claire avec « Réessayer » s'affiche (aucun détail technique).

**Partout**
8. Mobile (390 px) : pas de défilement horizontal ; le bouton « Mon tableau de bord » de l'en-tête public passe dans le menu burger quand tu es connecté.
9. Aucune erreur rouge dans la console (F12).

**Contrastes (ajouté après la revue du lot 7)**
10. En mode clair, les textes « atténués » (libellés, heures, mentions) sont plus foncés qu'avant, les couleurs vert/rouge/orange/violet de texte ont été légèrement assombries en clair : vérifie que rien n'est devenu illisible sur le Tableau de bord, Crypto, Immobilier, Banque, Profil, Éducation. (Contrôle automatique fait : plus aucun texte sous 4,5:1 en clair ni en sombre sur ces pages, sauf pastilles décoratives.)

## PR Design 8 — Un tableau de bord vivant (3D et mouvement)

À fusionner **après** la PR « Design 7 ». Ouvre `/dashboard` (Vue d'ensemble).

1. **Accueil** : un grand bandeau violet te salue (« Bonjour/Bon après-midi/Bonsoir, <ton nom> »). Bouge la souris dessus : la pièce 3D, les petites pièces, les sphères et la carte « Patrimoine » se décalent à des profondeurs différentes (parallaxe) et flottent doucement. Sur téléphone : pas de suivi de souris, la scène flotte seulement.
2. **Jours actifs** : la pastille « N jours actifs » n'apparaît que si le compteur est réel (> 0). Si ta récompense du jour est disponible, un bouton blanc « Récupérer ma récompense du jour » s'affiche ; il fait exactement la même chose que le bouton cadeau de la barre du haut (compare ton solde avant/après).
3. **Raccourcis** (Bourse et PEA, Crypto, Immobilier, Apprendre) : les cartes s'inclinent vers le curseur avec un reflet, l'icône se soulève au survol. Chaque carte ouvre la bonne page.
4. **Cartes de chiffres** (Patrimoine, Liquidités, Titres, Dette) : même inclinaison ; les chiffres s'animent jusqu'à leur valeur réelle.
5. **Ma progression** : un anneau se remplit jusqu'à ton avancement vers le niveau suivant ; niveau et XP viennent de ta progression d'éducation (compare avec l'onglet Académie). « Continuer à apprendre » ouvre `/education`.
6. **Fond** : deux halos de lumière dérivent très lentement derrière la page ; à chaque changement d'onglet, le contenu glisse doucement en place ; les boutons ont un petit effet « pressé ».
7. **Animations : Non** (carte Apparence de `/profile`) : tout devient immobile et à plat (pas de flottement, pas d'inclinaison, pas de halo qui bouge). « Auto » respecte le réglage « réduire les animations » de ton appareil.
8. Mobile (390 px) : pas de défilement horizontal, la scène passe au-dessus du texte.

## PR Design 9 — Amis et guildes réels

À fusionner **après** la PR « Design 8 ». Il te faut **deux comptes de test** (A et B). La migration 037 s'applique toute seule au démarrage de l'API.

**Code ami et demandes**
1. `/friends` (ou « Amis » dans le menu) : un bandeau affiche **ton code ami** (8 caractères). « Copier mon code » le copie (« Copié ! »).
2. Avec le compte B : onglet « Ajouter », colle le code de A, « Envoyer la demande » → « Demande envoyée à … ». Un code faux affiche « Aucun joueur avec ce code ». Écrire ton propre code ou renvoyer une demande donne un message clair.
3. Avec A : une notification « Nouvelle demande d'ami » arrive ; onglet « Demandes (1) » → « Accepter ». A et B apparaissent dans « Amis » avec **leur niveau et leur XP** (compare avec leur onglet Académie). « Refuser » / « Annuler » effacent la demande.
4. « Retirer » (avec confirmation) supprime l'amitié des deux côtés. « Bloquer » la supprime aussi : B ne peut plus renvoyer de demande à A et **ne voit pas qu'il est bloqué** (même message que pour un code inconnu). « Débloquer » dans l'onglet « Bloqués ».

**Guildes**
5. Onglet « Guilde » : « Créer ma guilde » (nom 3 à 24 caractères). Le nom est refusé s'il existe déjà (même avec d'autres majuscules ou accents) ou contient des caractères spéciaux.
6. Le chef voit un **code d'invitation** : avec B, « Rejoindre » + ce code. Le classement de la guilde montre les membres par XP (🥇🥈🥉). « Changer le code » rend l'ancien code inutilisable.
7. Le chef peut « Retirer » (le membre reçoit une notification), « Passer chef », « Dissoudre » (confirmation à chaque fois). Un membre ne voit aucun de ces boutons et ne voit pas le code. « Quitter la guilde » fonctionne ; si le chef part, le membre le plus ancien devient chef.

**Tableau de bord**
8. L'onglet **Amis** du tableau de bord affiche la même chose (plus aucun profil d'exemple : Alice, Bob… ont disparu). L'onglet « Activité » (fil inventé) n'existe plus. `/guild/<n'importe quoi>` redirige vers l'onglet Guilde.

**Vie privée**
9. Seuls le nom de joueur, le niveau et l'XP sont visibles par les amis et la guilde — jamais l'e-mail ni le vrai nom. Il n'existe aucune liste de joueurs à parcourir.
10. Mon compte → export de mes données : une rubrique « social » contient mon code ami, mes amitiés et ma guilde. La suppression du compte retire tout.
11. Mobile (390 px) : pas de défilement horizontal ; clair et sombre lisibles.

12. **Éducation (correctif de sécurité)** : termine un vrai chapitre : tu gagnes toujours 20 🪙 et 100 XP une seule fois. Avant ce lot, un identifiant de chapitre inventé rapportait aussi des pièces : ce n'est plus possible (le serveur répond « Chapitre inconnu »).
13. Dans une guilde où quelqu'un t'a bloqué (ou que tu as bloqué), il apparaît « Joueur masqué ». Quand le chef retire un membre, le code d'invitation change.

## PR Design 10 — Les trois simulateurs

À fusionner **après** la PR « Design 9 ». Aucune migration. Les pages sont publiques : teste aussi déconnecté.

1. `/demo` : trois cartes (PEA, crédit immobilier, investissement locatif) qui ouvrent chacune la bonne page. Plus d'écran intégré ni de faux « temps réel ».
2. **Crédit immobilier** : avec 220 000 €, 30 000 € d'apport, 3,5 % sur 20 ans, la mensualité s'affiche, avec l'assurance comptée **une seule fois**. Les onglets Amortissement (le capital restant finit à 0), Capacité, Remboursement anticipé (choisir « durée plus courte » ou « mensualité plus basse ») et Comparer fonctionnent. Les icônes « ? » ouvrent le glossaire.
3. **PEA** : changer le versement, la durée, les frais met les chiffres à jour ; l'onglet Frais montre ce que les frais te coûtent ; Scénarios montre prudent / central / optimiste ; Fiscalité distingue PEA (après 5 ans) et compte-titres ; Risque affiche une simulation (peut afficher « trop de requêtes » après 40 essais en 15 min).
4. **Locatif** : comparer les trois régimes (micro-foncier, réel, meublé) ; cash-flow avant/après impôt ; projection ; mettre un loyer à 0 ne casse rien.
5. « Copier le lien » puis ouvrir le lien dans une fenêtre privée : mêmes valeurs. « Réinitialiser » remet les valeurs de départ. « Imprimer / PDF » ouvre l'impression.
6. Connecté : la page est dans la coque du site (menu à gauche). Déconnecté : en-tête public. Clair et sombre lisibles ; mobile 390 px sans défilement horizontal.
7. Les hypothèses fiscales affichées (17,2 %, 12,8 %, 5 ans, 35 %…) sont à **reconfirmer** sur les sources officielles avant l'ouverture au public.

## PR Design 11 — Inscription, connexion et pages liées

À fusionner **après** la PR « Design 10 ». Aucune migration. Variable facultative : `AUTH_MIN_RESPONSE_MS` (durée minimale des réponses d'inscription, 700 par défaut).

**Sécurité (le plus important)**
1. Inscris-toi avec une adresse **déjà utilisée** (avec un code d'invitation valable) : tu vois exactement le même écran « C'est presque fini » qu'avec une adresse neuve, sans aucune erreur. La boîte mail de l'adresse existante reçoit « Quelqu'un a essayé de créer un compte… ». Le code d'invitation n'est **pas** consommé (`npm run invite -- list`).
2. Dans le champ e-mail, plus aucun message « Email disponible » ni requête en direct.
3. Connexion : un e-mail inconnu et un mauvais mot de passe affichent **le même message**. Mot de passe oublié : même écran pour une adresse connue ou non. Vérification du code : un code faux et un code périmé donnent « Code invalide ou expiré ».

**Inscription (3 étapes)**
4. `/signup` : le code d'invitation est le **premier** champ. Un faux code → « Ce code n'est pas reconnu ou n'est plus valable ». L'indicateur en haut montre l'étape réelle (1, 2, 3) et se remplit en vert au fur et à mesure.
5. Étape 2 : les règles s'affichent pendant la saisie et **se replient** quand tout est bon ; une seule barre de force ; la confirmation réagit à chaque lettre ; l'œil affiche/masque ; ton gestionnaire de mots de passe propose d'enregistrer le mot de passe.
6. Étape 3 : deux cases séparées (conditions, confidentialité) avec des liens qui ouvrent les vraies pages ; le bouton reste grisé tant qu'elles ne sont pas cochées. Pas de case « Je suis un humain » : le captcha est invisible. Succès animé (coche et confettis), puis la page du code.
7. Un compte neuf reçoit bien son e-mail avec le code ; « Renvoyer le code » fonctionne.

**Code, connexion, 2FA**
8. `/verify-email` : 6 cases, **coller** le code entier remplit tout et valide tout seul ; un mauvais code affiche une erreur et vide les cases.
9. `/login` : connexion normale ; avec la 2FA, 6 cases de code (validation automatique au 6e chiffre) et le lien « Utiliser un code de secours ».
10. `/forgot-password`, `/reset-password` (lien reçu par e-mail), `/nexistepas` (page 404) : même fond et mêmes composants ; une erreur forcée affiche la page « Quelque chose s'est mal passé ».

**Fond, accessibilité, mobile**
11. Sur ordinateur, la scène de gauche est vivante : le mot du titre change, les bougies se dessinent, la pièce tourne, les cartes flottent et suivent un peu la souris ; la carte du formulaire a une bordure lumineuse qui tourne. Sur téléphone : un bandeau compact au-dessus du formulaire. Le fond bouge lentement (aurore, halos, courbes). Dans Profil → Apparence → Animations = « Non » (ou réglage « réduire les animations » du téléphone) : fond **fixe**. Onglet en arrière-plan : le CPU retombe.
12. Plus d'en-tête au milieu de la carte ; « Aller au contenu » n'apparaît qu'en appuyant sur Tab. Plus de badge rouge « Issue » en mode développement sur ces pages.
13. Mobile 390 px : formulaire seul, pas de défilement horizontal, clair et sombre lisibles ; tout se fait au clavier (Tab, Entrée).
14. La bascule de langue FR/EN/ES a disparu (traductions incomplètes) ; tout est tutoyé.

## PR Design 12 — Immobilier façon portail d'annonces

À fusionner **après** la PR « Design 11 » (#75). **Une migration** (`038`, s'applique toute seule au démarrage de l'API). Il te faut un compte avec le domaine Immobilier (gratuit ou Pro) et des InvestCoins.

**Chercher**
1. `/immobilier` : bandeau « Annonces fictives, simulation à but éducatif » ; barre de recherche, filtres, cartes avec image, prix en € **et** en 🪙, pastille DPE, pastilles « Vente pressée » et « Travaux à prévoir », ♥.
2. Tape « Valcourt » : seules les annonces de Valcourt restent. « Filtres » : type, budget, surface, pièces, état, DPE, rendement, options → les pastilles de filtres actifs se retirent d'un clic. Tri par prix, prix au m², rendement.
3. Grille / Liste / Carte : sur la carte, choisis une ville ; chaque annonce a une pastille de prix ; survol d'une pastille = carte de la liste mise en évidence ; clic = fiche. Les quartiers sont teintés selon le prix au m² réel des annonces.
4. ♥ : le favori reste après rechargement et « Favoris (n) » filtre la liste. « Mes recherches » → « Enregistrer cette recherche » ; après « Avancer d'un an », une pastille indique les nouvelles annonces.

**Fiche et achat**
5. Fiche : galerie (façade, séjour, cuisine, plan), description, diagnostics (échelle DPE), charges, quartier (tension locative), loyer estimé, rendements brut et net. Les images sont des **illustrations** (mention visible).
6. « Simuler mon financement » : change l'apport et la durée → mensualité et décision de la banque expliquée ; apport très bas = refus expliqué et « Acheter » bloqué. Mode **Avancé** (en haut à droite) : TAEG, intérêts, assurance, frais. Mode Simple par défaut.
7. « Faire expertiser » affiche les défauts cachés. « Acheter ce bien » → confirmation → animation de **signature chez le notaire** → « Clés remises » → « Voir mes biens ».

**Mes biens, bilan, classement**
8. Mes biens : carte du bien (statut, loyer, prochaine échéance, alertes). « Mettre en location », « Payer les travaux » sur la carte ; « Gérer le bien » ouvre la fiche avec vente (85–110 %), rénovation (devis), assurance loyers, selon la situation.
9. « Avancer d'un mois » plusieurs fois : Bilan du mois (tableau, enveloppe « Courrier du mois » qui s'ouvre, journal des événements). Classement inchangé.
10. Aucun chiffre ne doit avoir changé par rapport à avant : mêmes prix, mensualités, loyers, décisions de la banque.

**Mobile et accessibilité**
11. 390 px : « Filtres » = tiroir plein écran, bascule Liste/Carte, fiche en pleine page avec barre « Simuler et acheter » collante, aucun défilement horizontal.
12. Clavier : Tab jusqu'au titre d'une annonce, Entrée ouvre la fiche. Réglage « Animations : Non » : plus aucun mouvement.
13. Parkings et immeubles n'apparaissent pas dans les filtres (ils n'existent pas dans le catalogue) : c'est voulu et expliqué sous « Type de bien ».

## Étape 1 — e-mails (pseudo, nouveau design)

1. Crée un compte avec une adresse à toi : le mail « Ton code de vérification InvestKit » arrive, avec l'en-tête animé, la pièce, le grand code et le bouton « Vérifier mon e-mail ».
2. Il dit « Bonjour, » (pas de pseudo avant l'onboarding) et jamais « Bonjour User ».
3. Clique sur le bouton : la page de vérification s'ouvre avec ton adresse déjà remplie.
4. Ouvre le mail sur Gmail (ordinateur et téléphone), Outlook et en mode sombre : bouton visible, code lisible, rien ne déborde.
5. Désactive l'affichage des images : le mail reste lisible (textes, code et bouton).
6. « Mot de passe oublié » : le mail « Nouveau mot de passe » arrive avec son bouton et la mention « valable 1 heure ».
7. Aperçu sans envoi : `cd backend && npm run mail:preview` crée 4 fichiers HTML à ouvrir ; ajoute `-- --send ta-boite-de-test@…` pour les recevoir.
8. Les images viennent de `<FRONTEND_URL>/mail/…` : vérifie que cette adresse s'ouvre sur ton serveur après déploiement.
## Sécurité : session ouverte seulement sur preuve

1. Inscris un compte de test : le code arrive par e-mail ; tape-le sur la page de vérification, puis tu arrives sur « Choisis ton pseudo » **déjà connecté**.
2. Termine l'onboarding : pseudo enregistré, tu arrives sur le tableau de bord.
3. Avec un mauvais code (8 fois), la page refuse puis dit « Trop d'essais ».
4. Dans un navigateur sans session, ouvre `/onboarding` et valide : message d'erreur, aucune connexion.
5. Après déploiement : lance `ops/sql/detecter-session-sans-preuve.sql` (voir `docs/faille-session-sans-preuve.md`) et envisage de changer `JWT_SECRET`.
6. Déploie le site et l'API ensemble.

## Refonte des emojis (icônes SVG)

1. Parcours le site (tableau de bord, éducation, banque, crypto, immobilier, classements, amis, profil, paramètres) : **plus aucun emoji** dans les titres, boutons, menus, badges ; que des icônes au même trait.
2. Chaque montant en InvestCoins est suivi de la **petite pièce dorée** ; au survol ou au lecteur d'écran : « InvestCoins ».
3. Les badges (tableau de bord, profil, pop-up de récompense) sont dans un médaillon dont la couleur dépend de la rareté.
4. Onboarding : enregistre un pseudo, le message de succès est vert ; laisse le pseudo vide, le message d'erreur est rouge.
5. Les messages venant du serveur (prêts, notifications, erreurs d'ordre) disent « InvestCoins », sans emoji.
6. Compare avec `docs/refonte-emojis/comparaison.html`.

## Immobilier : carte interactive, Acheter / Louer, fiche immersive

1. Page Immobilier → « Carte » : tu vois les villes avec des **bulles numérotées**. Molette (ou +/−) : la carte zoome, les bulles se séparent en pastilles de prix. Glisse pour te déplacer. Clique une bulle : elle zoome sur le groupe.
2. Clique une pastille : un **aperçu** s'ouvre (image, prix, surface, DPE). « Voir la fiche » ouvre la fiche.
3. Clavier : clique sur la carte puis flèches (déplacement), `+` `-` (zoom), `0` (tout voir). Tab sur les pastilles : chacune se lit au lecteur d'écran.
4. Sur téléphone : bascule **Liste / Carte** ; pince avec deux doigts pour zoomer ; la page ne défile pas quand tu bouges la carte.
5. Onglet **Louer** : les cartes montrent le loyer, la fiche affiche « Louer ou acheter ? » et le bouton « Voir ce bien à l'achat ».
6. **Filtres** : prix au m², neuf/ancien, loyer (en Louer) ; le panneau s'ouvre bien centré. Tri par loyer en mode Louer.
7. Fiche : image plein cadre, chiffres clés, curseurs d'apport et de durée qui mettent à jour la mensualité, liens « Pour aller plus loin ».
8. Aucun emoji nulle part sur l'écran Immobilier.

## Glossaire refait

1. Ouvre `/glossaire` : 110 mots, une barre de recherche, des boutons **Domaine** et **Niveau**, et un index A–Z.
2. Tape « cash » puis « EPARGNE » (sans accent, en majuscules) : la liste se réduit **à chaque lettre**, le texte trouvé est surligné. Le bouton croix efface la recherche.
3. Clique « Crypto » puis « Débutant » : seuls les mots des deux filtres restent ; « Tout réinitialiser » remet tout. Les lettres sans mot sont grisées.
4. Clique une lettre de l'index : la page descend à cette lettre.
5. Ouvre une fiche (« Voir la fiche complète ») : définition, **exemple concret**, « Dans le jeu », **« À ne pas confondre avec »** (cliquable : saute vers l'autre fiche), liens vers la leçon et le simulateur.
6. Ouvre `/glossaire#pea` : la fiche PEA s'ouvre toute seule ; en bas, le bloc **source** (statut, date de contrôle, lien officiel).
7. Dans le jeu, clique une icône « ? » puis « Voir l'explication complète » : tu arrives sur la bonne fiche, ouverte.
8. Sur téléphone (390 px) : pas de défilement horizontal, boutons faciles à toucher.
9. **À faire avant l'ouverture au public** : relire sur les sites officiels les fiches de `docs/glossaire.md` marquées « à relire » (taux de prélèvements sociaux, plafond de 35 %, calendrier DPE…) et mettre à jour la date de contrôle dans `app/lib/glossaireMeta.js`.

## Badge Pro doré, # personnalisé, boutons d'abonnement

1. Avec un compte **Pro** et un compte **gratuit** qui sont amis : chacun voit la petite couronne dorée à côté du pseudo de l'autre s'il est Pro ; le compte gratuit n'en a pas. Survole la couronne (ou tabule dessus) : « Membre Pro ».
2. Page **Amis** : tu vois « Ton identifiant » (Pseudo#1234) et le bouton « Copier mon identifiant ». Envoie-le à un autre compte : sur « Ajouter », il tape `Pseudo#1234` et la demande arrive.
3. Compte **Pro** : « Choisir mon # », tape `Alpha26` : l'identifiant devient Pseudo#Alpha26. Un deuxième changement le même mois est refusé avec la date du prochain.
4. Essaie `admin`, `support`, `investkit` : refusés. Essaie le # d'un autre joueur déjà pris avec le même pseudo : refusé.
5. Tes amis sont toujours là après le changement de #.
6. Compte **gratuit** : « Mon # (Pro) » explique que c'est réservé aux Pro et propose « Voir les offres ».
7. Paramètres → Données : interrupteur « Afficher ma couronne Pro aux autres joueurs ». Désactive-le : l'ami ne voit plus la couronne ; toi, tu la vois toujours chez toi.
8. Paramètres → Abonnement : Pro abonné → « Gérer mon abonnement » ouvre le portail Stripe (mode test) ; **Pro accordé à la main** → « Accès Pro offert, aucun abonnement à gérer. » sans bouton.
9. Menu du profil (en haut à droite) : « Gérer mon abonnement » si Pro, « Voir les offres » sinon.
10. Fin d'abonnement (à simuler en base de test) : la couronne disparaît tout de suite ; le # choisi reste 30 jours puis revient à un # automatique ; un réabonnement dans les 90 jours le rend.
11. Après déploiement (migration 041) : tous les joueurs qui ont un pseudo reçoivent un # automatique, sans doublon (vérifie : `SELECT username, player_tag FROM users WHERE username IS NOT NULL LIMIT 10;`).

## À faire AVANT l'ouverture au public : liste d'insultes des # personnalisés

La liste d'insultes interdites dans les # choisis (`backend/src/config/tagRules.ts`, champ `insults`) est volontairement **courte** : elle ne contient que des mots sans ambiguïté. À compléter par la modération (et à relire régulièrement) avant d'ouvrir l'inscription à tous. Les mots réservés (admin, support, investkit…) sont déjà en place.

## Mail de bienvenue (une seule fois)

1. Après déploiement, les comptes existants ne reçoivent AUCUN mail de bienvenue (la migration 039 les marque comme déjà servis, une seule fois).
2. Crée un compte de test, vérifie l'e-mail, choisis un pseudo : le mail « Bienvenue sur InvestKit » arrive, avec ton pseudo.
3. Reviens dans Paramètres, change ton pseudo : aucun second mail. Connecte-toi, déconnecte-toi : aucun mail.
4. Contrôle en base (lecture seule) : `SELECT email, welcome_email_sent_at FROM users ORDER BY created_at DESC LIMIT 5;` : la date est remplie pour le compte de test.
5. Ordre de fusion : après la PR sécurité #85 (le mail part depuis `save-preferences`, désormais protégée) et avec les mails de la PR #80.
6. (Mail de bienvenue, reprise après panne) Si l'envoi échoue, le joueur est réessayé à la validation suivante de son profil, au plus 3 fois, avec 5 minutes d'écart ; le plafond d'un mail par adresse et par jour ne compte que les envois réussis.

## InvestCoins : solde et patrimoine instantanés

À tester chez toi, avec un compte de test :
1. Tableau de bord : note le solde (barre du haut), le **Patrimoine** et les **Liquidités**. Clique « Récupérer ma récompense du jour » (même en double-cliquant) : les TROIS chiffres montent **ensemble, tout de suite** (petit compteur animé de moins d'une seconde), sans recharger. Un seul gain.
2. Ouvre un deuxième onglet sur le tableau de bord, récupère une récompense dans le premier : le deuxième se met à jour tout seul.
3. Fais un quiz de cours réussi pour la première fois : le solde monte aussitôt ; refais-le : rien de plus.
4. Récupère une récompense de « Tes premiers pas » (mission) : idem.
5. Achète des titres en Bourse puis reviens sur le tableau de bord : Liquidités ↓, Titres ↑, Patrimoine presque inchangé (seuls les frais le baissent).
6. Prends un prêt à la Banque : Liquidités ↑ et Dette ↑ du même montant, **Patrimoine inchangé** (Patrimoine = liquidités + titres − dettes).
7. Coupe ta connexion puis récupère la récompense : message d'erreur clair, le solde affiché reste la vraie valeur du serveur.
8. Dans Paramètres > Affichage, mets « Animations » sur Non (ou active « réduire les animations » sur ton système) : les chiffres changent d'un coup, sans compteur.

## Paramètres > Profil : photo, nom, e-mail, bio (vrais enregistrements)

À tester chez toi, avec un compte de test :
1. Paramètres > Profil : le champ **Adresse e-mail** montre TON adresse (grisée, non modifiable), **Nom complet** et **Bio** sont vides si tu n'as rien saisi (texte grisé d'aide seulement). Plus de « jean.dupont@example.com » ni de bio d'exemple.
2. Clique « Enregistrer les modifications » sans rien changer : message « Aucune modification à enregistrer ». Rien n'a bougé (recharge la page pour vérifier).
3. Saisis un nom et une bio, enregistre, recharge : ils sont toujours là. Vide la bio, enregistre, recharge : elle reste vide.
4. **Photo** : « Choisir une photo » → la photo apparaît **tout de suite** dans le rond en haut à droite, sans recharger. Ouvre le menu profil, Classements > Amis, Amis : elle y est aussi.
5. Essaie un faux fichier (un .txt renommé en .png) : message clair, rien n'est enregistré. Essaie une image de plus de 15 Mo : refusée.
6. « Supprimer ma photo » : la lettre de ton pseudo revient partout.
7. **Changer l'e-mail** : bouton « Changer mon adresse e-mail » → nouvelle adresse + mot de passe → un code arrive sur la NOUVELLE adresse, et un message d'alerte sur l'ANCIENNE. Tant que le code n'est pas saisi, l'adresse de connexion ne change pas. Après confirmation, un second message prévient l'ancienne adresse.
8. Avec la double authentification activée, le formulaire demande aussi le code de l'appli.
9. Après déploiement : l'API crée toute seule les tables `user_avatars` et `email_change_requests` et les colonnes `bio`, `avatar_id` (migration 042, rien à faire). Les photos sont stockées **dans la base** (donc sauvegardées avec elle et jamais sur le disque de l'application). Nouvelle dépendance du serveur : `sharp` (traitement d'image, licence Apache-2.0, version fixée) : lance `npm ci` dans `backend/`.

## Chasse aux faux contenus

À vérifier chez toi :
1. Tableau de bord > « Actualités » : plus de CAC 40 / Alerte BTC / +5 k€. Soit les vraies annonces publiées dans l'administration, soit « Aucune actualité pour le moment ». Publie une annonce de test dans /admin : elle apparaît.
2. /profile > Compte : ton VRAI e-mail (plus l'adresse écrite en dur) ; « Exporter » télécharge un fichier JSON ; « Se déconnecter » te déconnecte ; « Modifier l'email » ouvre Paramètres > Profil ; « Changer le mot de passe » ouvre « mot de passe oublié ».
3. /profile : plus de calendrier aux cases aléatoires (recharge plusieurs fois : le texte ne change pas) ; « Série » écrit en français.
4. Paramètres > Affichage : Devise et Format de date sont du texte (« Fixe pour l'instant »), plus de listes qui ne font rien. Paramètres > Sécurité : plus de « Sessions actives ». Paramètres > Données : « Exporter » télécharge le fichier, « Lire » ouvre la politique de confidentialité.
5. Bandeau des cours : lance `cd backend && npm run crypto:check-series -- --symbols BTC,ETH,BNB,XRP --days 24` sur ton serveur : tu vois les 24 derniers cours et la corrélation entre actifs (jamais 1,000 pour de vrais cours).
6. Lis `docs/faux-contenus.md`, section « À ton choix » : décisions attendues.

## Suppression du compte (vrai bouton)

Avec un compte de test (jamais le tien) : Paramètres > Données > « Supprimer mon compte » (ou /profile > Compte) : le formulaire demande le mot de passe (+ code 2FA si activée) et d'écrire SUPPRIMER ; un mauvais mot de passe est refusé ; « Télécharger mes données avant » fonctionne ; après confirmation, tu es renvoyé sur l'accueil et le compte n'existe plus (connexion impossible). Avec un abonnement Stripe de test : il est annulé d'abord.

## Suppression de compte : conservation et anonymisation

1. Avec un compte de test avec abonnement Stripe de test : « Supprimer mon compte ». Tu reçois deux e-mails (« suppression en cours » puis « compte supprimé »). L'abonnement est annulé chez Stripe.
2. Reconnecte-toi avec l'ancien navigateur : tu es déconnecté (jeton refusé).
3. Dans l'administration : la statistique « pièces par domaine » n'a pas bougé.
4. En base : `SELECT * FROM billing_records_archive ORDER BY id DESC LIMIT 1;` : formule et dates, aucun e-mail ni identifiant de joueur.
5. Si le compte était chef de guilde : la guilde existe toujours avec un nouveau chef (le plus ancien membre), ou a disparu s'il était seul.
6. Les amis du compte supprimé ne voient plus ni son nom, ni ses notifications « X est ton ami ».
7. Relis la section 8 de la page de confidentialité (à faire valider par un professionnel).


## Économie : un seul fichier de réglages (capital de départ 10 000 🪙)
À dérouler chez toi **après avoir fusionné cette PR ET la suivante** (« Immobilier 1 🪙 = 1 € »), car les deux vont ensemble. Rien à faire sur ta base : les comptes de test repartiront de zéro avec le script de remise à zéro (PR plus tard).

1. Ouvre la page d'inscription : le compteur animé s'arrête sur **10 000** (et non 500).
2. Crée un compte neuf (copie de test) et valide l'e-mail : le solde affiché est **10 000 🪙**.
3. Compte qui passe Pro : le solde augmente de **10 000 🪙** une seule fois (ligne « pro_starting_bonus » dans l'historique).
4. Glossaire, fiche « InvestCoin » : l'exemple parle de **10 000** InvestCoins.
5. Ouvre `backend/src/config/economy.ts` : tous les montants (capital, bonus Pro, seuil de classement, récompenses, plafond de dette) sont dans ce seul fichier, chacun marqué « VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER ».
6. Aucun autre fichier ne doit contenir ces montants : le test `economy.test.ts` le vérifie.

## Immobilier : 1 InvestCoin = 1 €
À dérouler chez toi après avoir fusionné cette PR **juste après** « Économie : un seul fichier de réglages ». Les comptes de test existants gardent leurs anciens soldes : utilise un compte neuf (ou le script de remise à zéro, PR plus tard).

1. Compte neuf (10 000 🪙), domaine Immobilier, profil Salarié : la page « Chercher » affiche pour chaque bien « 32 000 € ≈ 32 000 🪙 » (avant : « ≈ 1 600 🪙 »).
2. Ouvre un bien : le champ « Apport » indique « 1 InvestCoin = 1 € » ; un apport de 12 000 🪙 donne un apport de 12 000 € dans le détail du financement.
3. Achète un petit bien (moins de 50 000 €) avec environ 30 % d'apport : ton solde baisse **exactement** de l'apport, des frais de notaire (arrondis au-dessus) et des frais de dossier. Regarde l'historique dans Banque et InvestCoins : aucune ligne positive n'apparaît pour un achat.
4. Banque, prêt personnel : minimum **500 🪙**, plafond = 6 mois de revenus nets (Salarié : 14 400 🪙).
5. Banque : le plafond de dette affiché est **500 000 🪙**.
6. Tableau de bord : la phrase sous le patrimoine dit « Tous les montants sont en InvestCoins (1 InvestCoin = 1 €) ».
7. Glossaire, fiche « InvestCoin » : « 1 InvestCoin vaut 1 € de jeu, dans tous les domaines ».
8. La Crypto reste en dollars pour l'instant (conversion en euros avec le taux de la BCE : PR suivante).

## Récompense quotidienne : 10 🪙 fixes, 3 jours par semaine, sans série
À dérouler chez toi après avoir fusionné cette PR (après « Immobilier : 1 InvestCoin = 1 € »). Utilise un compte neuf.

1. Barre du haut : clique sur le bouton cadeau. Message **« +10 InvestCoins ! »** (sans mot « série »), solde +10.
2. À côté du cadeau et sur l'accueil du tableau de bord : une pastille **« 1 jour actif »** (icône calendrier). Plus aucune flamme ni « Série de N jours ».
3. Reclique sur le cadeau : **« Récompense du jour déjà récupérée. »** Le solde ne bouge pas.
4. Le bouton cadeau n'a plus d'animation qui clignote : juste un anneau fixe quand la récompense est disponible.
5. Historique (Banque et InvestCoins) : une ligne « daily_reward » de +10, rien d'autre.
6. Plafond de la semaine : vérifié par un test automatique (3 jours payés, le 4e refusé). Pour le voir à l'écran, **sur la copie de test uniquement**, ajoute 3 lignes pour les jours déjà passés de la semaine en cours (remplace l'identifiant et les dates par ceux de ton compte de test et du lundi, mardi, mercredi de cette semaine) :
   `INSERT INTO daily_reward_claims (user_id, claim_day, week_start, coins) VALUES ('<id>','<lundi>','<lundi>',10),('<id>','<mardi>','<lundi>',10),('<id>','<mercredi>','<lundi>',10);`
   Puis clique sur le cadeau : **« Tu as déjà reçu tes 3 récompenses de la semaine. La prochaine est disponible lundi. »**
7. Page d'accueil du site (déconnecté) : la puce « Récompense du jour » et la phrase « jusqu'à 3 par semaine, sans série à tenir » remplacent « Série de 7 jours ».
8. Les jours actifs ne baissent jamais, même après des semaines d'absence.

## Bonus « premiers pas » (30 / 30 / 40, une seule fois)
À dérouler chez toi après avoir fusionné cette PR (après « Récompense quotidienne »). Utilise un compte **neuf**. Aucun écran nouveau : seul le solde et l'historique changent.

1. Éducation, parcours « Crypto marché », chapitre 1 : réussis le quiz. Ton solde augmente de **50** (20 de chapitre + **30 de bonus « première leçon »**).
2. Chapitre 2 : seulement **+20** (pas de second bonus). Refaire le quiz du chapitre 1 ne donne rien.
3. Premier achat en Bourse d'au moins **100 🪙** : tes pièces baissent du prix et des frais, puis **+30** (bonus « premier investissement »). Un achat plus petit que 100 🪙 ne donne pas le bonus. Un second achat non plus.
4. Termine les 5 chapitres puis le quiz final : **+100** (quiz final) et **+40** (bonus « premier quiz réussi »).
5. Dans l'historique (Banque et InvestCoins), les bonus apparaissent avec le motif `first_step_bonus`. Au total jamais plus de **100** pièces de bonus.
6. Ouvre dans ton navigateur `…/api/v1/economy/first-steps` (connecté) : tu vois les trois bonus, ceux déjà reçus et les montants. Il n'existe aucun bouton ni aucune adresse pour « réclamer » un bonus.

## Textes honnêtes (« simulé », pas « réel » ni « en direct »)
À dérouler chez toi après avoir fusionné cette PR (dernière du lot « économie »).

1. Connecté, avec un compte Crypto : le bandeau de cours sous la barre du haut commence par **« Marché »** (ou **« Données fictives »** si l'historique n'est pas importé : c'est alors écrit en toutes lettres). Passe la souris dessus : « cours historiques rejoués à ta date de jeu : ils ne sont pas en direct ».
2. Page d'accueil du site (déconnecté), tout en haut : « …les règles s'inspirent de la vraie vie, en version simplifiée, et les pertes restent virtuelles. » Plus de « tout se passe comme dans la vraie vie ».
3. Même page, étape 3 : « Je m'entraîne sur des règles inspirées du réel » ; bloc « Des simulations réalistes » : « taux inspirés de l'histoire … les risques à comprendre ».
4. Tableau de bord, onglet Marché, en bas : « Les indices boursiers et les références immobilières ne sont pas disponibles pour l'instant : aucune source de données fiable n'est branchée, donc rien n'est affiché. »
5. Crypto, estimation d'un ordre : la note parle du « prix de référence », plus du « prix réel ».
6. Cherche dans le site les mots « en direct », « temps réel », « cours réels » : ils ne restent que pour dire que ce n'est PAS le cas.

## Taux de change BCE (préparation de la Crypto en InvestCoins)
À dérouler chez toi **sur ta copie de test** après avoir fusionné cette PR (les PR 5, 6 et 7 se déploient ensemble). Aucun effet visible tant que la PR 6 n'est pas fusionnée.

1. Télécharge le fichier des taux de la BCE (voir `docs/taux-bce.md`), puis vérifie-le sans rien écrire : `cd backend && npm run fx:import -- --check --file ./ton-fichier.csv`. Tu dois voir « N taux valides du 2014-… au 20… » et « rien n'est écrit ».
2. Si tu as accès au site de la BCE depuis le serveur : `npm run fx:import -- --from 2014-01-01`. Tu dois voir « ✓ N taux écrits ». Relance la même commande : même nombre, aucune erreur.
3. Sinon, pour essayer : `npm run fx:import -- --demo` (taux **fictifs**, à ne pas faire sur une vraie base).
4. Ouvre `…/api/v1/crypto/state` (connecté, avec un compte Crypto) : le champ `fx` indique le taux du jour, `demo: false` pour de vrais taux.
5. Dis-moi si ton fichier a un format différent : le lecteur est écrit d'après la documentation, pas testé sur le vrai site.

## Crypto en InvestCoins
À dérouler chez toi **sur ta copie de test**, après avoir fusionné les PR « taux BCE » puis « Crypto en InvestCoins » (et l'affichage, qui se déploient ensemble). Il faut des taux importés (voir « Taux de change BCE »).

1. Crypto, fiche d'un actif : le prix est en **🪙** (avec le dollar entre parenthèses, plus petit). Le graphique indique « en InvestCoins ».
2. Estimation d'un achat : « Prix estimé … 🪙 (marché … 🪙, soit … $) ». Achète : tes pièces baissent du montant + frais, et l'historique montre le prix en 🪙.
3. Ordre limite : le champ dit « Prix limite en InvestCoins par unité ». Un prix limite égal au prix de marché en 🪙 est accepté ; un stop-loss au-dessus du prix actuel est refusé.
4. Avance de quelques jours : un ordre limite placé sous le prix se déclenche seulement si le cours converti passe sous ton prix ; la notification dit « à X InvestCoins par unité ».
5. Portefeuille : prix moyen, prix actuel, valeur en 🪙 ; la somme « Patrimoine » colle à tes pièces + valeur des cryptos.
6. Prêt sur portefeuille : la garantie s'affiche en 🪙 ; l'appel de marge et la vente forcée suivent les prix en 🪙.
7. Sans taux : supprime (sur ta copie de test seulement) les taux d'une période, avance jusque-là : les ordres sont refusés avec « Taux de change indisponible… », le graphique repasse en dollars (écrit), aucune vente forcée n'a lieu.
8. Rien n'a changé en Bourse ni en Immobilier.

## Crypto : achat refusé avec assez de pièces (correctif)
À dérouler chez toi **sur ta copie de test**, après avoir fusionné cette PR.

1. Compte avec un prêt personnel Immobilier dont une partie n'est pas dépensée (pièces empruntées réservées à l'Immobilier). Page Crypto > Portefeuille : à côté de « Pièces disponibles », une carte **« Utilisables en Crypto »** apparaît avec un montant plus bas.
2. Fiche d'un actif, saisis un achat plus grand que ce montant : sous l'estimation, un message **rouge avant de cliquer** dit « Tu as X, mais Y sont des pièces empruntées réservées à un autre domaine… Tu peux en dépenser Z ici ; il en faut W ».
3. Clique quand même sur Acheter : refus avec le même message, aucune pièce débitée.
4. Un achat plus petit que « Utilisables en Crypto » passe normalement.
5. Compte sans prêt : pas de carte supplémentaire, achat de 150 avec 387 pièces accepté (total ≤ 150).
6. Sous le formulaire d'ordre : **« Tu possèdes X ACTIF »** (0 si aucun), avec « dont Y engagés dans des ordres en attente » si besoin.
7. Achète puis revends tout de suite : tu perds les frais et l'écart, jamais de gain.

## Prêt personnel non affecté (suite de la correction Crypto)
1. Banque, prêt personnel : le texte dit que les pièces rejoignent ton **solde libre** ; plus de mot « fléché Immobilier ». Minimum 500 InvestCoins.
2. Prends un prêt personnel : « Pièces disponibles » augmente du montant, **aucune** carte « Utilisables en Crypto » n'apparaît, et la page Banque ne montre plus de « crédit fléché » pour ce prêt.
3. Achète en Crypto ou en Bourse avec ces pièces : accepté.
4. Achat d'un bien avec un prêt immobilier : ton solde baisse seulement de l'apport et des frais ; aucune pièce n'est ajoutée, et le prêt reste affiché sur le bien.
5. Un prêt sur portefeuille (Bourse ou Crypto) reste, lui, réservé à son domaine.
6. Comptes de test qui ont déjà un prêt personnel : leur réserve existe encore tant que tu n'as pas choisi une des 3 options de `docs/crypto-solde-achat.md`.

## Crypto : quantité d'un achat « pour X pièces »
1. Fiche d'un actif, saisie d'un montant de 100 pièces : l'estimation dit « Tu recevras X BTC », puis « Prix × quantité = …, arrondi à la pièce supérieure : N · frais … (minimum 1 pièce) · total débité … ».
2. Exécute l'ordre : la quantité reçue est **celle annoncée**, et le total débité est celui annoncé (100 au plus).
3. Vérifie à la main : prix d'exécution × quantité ≈ montant avant arrondi ; l'écart avec le montant est inférieur à une pièce.
4. Pour un même budget, la quantité reçue est maintenant ≈ (budget − 1) ÷ prix d'exécution (≈ 0,01545 BTC pour 100 pièces au 1er janvier 2020).

## Affichage en InvestCoins
À dérouler chez toi **avec les PR taux BCE et Crypto en InvestCoins** (déploiement ensemble).

1. Immobilier, liste des annonces : chaque prix est écrit **une seule fois**, avec la pièce (pas de « € », pas de « ≈ »). Même chose sur la fiche, le bloc de financement, « Mes biens », le bilan et la carte (étiquettes sans unité, info-bulle en InvestCoins).
2. Filtres de prix et de loyer : le petit symbole à droite des champs est la pièce.
3. Banque, prêt personnel : la mensualité n'a plus de « (≈ … €) » ; le reste à vivre est en pièces.
4. Bandeau de cours sous la barre du haut : prix en pièces ; survole un prix pour voir le dollar d'origine.
5. Tableau de bord, liste de départ : sur « Terminer une leçon d'éducation », tu lis « checklist : +10 » et, sous la liste, la phrase sur les deux récompenses séparées. Réussis un quiz de chapitre : **+30** arrive tout de suite (bonus première leçon), puis récupère les **+10** de la checklist avec le bouton : ce sont deux versements différents.
6. Écran de téléphone (390 px) : aucune barre de défilement horizontale sur l'Immobilier et la Crypto.

## Banque aux règles françaises
À dérouler chez toi **sur ta copie de test**, après avoir fusionné cette PR (après les PR 5, 6, 7).

1. Immobilier, fiche d'une annonce, simulateur de financement : mets en apport **seulement les frais de notaire**. La banque **refuse** et dit : « Apport insuffisant : … exige au moins … (… de frais de notaire + … soit 10 % du prix). Il te manque … InvestCoins. » Ajoute le montant manquant : le motif disparaît.
2. (Remplacé) Avec l'apport exact mais presque plus de pièces après l'achat : la banque **accepte** et affiche un avertissement, voir la section « Banque : l'épargne restante n'est plus un refus ».
3. Il n'y a plus de message « La banque accepte, avec une réserve » : c'est accepté ou refusé.
4. Avec un profil étudiant et une grosse mensualité : refus « Reste à vivre insuffisant … Mensualité maximale compatible : … ». Réduis le prêt (apport plus grand ou durée plus longue) : accepté.
5. (Remplacé) Banque, prêt personnel : avec très peu de pièces à toi, un avertissement apparaît mais la demande n'est plus refusée pour la réserve.
6. Aucun « € » dans ces messages : tout est en InvestCoins.
7. Si tu veux changer les 10 % ou les 4 mensualités : `backend/src/config/immoRules.ts` (`minDownPaymentPctOfPrice`, `reserveMonthlyPayments`).

## Classement net de revente, seuil et barre de progression
À dérouler chez toi **sur ta copie de test**, après avoir fusionné cette PR (dernière du lot, après la banque).

1. Page Classements (Bourse, Crypto, Immobilier) et onglet Bilan de l'Immobilier : une barre **« … / 2 500 investis »** et une barre **« … / 5 jours actifs »**. Le texte est neutre : pas de date limite, pas de pression.
2. Avec un compte neuf (moins de 5 jours actifs) qui a investi plus de 2 500 : tu n'es **pas classé**, la barre des jours n'est pas pleine. Après avoir joué 5 jours différents : tu apparais au classement.
3. Avec 5 jours actifs mais moins de 2 500 investis : pas classé non plus ; investis davantage, la barre se remplit.
4. Immobilier, Bilan : « valeur nette de revente » est **plus basse** que les fonds propres (frais d'agence, diagnostics, impôt…). Un bien **loué** vaut 10 % de moins en revente qu'un bien vide.
5. Le pourcentage du classement Immobilier est le gain net de revente divisé par **10 000** (compte gratuit) ou **20 000** (compte Pro).
6. Note de sécurité à garder : « jour actif » compte aujourd'hui toute requête connectée ; à resserrer à l'audit (`docs/classement-net-de-revente.md`).

## Réserve de sécurité : pièces propres uniquement (REMPLACÉE : la réserve ne refuse plus, voir « Banque : l'épargne restante n'est plus un refus »)
À dérouler chez toi sur ta copie de test, après les PR 8b (#107) et #109.

1. Compte avec juste assez de pièces pour l'apport et les frais d'un bien, mais pas pour la réserve : la banque refuse (« Réserve de sécurité insuffisante … Il te manque … »).
2. Prends un prêt personnel de 500 : « Pièces disponibles » monte de 500, mais le refus **reste** et le message ajoute que les pièces d'un prêt personnel non remboursé ne comptent pas dans la réserve (avec le capital restant dû). Le montant « à toi » affiché est le même qu'avant le prêt.
3. Rembourse le prêt personnel : le message n'en parle plus et la réserve compte tes vraies pièces.
4. Un achat payé avec l'argent du prêt est refusé de la même façon ; aucune pièce n'est débitée.
5. Prêt personnel avec très peu de pièces à toi : refusé pour réserve (message chiffré), comme avant.

## Script « se donner des InvestCoins » (copie de test seulement)
1. Sur ta copie de test, dossier `backend`, lance à la main : `npm run test:give-coins -- --user TEST --amount 1000`. Tu dois voir la base (finissant par `_test`), le solde avant, `+ 1000 InvestCoins (« don de test »…)` et le solde après.
2. Dans l'application, le solde du compte a bien augmenté ; dans la Banque / l'historique InvestCoins, une ligne « test_gift » apparaît.
3. Nom de compte inconnu : message d'erreur, rien de créé.
4. Avec `DATABASE_URL` qui vise une base dont le nom ne finit pas par `_test` : « Refusé… », rien n'est modifié. (Ne le teste PAS sur le vrai site : fais-le avec une adresse de base inexistante.)

## Tableau de bord : achat Crypto vu partout, deux patrimoines
À dérouler chez toi sur ta copie de test, après avoir fusionné cette PR.

1. Achète un peu de BTC sur le **nouveau marché Crypto** (page Crypto). Retourne au **Tableau de bord** :
   - **Titres** n'est plus à 0 (valeur du BTC) ; **Patrimoine financier** = liquidités + titres − dettes ;
   - la carte **Crypto** n'est plus « pas encore commencé » : positions, valeur actuelle, capital investi, gain ou perte ;
   - **Capital investi** (carte Crypto et « Synthèse Bourse + Crypto ») = ce que tu as payé (prix + frais).
2. La checklist : l'étape **« Faire ton premier achat en Bourse ou en Crypto »** est cochée.
3. Page Classements > Crypto, ou page Crypto > Classement : la barre « **x / 2 500 investis** » compte ton achat ; à 2 500 investis et 5 jours actifs, tu apparais.
4. Le dashboard affiche **deux chiffres** : **Patrimoine total** (grosse carte) et **Patrimoine financier**. Avec un bien immobilier, le total = financier + **valeur nette de revente** du bien (le prêt immobilier est déjà déduit, jamais compté deux fois). Un prêt personnel ne rend plus le patrimoine négatif si l'immobilier est compté.
5. Carte Immobilier : « Valeur nette de revente » et « Dette bancaire » avec la pièce, **aucun €** nulle part sur le tableau de bord.
6. Si tu avais aussi des positions dans l'**ancienne** Crypto, elles s'ajoutent à celles du nouveau marché (rien n'est perdu).


## Banque : l'épargne restante n'est plus un refus, seulement un avertissement
À dérouler chez toi sur ta copie de test, après avoir fusionné cette PR.

1. Fiche d'un bien, financement : avec un apport qui ne te laisse presque aucune pièce après l'achat, la banque **accepte** (si l'apport minimal « notaire + 10 % », l'endettement 35 % et la durée sont respectés), et un message **orange** apparaît dans le cadre de la banque : « Attention : Après cet achat, il te restera X pièces, soit Y mensualités. Moins de 3 mensualités expose à un impayé. Tu peux acheter quand même. »
2. Le bouton d'achat reste actif ; achète : l'achat passe.
3. Avec beaucoup de pièces restantes : aucun message orange.
4. Prends un prêt personnel de 500, puis regarde l'aperçu d'un achat : le message dit que les pièces d'un prêt personnel non remboursé ne comptent pas comme de l'épargne, avec le capital restant dû.
5. Banque, prêt personnel : avec très peu de pièces à toi, un message orange « Après ce prêt, il te restera… » apparaît, mais le bouton « Emprunter » reste actif.
6. Les refus qui restent : apport inférieur à notaire + 10 % du prix ; endettement au-dessus de 35 % ; durée trop longue ; reste à vivre insuffisant. Chacun avec ses chiffres, aucun « € ».
7. Glossaire : le mot « Épargne restante (en mensualités) » existe.

## Finitions de l'économie (dernière PR du lot économie)
1. **Annonces** : ouvre une dizaine d'annonces : plus aucun mot « undefined » dans les descriptions.
2. **Avertissement d'épargne** : il montre son calcul, « soit 1,1 mensualité (X pièces ÷ Z de mensualités par mois, tous tes prêts compris) ».
3. **Seuil du classement** : tableau de bord, cartes Bourse et Crypto : « Actuellement investi » (positions détenues, c'est lui qui compte pour le seuil de 2 500) et « Total acheté (cumul) » (tous les achats). Vends tout : « Actuellement investi » tombe à 0, « Total acheté » ne bouge pas.
4. **Immobilier, Bilan** : sous « Ma performance », déplie « Comment est calculée cette performance ? » : tu vois chaque nombre (valeur nette de revente, loyers, ventes, investi, intérêts, gain) puis le gain ÷ capital de départ.
5. **Fiche d'un bien** : si la banque accepte mais que tu n'as pas assez de pièces, un seul message : « La banque accepte ton dossier, mais il te manque des pièces », avec les chiffres.
6. **Éducation** : quatre parcours : Bourse et PEA, Immobilier, Cryptomonnaies, Crypto : le marché simulé. Plus de cadenas sur les parcours ouverts (même sur un compte Pro). Fais un quiz de chapitre de la Bourse et de l'Immobilier : +20 pièces la première fois.
7. **Onglet du navigateur** : « InvestKit - Simulation d'investissement ».
8. **Bourse** (tableau de bord) : plus de boutons Crypto ni Immobilier en doublon ; solde, valeur des positions et prix avec la pièce.
9. **Démarrage de l'API** : la bannière affiche le vrai nom de la base (par exemple investkit_design_test).
10. **Marché Crypto** : si aucune capitalisation n'est importée, la colonne « Capi. » et le tri par capitalisation disparaissent ; sur la fiche : « non importée ».

## Bourse : nouvelle page /bourse (design refait)
1. Menu « Bourse et PEA » : ouvre la page **/bourse** (plus l'ancien onglet du tableau de bord). Même chose depuis l'accueil du tableau de bord et le classement.
2. En haut : le solde en pièces, la valeur des positions, le gain latent et l'année de jeu. Bouton « Avancer d'un an ».
3. Onglet **Marché** : cherche une action ; clique « Voir le coût » : prix, montant, frais, total, tout en pièces, sans « € ». Confirme : l'achat apparaît dans « Mon portefeuille ».
4. Onglet **Mon portefeuille** : chaque position avec sa valeur et son gain ; « Vendre » montre d'abord le détail, puis confirme.
5. Onglet **Classement** : ta progression vers le seuil (2 500 investis, 5 jours actifs) et le tableau par année.
6. Compte gratuit sans domaine choisi : un bandeau propose de choisir la Bourse ; avec un autre domaine : message « domaine verrouillé ».
7. Sur téléphone (390 px) : pas de défilement horizontal.

## Bourse : ancien onglet du tableau de bord
1. Ouvre `/dashboard?tab=trading` (ou un vieux favori) : tu arrives directement sur **/bourse**.
2. Le tableau de bord (accueil) s'ouvre toujours normalement, sans onglet Bourse.

## Bourse : onglet « Mes ordres »
1. /bourse, onglet **Mes ordres** : vide au début (message d'explication).
2. Achète un titre : une ligne « Achat » (prix, quantité, enveloppe PEA/CTO, montant négatif) et une ligne « Frais de courtage ».
3. Vends-le : « Vente » en positif, « Frais de courtage » et, s'il y a un gain, « Impôt sur la plus-value ».
4. Le total des lignes correspond à la variation de ton solde. Tout est en pièces, sans « € ».


## Note : sources de cours pour la Bourse (docs seulement)
Rien à tester sur le site. Lis `docs/sources-cours-bourse.md` et choisis : A (Bourse officielle), B (API commerciale) ou rester sur des cours fictifs améliorés. Aucun import n'est lancé tant que tu n'as pas décidé.

## Risque et export de compte sur le nouveau marché Crypto
1. Page Crypto, onglet **Mon portefeuille** : après un achat, un encadré « Risque du portefeuille » apparaît (score sur 100, allocation, pire crise). Sans position : message « Aucune position ».
2. Tableau de bord, carte de risque : elle apparaît aussi quand tu n'as que le nouveau marché Crypto.
3. Profil / Mes données, bouton d'export : le fichier contient une section **cryptoMarket** (compte, positions, ordres, exécutions, événements). Aucun mot de passe ni secret.
4. Si le taux de change du jour de jeu manque, la position est ignorée dans le risque (jamais une valeur devinée).
