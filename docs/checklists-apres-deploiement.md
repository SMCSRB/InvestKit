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
1. Compte gratuit neuf : après validation de l'e-mail, solde 500 🪙.
2. Compte gratuit qui passe Pro (paiement test Stripe) : le solde augmente de **500 🪙** (une seule fois). Historique : ligne « pro_starting_bonus ».
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
1. `/dashboard` : menu latéral à gauche, barre du haut avec ton solde d'InvestCoins (réel), ta série de jours, tes notifications.
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
2. **Série de jours** : la pastille « Série de N jours » n'apparaît que si ta série est réelle (> 0). Si ta récompense du jour est disponible, un bouton blanc « Récupérer ma récompense du jour » pulse ; il fait exactement la même chose que le bouton cadeau de la barre du haut (compare ton solde avant/après).
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
