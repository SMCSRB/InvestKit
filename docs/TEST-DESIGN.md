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

Deux terminaux.

**Terminal 1 : l'API** (port 5000)

```bash
cd InvestKit-test/backend
PORT=5000 npm run dev
```

**Terminal 2 : le site** (port 3100, pour ne pas gêner un autre site sur 3000)

```bash
cd InvestKit-test
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1 PORT=3100 npm run dev
```

Ouvre <http://localhost:3100>. Pour arrêter : `Ctrl + C` dans chaque terminal.

## 4. Le voir depuis ton téléphone ou le montrer à quelqu'un (facultatif)

Sur le même Wi-Fi : remplace `localhost` par l'adresse de ton ordinateur (ex. `192.168.1.20`) dans `NEXT_PUBLIC_API_URL`, `CORS_ORIGIN` et `FRONTEND_URL`. Pour un lien public temporaire, un service de tunnel existe, mais **ne l'utilise pas avec de vraies données** ; demande-moi d'abord.

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
