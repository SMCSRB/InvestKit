# InvestKit

Plateforme web francophone de **simulation d'investissement et d'éducation gamifiée** (Bourse/PEA, Immobilier, Crypto, Banque/prêts, classements, parcours de cours et quiz). Tout se joue en **InvestCoins (🪙)**, une monnaie de jeu. Phase actuelle : test fermé, sur invitation.

Ce fichier ne contient que des faits vérifiés dans le dépôt. En cas de doute, lire le code ou `docs/` ; ne rien inventer, et signaler à l'utilisateur ce qui manque.

## Règles de travail (décisions du propriétaire : à respecter toujours)

1. **Rien n'est fusionné ni déployé sans l'accord explicite du propriétaire.** On pousse sur la branche de travail ; on ne fusionne pas, on ne déploie pas, on n'écrit pas sur `main`.
2. **Petites PR**, chacune avec sa **checklist de test en langage simple** ajoutée à `docs/checklists-apres-deploiement.md` (une section par PR, à dérouler chez lui après déploiement). Chaque PR indique l'ordre de fusion et « Create a merge commit ».
3. **Valeurs non sourcées** (taux, frais, seuils, bonus, paramètres d'équilibrage du jeu) : les marquer dans le code et la doc par la mention exacte `VALEUR DE JEU, NON SOURCÉE, À RECONFIRMER`, les isoler dans `backend/src/config/*Rules.ts` / `game.ts`, ne jamais les présenter comme des faits. Les paramètres fiscaux réels (taux, seuils comme les 305 € de la crypto) restent à vérifier sur les sources officielles avant l'ouverture au public.
4. **Pages légales** (mentions, confidentialité, conditions, cookies) : les textes sont **à faire valider** par un professionnel. `app/lib/siteInfo.js` est l'unique endroit des informations publiques ; tant qu'une valeur est `null`, l'interface affiche « [à compléter] ». `npm run check:site-info` rappelle ce qui reste provisoire (e-mail de contact, hébergeur).
5. **Inscription sur invitation** : `INVITE_ONLY` est actif par défaut (`backend/src/config/env.ts`) ; l'ouvrir à tous est un choix produit du propriétaire. Codes : `cd backend && npm run invite -- create --uses N --days D --note "..."` (aussi `list`, `revoke CODE`).
6. **Aucun secret dans le dépôt ni dans les outils** : pas de mot de passe, clé d'API, jeton, contenu de `.env` ou de script de démarrage (ex. `start-dev.sh`, non suivi par git) dans un commit, une PR, une capture partagée ou un outil MCP. Ne jamais donner de secret de production aux outils.
7. **Refonte du design en cours** : suivre les captures et les décisions de design du propriétaire. Aucune décision de design n'est encore consignée dans le dépôt ; quand il en donne une, l'ajouter à la section « Design » ci-dessous.

## Décisions produit déjà prises

**InvestCoins** (`docs/banque.md`, `backend/src/repositories/investcoinsRepository.ts`)
- Uniquement pour le jeu : **pas de boutique, pas de retrait, pas d'achat avec de l'argent réel, pas d'échange ni de transfert entre joueurs.**
- Toute écriture du registre (ledger) porte un **domaine** et une **nature** ; les pièces créées/détruites sont comptées par domaine (statistiques d'administration, alerte de dérive du registre).
- Capital de départ 500 🪙 (Pro : environ le double, une seule fois par compte) : valeur de jeu non sourcée (`backend/src/config/game.ts`).

**Crédit fléché par domaine** : les pièces empruntées non dépensées ne se dépensent que dans le domaine du prêt ; un débit qui entamerait les pièces réservées à un autre domaine est refusé.

**Horloge par domaine** : chaque domaine a sa propre date de jeu (Immobilier : année de jeu du portefeuille ; Crypto : date simulée côté serveur dans `crypto_accounts`). Pas d'horloge unique (envisagée « plus tard »). Les prêts suivent l'horloge de leur domaine. Le serveur décide de tout : jamais de prix, de date ou de montant fourni par le client ; aucune donnée postérieure à la date simulée du joueur n'est renvoyée.

**Domaines** : Bourse, Crypto (`crypto_market`, coexiste avec l'ancien domaine `crypto`), Immobilier. Un compte gratuit choisit **un** domaine gratuit (changement possible une seule fois) ; le plan Pro les ouvre tous.

**Crypto** (`docs/crypto-*.md`) : ordres marché/limite/stop/take-profit évalués côté serveur sur les bougies ; liquidité par paliers (frais, écart, glissement) ; échanges crypto-crypto sans impôt ; impôt français appliqué seulement à la sortie vers l'euro ; prêt sur portefeuille avec appel de marge et liquidation ; événements historiques et aléatoires reproductibles ; aucun cours réel importé tant que `npm run crypto:import` n'a pas été lancé (jeu de données fictif et marqué comme tel).

**Éducation** : parcours par domaine (`data/education*.js`), quiz, glossaire (`app/lib/glossaire.js`) relié aux chapitres, icônes d'aide `HelpTip`. Les textes en français doivent rester pédagogiques.

## Architecture

```
app/            Frontend Next.js 15 (App Router), pages en .jsx : dashboard, immobilier, crypto, banque,
                education, simulateurs, glossaire, admin, pages légales, login/signup…
  components/   composants partagés (PageWrapper, HelpTip, Toast, OptimizedHeader…)
  context/      contextes React (utilisateur, progression éducation)
  lib/          session.js, glossaire.js, siteInfo.js…
data/           contenu pédagogique (cours, quiz)
lib/            auth.ts (client d'authentification)
server.js       serveur de dev/prod du frontend (écoute 3000 ; le port de `next dev -p` n'est pas pris en compte)
backend/        API Express + TypeScript (npm séparé)
  src/routes, controllers, services, repositories, engine (moteurs purs : bank, crypto, immo, risk, trading),
  config (règles et paramètres de jeu *Rules.ts, env.ts), data, middleware (auth, admin, rateLimiter), utils
  migrations/   NNN_nom.sql numérotées, rejouées au démarrage de l'API
  scripts/      invite, set-admin, set-pro, crypto-import, coins-stats…
  tests/        Vitest (43 fichiers)
docs/           une fiche par fonctionnalité + guides de déploiement et d'exploitation
ops/            sauvegardes, restauration testée, test de charge
discord-bot/    bot Discord de la communauté (indépendant)
.github/        workflows ci.yml (tests + build) et security.yml (CodeQL, recherche de secrets)
```

- Frontend en JavaScript/JSX (`jsconfig.json`) ; backend en TypeScript. API sous `/api/v1` (documentée dans `backend/src/openapi.ts`). Frontend → API via `NEXT_PUBLIC_API_URL` (défaut `http://localhost:5000/api/v1`).
- **Session** : jeton dans un cookie httpOnly posé par le serveur + en-tête anti-CSRF ; `localStorage.token` n'est qu'un marqueur « connecté ». Champs sensibles chiffrés (AES-256-GCM, `FIELD_ENCRYPTION_KEY`).
- Base : PostgreSQL. Quantités fractionnaires en `NUMERIC(28,8)`, jamais en flottant. Pas de clés étrangères circulaires. Migrations : ne jamais modifier une migration déjà fusionnée, en ajouter une nouvelle.
- Limites de requêtes (`backend/src/middleware/rateLimiter.ts`) : 300 requêtes/15 min par IP pour l'API, 5 tentatives/15 min pour les routes d'authentification, etc. À garder en tête pour les tests automatisés.

## Commandes

Racine (frontend) :
- `npm install` · `npm run dev` (port 3000) · `npm run build` · `npm run lint` · `npm run type-check` · `npm run check:site-info`
- Variable utile : `NEXT_PUBLIC_API_URL=http://<hôte>:<port API>/api/v1`

Backend (`cd backend`) :
- `npm install` · `npm run dev` (ts-node) · `npm run build` (tsc) · `npx tsc --noEmit` · `npm run lint`
- `npm test` = `vitest run`. **Les tests qui utilisent la base sont ignorés sans `TEST_DATABASE_URL`** (environ la moitié des 547 tests) : pour valider un changement, lancer avec une base PostgreSQL de test, ex. `TEST_DATABASE_URL=postgresql://investkit_test:test@localhost:5432/investkit_test npm test`. Ne pas annoncer « tous les tests passent » sans cela.
- Variables d'API : `PORT`, `NODE_ENV`, `DATABASE_URL`, `JWT_SECRET`, `FIELD_ENCRYPTION_KEY`, `CORS_ORIGIN` (doit contenir l'adresse réelle du frontend), `FRONTEND_URL`, `EMAIL_PROVIDER`, `EMAIL_FROM` (voir `backend/.env.example`).
- CI (`.github/workflows/ci.yml`) : Node 20, PostgreSQL 16, `npm ci`, `npx tsc --noEmit`, `npx vitest run`, `npm run build` du frontend, `npm audit --omit=dev --audit-level=high`.

Déploiement, sauvegardes, plan d'incident : `docs/DEPLOIEMENT.md`, `docs/DEPLOIEMENT-DEBUTANT.md`, `docs/sauvegardes.md`, `docs/plan-incident.md`.

## Conventions

- **Langue** : interface, textes, commentaires métier, docs et messages de commit en **français**, ton simple et pédagogique (le propriétaire débute ; expliquer les notions financières).
- **Commits** : format conventionnel (`feat:`, `fix:`, `docs:`, `chore:`, `test:`) avec portée, ex. `feat(crypto): …`. Branches `feat/…`, `fix/…`.
- **Nommage** : camelCase en JS/TS, snake_case en SQL.
- **Sécurité** : valider toutes les entrées côté serveur (le client n'est jamais digne de confiance) ; requêtes SQL paramétrées ; pas de HTML injecté depuis des textes de contenu (rendu en texte) ; audit des opérations sensibles (`auditService`).
- **Tests** : tout comportement d'argent, de date ou de règle de jeu est testé ; les moteurs dans `backend/src/engine` restent purs (pas de réseau, pas d'horloge système) pour être testables.
- **UI** : chaque bouton doit avoir un effet visible ; les termes techniques reçoivent une icône d'aide (`HelpTip`) reliée au glossaire ; vérifier le rendu mobile (390 px) sans défilement horizontal.

## Design (refonte en cours)

À compléter avec les décisions et captures du propriétaire. Aide disponible : skill `ui-ux-pro-max` (`.claude/skills/`). Constats d'audit et choix validés à consigner ici au fur et à mesure.

## Outils (MCP) du projet

Déclarés dans `.mcp.json` (portée projet, versions fixées, jamais `@latest`) : Context7 (documentation à jour), Playwright (parcours et captures dans un navigateur, limité à localhost), shadcn (catalogue de composants), Chrome DevTools (performance, Lighthouse, fluidité des animations ; statistiques d'usage et envoi à CrUX désactivés). L'outil Playwright `browser_run_code_unsafe` est bloqué dans `.claude/settings.json`. Les serveurs `filesystem` et Figma ne sont volontairement **pas** activés. Aucun secret de production ne doit leur être fourni.
