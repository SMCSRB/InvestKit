# Parcours navigateur (Playwright)

Des tests automatiques ouvrent un vrai navigateur (Chromium), se connectent et parcourent l'application. Ils tournent **en local et dans la CI GitHub**, jamais sur le vrai site.

## Ce qui est vérifié
- **À 390 px de large (téléphone)** : connexion réelle, puis tableau de bord, Immobilier (de l'écran de départ aux annonces), Bourse, Crypto, Banque, Éducation, Glossaire, Classements ; pages publiques Connexion et Inscription. **Aucune page ne doit défiler horizontalement** ni afficher « undefined », « NaN » ou « [object Object] ». Un test vérifie que le contrôle lui-même détecte bien un débordement (pour qu'il ne soit jamais « vide »).
- **Sur ordinateur (1280 px)** : titre d'onglet « InvestKit - Simulation d'investissement » ; Bourse (aperçu du coût avec prix, frais, total, sans « € ») et onglet Mes ordres ; Crypto, Banque et Immobilier s'ouvrent sans valeur cassée ; les six premières annonces ouvertes n'affichent jamais « undefined » ; l'ancien lien `/dashboard?tab=trading` arrive sur `/bourse`.

## Comment ça marche
- `e2e/playwright.config.ts` lance **l'API (port 5100) et le site (port 3100)** : ce ne sont jamais les ports d'un vrai site (3000 et 5000).
- Le script `backend/scripts/e2e-seed.ts` prépare la base : migrations, jeu Crypto **fictif**, taux de change plats, un compte Pro de test. **Il refuse de tourner si le nom de la base ne finit pas par `_test`** (même règle que `test:give-coins`), et il n'affiche jamais l'adresse de connexion.
- **Aucun secret dans le dépôt** : le mot de passe du compte de test, `JWT_SECRET` et `FIELD_ENCRYPTION_KEY` sont tirés au hasard à chaque exécution.
- Une seule connexion par exécution pour la plupart des parcours (la session est réutilisée) et une connexion réelle à 390 px : l'API limite les tentatives de connexion (5 par 15 minutes).
- L'inscription n'est pas testée de bout en bout : elle demande un code d'invitation et le captcha ; on vérifie seulement que la page s'affiche bien sur téléphone.

## Pourquoi deux exécutions
L'API limite les requêtes (300 par 15 minutes et par adresse). Tous les parcours d'un seul coup dépasseraient cette limite et afficheraient « Trop de requêtes ». `npm run e2e` lance donc **deux exécutions à la suite** (téléphone 390 px, puis ordinateur) : chacune démarre une API neuve, dont le compteur repart de zéro. La limite de l'API n'est jamais modifiée pour les tests.

## Lancer en local
```
npm install
npx playwright install chromium            # une fois
cd backend && npm install && npm run build && cd ..
NEXT_PUBLIC_API_URL=http://localhost:5100/api/v1 npm run build
E2E_DATABASE_URL=postgresql://UTILISATEUR:MOT_DE_PASSE@localhost:5432/ma_base_test npm run e2e
```
La base visée doit exister et se terminer par `_test`. En cas d'échec, le rapport est dans `e2e/rapport` et `e2e/resultats` (captures, traces).

## Dans la CI
Le job `e2e` de `.github/workflows/ci.yml` utilise PostgreSQL 16 (base `investkit_test`), construit l'API et le site, installe Chromium et lance `npm run e2e`. En cas d'échec, le rapport est joint à l'exécution (7 jours).

## Limites
Rendu et mise en page seulement : pas de test d'inscription complète, de paiement ou de double authentification. Les règles de jeu (argent, dates) restent testées par `backend/tests` (Vitest).
