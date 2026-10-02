# Tester la refonte du design chez toi (sans toucher à la version en ligne)

Objectif : voir **toutes les pages** de la branche `release/design-complet` avant de fusionner. Tout se passe **sur ton ordinateur**, dans un dossier séparé, avec une base de données séparée. Le site en ligne n'est jamais touché.

> Règle d'or : ne mets **jamais** l'adresse de ta vraie base de production dans ces commandes. Utilise une base vide créée pour l'occasion.

## 1. Préparer (une seule fois)

Il te faut Node 20, Git et PostgreSQL installés sur ton ordinateur.

```bash
# 1. Un dossier séparé (ne touche pas à ton dossier habituel)
git clone https://github.com/SMCSRB/InvestKit.git InvestKit-test
cd InvestKit-test
git checkout release/design-complet

# 2. Une base de test vide (nom différent de ta vraie base)
createdb investkit_test_design

# 3. Les dépendances
npm install
cd backend && npm install && cd ..
```

## 2. Réglages de test

Copie le modèle puis remplis-le (ce fichier reste **hors git**, ne le partage pas) :

```bash
cp .env.dev.example .env.dev    # présent si la PR « anti-secrets » (#77) est fusionnée ; sinon voir ci-dessous
```

Valeurs utiles pour un test local (invente des valeurs de test, jamais celles de production) :

- `DATABASE_URL=postgresql://TON_UTILISATEUR@localhost:5432/investkit_test_design`
- `JWT_SECRET` : une longue phrase au hasard (32 caractères ou plus)
- `FIELD_ENCRYPTION_KEY` : `openssl rand -hex 32`
- `CORS_ORIGIN=http://localhost:3100` et `FRONTEND_URL=http://localhost:3100`
- `INVITE_ONLY=false` (pour pouvoir t'inscrire sans code, sur ta machine seulement)
- `EMAIL_PROVIDER=console` (les e-mails s'affichent dans le terminal au lieu d'être envoyés)

## 3. Lancer

Un seul terminal suffit.

On utilise le script `ops/stack.sh` : il lance l'API et le site à l'arrière-plan (journaux dans des fichiers), et **l'arrête par port** (fiable, sans fichier .pid à gérer). Dans le **même terminal**, depuis le dossier du projet de test :

```bash
cd InvestKit-test
# Réglages de CE test (ports différents de ta vraie installation, journaux à part)
export API_PORT=5001 SITE_PORT=3001 LOG_DIR=$HOME/test-design RUN_DIR=$HOME/test-design/run
mkdir -p "$LOG_DIR"
# L'API lit ces variables (valeurs de TEST, voir l'étape 2) : DATABASE_URL, JWT_SECRET, FIELD_ENCRYPTION_KEY, CORS_ORIGIN, FRONTEND_URL, EMAIL_PROVIDER…
export API_START="npm run dev"
# Le site : l'adresse de l'API est figée au moment de la compilation
NEXT_PUBLIC_API_URL=http://localhost:5001/api/v1 npm run build
export SITE_ENV="NODE_ENV=production"
./ops/stack.sh start
./ops/stack.sh status
```

Tu dois voir `✓ API : démarré sur le port 5001` puis `✓ Site : démarré sur le port 3001`. Ouvre <http://localhost:3001>. Un souci ? Les journaux : `tail -n 40 $LOG_DIR/investkit-api.log` et `tail -n 40 $LOG_DIR/investkit-site.log`.

**Arrêter le test** (avec les mêmes `export` dans le terminal) :

```bash
./ops/stack.sh stop
./ops/stack.sh status        # doit afficher « ✗ API : arrêté » et « ✗ Site : arrêté »
```

Si tu as fermé le terminal et perdu les `export`, refais-les puis `./ops/stack.sh stop` : l'arrêt retrouve les processus par leur port.

## 4. Le voir depuis ton téléphone ou le montrer à quelqu'un (facultatif)

Sur le même Wi-Fi : remplace `localhost` par l'adresse de ton ordinateur (ex. `192.168.1.20`) dans `NEXT_PUBLIC_API_URL`, `CORS_ORIGIN` et `FRONTEND_URL`, puis recompile le site et relance (`./ops/stack.sh restart`). Pour un lien public temporaire, un service de tunnel existe, mais **ne l'utilise pas avec de vraies données** ; demande-moi d'abord.

## 5. Revenir à la normale

Supprime simplement le dossier `InvestKit-test` et la base : `dropdb investkit_test_design`. Rien d'autre n'a changé.

## 6. Checklist visuelle page par page

Pour chaque page, regarde en **clair et en sombre** (réglage Apparence dans `/profile`), sur **ordinateur et téléphone** (largeur 390 px : pas de défilement horizontal). Chaque bouton doit faire quelque chose de visible.

| Page | À vérifier |
|---|---|
| `/` Accueil | Titre, offres Gratuit / Pro (aucune promesse « projets illimités », « alertes » ou « export PDF complet »), boutons d'inscription |
| `/signup` | 3 étapes avec vraie progression ; barre de force du mot de passe ; aucun message « e-mail disponible » ; code d'invitation vérifié |
| `/login` | Fond animé, connexion, message neutre si mauvais identifiants |
| `/forgot-password`, `/reset-password` | Message identique que l'e-mail existe ou non |
| `/verify-email` | 6 cases, collage du code possible |
| Page d'erreur / `/page-inconnue` | Page 404 lisible, bouton de retour |
| `/dashboard` | Cartes, graphiques, onglets de réglages (plus d'onglet « Alertes ») |
| `/immobilier` | Recherche, filtres, liste / grille / carte, tri, favoris ♥, recherche sauvegardée, fiche d'un bien, simulation de financement, onglets Chercher / Mes biens / Bilan / Classement, mode Simple / Avancé, bandeau « annonces fictives » |
| `/crypto` | Graphique, ordres, portefeuille |
| `/banque` | Prêts, échéances |
| `/education` | Parcours, chapitres, quiz, glossaire, icônes d'aide |
| `/simulateurs` | Calculs, bouton Imprimer / PDF |
| `/friends`, `/guild` | Listes lisibles |
| `/profile` | Réglages Apparence (thème, animations) |
| `/profile` → « Modifier le profil » | Photo de profil : choisir (JPG/PNG/WebP), changer, retirer ; elle s'affiche aussi dans le menu du haut. Elle reste sur ton navigateur |
| `/classements` | Trois onglets : **Monde** (Bourse, Crypto, Immobilier ; message clair si tu n'as pas commencé le domaine), **Amis** (toi + tes amis par XP), **Guilde** (membres par XP) |
| `/education` et un chapitre | L'académie s'ouvre ; ordre des réponses mélangé à chaque tentative ; correction par le serveur (voir `docs/quiz-serveur.md`, section « À tester chez toi ») |
| Tableau de bord, retour depuis Amis | Aucun badge « débloqué » qui réapparaît à chaque retour (une seule annonce par badge) |
| `/admin` | Accessible seulement avec un compte admin |
| `/privacy`, `/conditions`, `/cookies`, `/legal` | Texte lisible ; « [à compléter] » tant que `siteInfo.js` n'est pas rempli |

Avec « animations réduites » activé dans ton système, le fond animé doit s'arrêter.

## 7. Si quelque chose cloche

Note la page, ce que tu as fait et ce que tu as vu (une capture d'écran aide), puis envoie-le moi. Ne fusionne rien tant que tu n'es pas satisfait.
