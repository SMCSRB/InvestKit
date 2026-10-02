# Mettre à jour InvestKit avec TOUT `main` — guide pas à pas (débutant complet)

Ce guide met à jour le site déjà installé sur ton serveur (solomili.duckdns.org) avec **tout ce qui est dans la branche `main`** (Immobilier complet, Banque, fiscalité Bourse/Crypto, capital de départ Pro, sessions par cookie et protection CSRF, sécurité renforcée, administration, analyse de risque, notifications, tableau de bord réel, domaine Crypto…). Il **ne contient pas** la refonte du design (13 PR en brouillon, à part : voir `docs/TEST-DESIGN.md`, livré avec la PR « design consolidée »).

**Règles d'or** : une étape à la fois ; ne saute jamais l'étape 3 (sauvegarde) ; au moindre message d'erreur inattendu, **arrête-toi** et copie-colle-le moi avant d'aller plus loin. Compte 45 à 60 minutes, à un moment calme.

Dans les commandes, ce qui est entre `<…>` est à remplacer par TES valeurs. Je ne connais ni le nom de ton dossier ni le nom de tes services : l'étape 1 te fait les retrouver.

> **Si le correctif de la faille de l'éducation n'est pas encore en ligne, déploie-le d'abord** (PR « fix(education) », `docs/faille-education.md`) : c'est le plus urgent.

---
## Étape 0 — Ouvrir le terminal du serveur
Depuis ton ordinateur : `ssh <ton-utilisateur>@solomili.duckdns.org` (ou un terminal directement sur le serveur). C'est bon quand tu vois une invite du type `utilisateur@serveur:~$`.

## Étape 1 — Retrouver le dossier du projet et la façon dont il tourne
```bash
find ~ /srv /opt /var/www -maxdepth 3 -name ".git" -type d 2>/dev/null   # le dossier qui contient .git est le projet
```
Note le dossier (ex. `/home/toi/investkit`) et entres-y : `cd <dossier-du-projet>`.

Comment l'API et le site sont-ils lancés ? Essaie, dans l'ordre :
```bash
systemctl list-units --type=service | grep -i invest     # service systemd (cas décrit dans docs/DEPLOIEMENT.md)
pm2 list                                                  # si tu utilises pm2
docker ps                                                 # si tu utilises Docker
```
Note les noms trouvés (ex. `investkit-api`, `investkit-web`). Si rien ne s'affiche, dis-le-moi avant d'aller plus loin.

## Étape 2 — VÉRIFIER LA VERSION QUI TOURNE SUR TON SERVEUR (nouveau)
Tu ne sais pas ce qui est en ligne : cette étape te le dit, sans rien modifier. **Note les réponses sur une feuille** : elles servent aussi au retour arrière.
```bash
cd <dossier-du-projet>
git branch --show-current                       # la branche en place (idéalement : main)
git log -1 --format='%h %ad %s'                 # le dernier commit en place : NOTE-LE (retour arrière)
git status --short                              # doit être VIDE. Sinon : arrête-toi et montre-moi la liste.
git fetch origin && git rev-list --count HEAD..origin/main    # nombre de commits de retard sur main (0 = déjà à jour)
ls backend/migrations | tail -3                 # la dernière migration présente sur le disque
```
**Lis le résultat avec ce tableau** (dernière migration présente → ce que ton serveur contient) :

| Dernière migration vue | Ton serveur est… |
|---|---|
| `0xx` inférieure à `015` | Très ancien (avant l'Immobilier) : fais ce guide en entier |
| `015` à `020` | Immobilier de base (étapes 5 à 7a) |
| `021` | + assurance loyers impayés et trêve hivernale |
| `022` à `024` | + Banque (prêt personnel, prêt sur portefeuille, défaut) |
| `025` à `032` | + sécurité (journal d'audit, verrouillage de compte), administration, notifications, capital Pro, fiscalité |
| `033` à `036` | + domaine Crypto : **c'est `main` complet** (rien de plus à faire, sauf si `git rev-list` > 0) |

Compare aussi **ce qui tourne vraiment** (le code sur le disque peut être plus récent que le programme lancé) :
```bash
curl -s https://solomili.duckdns.org/health                                  # {"status":"ok",…} = l'API répond
curl -s https://solomili.duckdns.org/api/v1/auth/signup-config               # {"inviteOnly":…}
curl -s -o /dev/null -w '%{http_code}\n' https://solomili.duckdns.org/api/v1/crypto/assets     # 401 = le domaine Crypto est en ligne ; 404 = pas encore
curl -s -o /dev/null -w '%{http_code}\n' https://solomili.duckdns.org/api/v1/bank/overview      # 401 = la Banque est en ligne ; 404 = pas encore
```
(`401` veut dire « il faut être connecté » : c'est bon signe, la route existe.)

**Décision** : si `git rev-list --count HEAD..origin/main` affiche `0` ET que les deux adresses répondent `401` : ton serveur est déjà à jour, **tu n'as rien à déployer** (saute à l'étape 8 pour tout vérifier). Sinon, continue.

## Étape 3 — SAUVEGARDER LA BASE, puis TESTER la restauration (obligatoire)
```bash
cd <dossier-du-projet>
set -a; . backend/.env.local; set +a          # charge DATABASE_URL depuis ta configuration (ne l'affiche jamais)
mkdir -p ~/sauvegardes-investkit
BACKUP_DIR=~/sauvegardes-investkit ./ops/backup.sh
BACKUP_DIR=~/sauvegardes-investkit ./ops/restore-test.sh
```
Le test de restauration doit finir par **« TEST DE RESTAURATION RÉUSSI »**. **S'il affiche ❌ : n'avance pas** (souvent : l'utilisateur PostgreSQL n'a pas le droit de créer une base temporaire ; voir `docs/sauvegardes.md`). Copie aussi le fichier `.dump` sur ton ordinateur (`scp <utilisateur>@solomili.duckdns.org:~/sauvegardes-investkit/*.dump .`) : une sauvegarde sur le même disque ne protège pas d'une panne du disque.

## Étape 4 — Ce que la mise à jour va changer (lis-le avant de continuer)
**Migrations de base de données** (elles s'appliquent toutes seules au redémarrage de l'API ; aucune ne supprime de données — vérifié : aucun `DROP`, `TRUNCATE` ni `DELETE` dans les migrations 021 à 036) :

| N° | Ce qu'elle ajoute |
|---|---|
| 021 | assurance loyers impayés et trêve hivernale |
| 022 – 024 | Banque : registre des dettes, classement avec levier, rétablissement après défaut |
| 025 | journal d'audit « en ajout seul » (plus aucune suppression ni modification possible) |
| 026 | état fiscal de la Bourse/Crypto |
| 027 | capital de départ Pro (versé une seule fois) |
| 028 | verrouillage temporaire des comptes après trop d'échecs de connexion |
| 029 | état d'un compte (suspendu) pour l'administration |
| 030 | retours des utilisateurs et annonces |
| 031 | notifications |
| 032 | récompenses de la checklist d'accueil |
| 033 – 036 | domaine Crypto : données de marché, comptes, ordres, échanges et événements |

**Ce que les joueurs voient** : inscription sur invitation ; domaine gratuit au choix (un changement possible) ; connexion par **cookie sécurisé** (les anciennes sessions sont migrées toutes seules, personne n'est déconnecté) ; 2FA demandée à la connexion si activée ; frais et impôts en Bourse/Crypto (les pièces payées en frais et impôts sont détruites) ; Banque ; Crypto avec **données fictives** tant que tu n'as pas lancé `npm run crypto:import` ; capital Pro versé une fois aux comptes Pro.

## Étape 5 — Vérifier la configuration (variables d'environnement)
Ouvre `backend/.env.local` (**ne le publie jamais**, `docs/secrets.md`). Vérifie la présence — sans afficher les valeurs :
```bash
cd <dossier-du-projet>/backend
for v in JWT_SECRET FIELD_ENCRYPTION_KEY DATABASE_URL CORS_ORIGIN FRONTEND_URL HCAPTCHA_SECRET_KEY EMAIL_PROVIDER; do
  grep -q "^$v=." .env.local && echo "✔ $v" || echo "✘ $v MANQUE"; done
```
| Variable | Rôle | Si elle manque |
|---|---|---|
| `JWT_SECRET` | signe les sessions (≥ 32 caractères) | **l'API refuse de démarrer en production** |
| `FIELD_ENCRYPTION_KEY` | chiffre les secrets 2FA (`openssl rand -hex 32`, 64 caractères) | avertissement ; la clé est dérivée de `JWT_SECRET`. **Ne la change jamais après coup** (les 2FA déjà chiffrées deviendraient illisibles) |
| `DATABASE_URL` | accès à PostgreSQL | l'API ne démarre pas |
| `CORS_ORIGIN` | adresse EXACTE du site (ex. `https://solomili.duckdns.org`) | avertissement ; les cookies de session échouent |
| `FRONTEND_URL` | adresse du site (liens des e-mails) | liens d'e-mail faux |
| `HCAPTCHA_SECRET_KEY` | contrôle anti-robot de l'inscription | **l'inscription échoue** (« Captcha invalide ») |
| `EMAIL_PROVIDER` + `SMTP_*` ou `RESEND_API_KEY` | envoi des e-mails (code de vérification, mot de passe oublié) | `ethereal` = faux envoi : personne ne reçoit rien |
| `INVITE_ONLY` | `false` = inscription libre (sinon sur invitation, par défaut) | — |
| `COOKIE_SECURE` | `false` seulement si tu testes en HTTP ; en production HTTPS, laisse vide | cookie non enregistré en HTTP |
| `COOKIE_DOMAIN` | seulement si site et API sont sur deux sous-domaines | — |
| `TRUST_PROXY` | nombre de proxys devant l'API (1 par défaut en production : nginx/Caddy) | limites de requêtes par IP faussées |
| `SESSION_TOKEN_IN_BODY` | passe à `false` quelques jours APRÈS la mise en ligne | — |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_MONTHLY/YEARLY` | paiement Pro (aujourd'hui en mode test) | l'abonnement répond « paiement non configuré » (503) |
| `REAL_ESTATE_SOURCE` | `fictive` (défaut) | — |
| `DOCS_ENABLED` | `true` pour voir la documentation de l'API en production (laisse vide) | — |
| `EXPOSE_RESET_TOKEN_FOR_TESTS` | **ne jamais définir en production** (réservé aux tests) | — |

Côté **site** : `NEXT_PUBLIC_API_URL` (adresse publique de l'API, **fixée à la compilation**) et `NEXT_PUBLIC_HCAPTCHA_SITEKEY` (clé publique hCaptcha, fixée aussi à la compilation).

**Inscription sur invitation** : elle est ACTIVE par défaut. Crée des codes avant de redémarrer : `cd backend && npm run invite -- create --uses 1 --note "pour X"`.

## Étape 6 — Récupérer le code et compiler
```bash
cd <dossier-du-projet>
git fetch origin
git checkout main
git pull origin main
git log -1 --format='%h %s'                    # doit mentionner un « Merge pull request » récent
ls backend/migrations | tail -2                # doit finir par 036_crypto_swaps_events.sql
cd backend && npm ci && npm run build          # aucune ligne « error » ne doit apparaître
```

## Étape 7 — Redémarrer l'API, puis le site
```bash
sudo systemctl restart <nom-du-service-api>        # (ou : pm2 restart <nom>)
sleep 5
sudo journalctl -u <nom-du-service-api> -n 60 --no-pager
```
Tu dois voir **« ✅ All migrations completed »** et le cadre de démarrage. Une ligne « Already exists (skipped) » est normale. Une ligne **« ❌ Error in … » n'est PAS normale : arrête-toi et envoie-moi les 60 lignes.**

Puis le site :
```bash
cd <dossier-du-projet>
NEXT_PUBLIC_API_URL=https://solomili.duckdns.org/api/v1 NEXT_PUBLIC_HCAPTCHA_SITEKEY=<ta-clé-publique> npm ci
NEXT_PUBLIC_API_URL=https://solomili.duckdns.org/api/v1 NEXT_PUBLIC_HCAPTCHA_SITEKEY=<ta-clé-publique> npm run build
sudo systemctl restart <nom-du-service-site>       # (ou : pm2 restart <nom>)
```

### Si tu n'as ni systemd ni pm2 (API lancée par `backend/start-dev.sh`) : le script `ops/stack.sh`
Il démarre, arrête et surveille l'API (port 5000) et le site (port 3000). **L'arrêt se fait par port** : le script retrouve le vrai processus qui écoute. (L'ancienne méthode, qui arrêtait « le numéro écrit dans un fichier .pid », ne marchait pas : ce fichier contenait le lanceur, pas le processus qui écoute.)
```bash
cd <dossier-du-projet>
./ops/stack.sh status            # qui tourne ? (✓ en marche / ✗ arrêté, avec le numéro de processus)
./ops/stack.sh restart api       # arrête puis relance l'API ; les journaux sont dans ~/investkit-api.log
./ops/stack.sh restart site      # idem pour le site (après « npm run build »)
./ops/stack.sh stop              # arrête les deux ; « start » les relance
```
Tu dois voir `✓ API : démarré sur le port 5000`. Si le démarrage échoue, le script affiche les 15 dernières lignes du journal. Tes secrets restent dans `backend/start-dev.sh` ou `backend/.env.local` : le script n'en contient aucun. Ports ou dossiers différents : voir l'en-tête du script (`API_PORT`, `SITE_PORT`, `API_START`, `LOG_DIR`…).

## Étape 8 — Vérifications après (en navigation privée)
| Où | Ce que tu dois voir |
|---|---|
| `curl -s https://solomili.duckdns.org/health` | `{"status":"ok",…}` |
| `/` | L'accueil |
| `/login`, connexion avec ton compte | Le tableau de bord, ton solde 🪙 inchangé. Dans le navigateur (F12 → Application → Cookies) : `ik_session` est **HttpOnly** et `Secure` |
| Compte avec 2FA | Après le mot de passe : demande du code à 6 chiffres |
| `/signup` (avec un code d'invitation) | Inscription jusqu'à l'e-mail de vérification (**vérifie que l'e-mail arrive vraiment**) |
| `/dashboard` → Bourse | Tes positions et ton solde comme avant ; frais et impôt visibles à l'achat/vente |
| `/immobilier`, `/banque`, `/crypto` | Les pages s'ouvrent ; Crypto affiche « données illustratives » |
| `/glossaire`, `/legal`, `/privacy`, `/conditions`, `/cookies`, `/contact` | S'ouvrent ; `/legal` affiche « [à compléter] » tant que `app/lib/siteInfo.js` est vide |
| `/admin` (compte admin avec 2FA) | Les statistiques s'affichent. Pour nommer un admin : `cd backend && npm run set-admin -- <email> on` (le compte doit avoir activé la 2FA) |
| Journal : `sudo journalctl -u <service-api> -n 100` | Pas d'« ❌ » ; pas de « 500 » répétés |

## Étape 9 — Automatiser les sauvegardes
`crontab -e`, puis les deux lignes de `docs/sauvegardes.md` (sauvegarde chaque nuit, test de restauration chaque dimanche). Vérifie le fichier `restore-test.log` de temps en temps : la dernière ligne doit dire « TEST DE RESTAURATION RÉUSSI ».

## Quelques jours plus tard
- Mets `SESSION_TOKEN_IN_BODY=false` dans `backend/.env.local` et redémarre l'API (quand tout le monde a rechargé le site).
- Pour de vrais cours Crypto : `cd backend && npm run crypto:import` (voir `docs/crypto-donnees.md`).

## RETOUR ARRIÈRE (si quelque chose ne va pas)
Utilise le commit noté à l'étape 2.
```bash
cd <dossier-du-projet>
git checkout <ancien-commit>
cd backend && npm ci && npm run build && cd ..
sudo systemctl restart <nom-du-service-api>        # sans systemd : ./ops/stack.sh restart api
# reconstruire le site comme à l'étape 7, puis le redémarrer (sans systemd : ./ops/stack.sh restart site)
```
Les nouvelles tables sont ajoutées **à côté** des anciennes : l'ancien code fonctionne avec la base mise à jour (les anciennes sessions par jeton continuent de marcher). **Restaure la base seulement si tu constates un problème de données** :
```bash
sudo systemctl stop <nom-du-service-api>           # sans systemd : ./ops/stack.sh stop api
pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" ~/sauvegardes-investkit/<fichier>.dump
sudo systemctl start <nom-du-service-api>          # sans systemd : ./ops/stack.sh start api
```
(Les sauvegardes chiffrées se déchiffrent d'abord : `docs/sauvegardes.md`.) Une restauration te fait perdre ce qui s'est passé APRÈS la sauvegarde.

## Avant l'ouverture au public (pas avant)
Lance `npm run check:site-info` à la racine : il liste ce qui reste provisoire (e-mail « example.com », hébergeur vide). Fais valider les pages légales par un professionnel, vérifie les taux et seuils fiscaux (`docs/PARAMETRES-A-RECONFIRMER.md`), et fournis les clés Stripe.
