# Mettre InvestKit en ligne — guide pas à pas (débutant complet)

Ce guide met à jour le site déjà installé sur ton serveur (solomili.duckdns.org) avec tout le travail de la
pull request n°3. **Prends ton temps, une étape à la fois, et ne saute jamais l'étape 3 (sauvegarde).**
Compte 30 à 45 minutes. Choisis un moment calme (peu de joueurs connectés).

Dans les commandes, ce qui est entre `<…>` est à remplacer par TES valeurs. Je ne connais ni le nom de ton
dossier ni le nom de ton service sur le serveur : l'étape 1 te fait les retrouver.

---
## Étape 0 — Ouvrir le terminal du serveur
Depuis ton ordinateur : `ssh <ton-utilisateur>@solomili.duckdns.org` (ou ouvre un terminal directement sur le serveur).
Tu sais que c'est bon quand tu vois une invite du type `utilisateur@serveur:~$`.

## Étape 1 — Retrouver le dossier du projet et la façon dont il tourne
```bash
find ~ /srv /opt /var/www -maxdepth 3 -name ".git" -type d 2>/dev/null   # le dossier qui contient .git est le projet
```
Note le dossier (ex. `/home/toi/investkit`) et entre dedans : `cd <dossier-du-projet>`.

Comment l'API et le site sont-ils lancés ? Essaie, dans l'ordre :
```bash
systemctl list-units --type=service | grep -i invest     # service systemd (cas décrit dans docs/DEPLOIEMENT.md)
pm2 list                                                  # si tu utilises pm2
docker ps                                                 # si tu utilises Docker
```
Note les noms trouvés (ex. `investkit-api`, `investkit-web`). Si rien ne s'affiche, dis-le-moi avant d'aller plus loin.

## Étape 2 — Voir ce qui tourne aujourd'hui
```bash
git branch --show-current
git log -1 --format='%h %ad %s'
git status --short          # doit être VIDE. Si des fichiers sont listés, arrête-toi et montre-moi la liste.
ls backend/migrations | tail -3
```

## Étape 3 — SAUVEGARDER LA BASE (obligatoire)
```bash
cd <dossier-du-projet>
set -a; . backend/.env.local; set +a          # charge DATABASE_URL depuis ta configuration
mkdir -p ~/sauvegardes-investkit
BACKUP_DIR=~/sauvegardes-investkit ./ops/backup-db.sh
BACKUP_DIR=~/sauvegardes-investkit ./ops/restore-test.sh
```
Le test de restauration doit se terminer par ✅. **S'il affiche ❌ : n'avance pas.** Copie aussi le fichier
`.dump` sur ton ordinateur (`scp <utilisateur>@solomili.duckdns.org:~/sauvegardes-investkit/*.dump .`), car une
sauvegarde sur le même disque ne protège pas d'une panne du disque.

## Étape 4 — Fusionner la pull request sur GitHub (dans ton navigateur)
1. Ouvre https://github.com/SMCSRB/InvestKit/pull/3
2. Vérifie qu'il est écrit « This branch has no conflicts with the base branch » (vérifié de mon côté : aucun conflit).
3. Clique sur **Merge pull request**, puis **Confirm merge**. Ne clique pas sur « Delete branch » pour l'instant.

## Étape 5 — Récupérer le code sur le serveur
```bash
cd <dossier-du-projet>
git fetch origin
git checkout main
git pull origin main
git log -1 --format='%h %s'          # doit mentionner le merge de la pull request 3
ls backend/migrations | tail -3      # doit finir par 020_real_estate_sales.sql
```

## Étape 6 — Préparer et compiler l'API
```bash
cd <dossier-du-projet>/backend
npm ci
npm run build                         # aucune ligne « error » ne doit apparaître
```
Vérifie ton fichier de configuration (ne le publie jamais) : `grep -c . .env.local` doit afficher un nombre > 5, et
`grep -E '^(JWT_SECRET|DATABASE_URL|CORS_ORIGIN|FRONTEND_URL)=' .env.local | sed 's/=.*/=…/'` doit lister ces 4 lignes.

**Inscription sur invitation :** elle est ACTIVE par défaut. Deux choix :
- Garder l'invitation : crée des codes avant de redémarrer : `npm run invite -- create --uses 1 --note "pour X"`.
- Inscription libre : ajoute la ligne `INVITE_ONLY=false` dans `backend/.env.local`.

## Étape 7 — Redémarrer l'API
```bash
sudo systemctl restart <nom-du-service-api>        # (ou : pm2 restart <nom>)
sleep 5
sudo journalctl -u <nom-du-service-api> -n 40 --no-pager
```
Dans les lignes affichées, tu dois voir « ✅ All migrations completed » et « Server running ». Les migrations
s'appliquent seules et ne suppriment aucune donnée. Une ligne « ⚠️ … Already exists (skipped) » est normale. Une ligne
« ⚠️ Schéma non applicable tel quel… mise à niveau par les migrations » est normale sur une ancienne base.
Une ligne « ❌ Error in … » n'est PAS normale : arrête-toi et envoie-moi les 40 lignes.

Test rapide : `curl -s https://solomili.duckdns.org/api/v1/auth/signup-config` doit répondre quelque chose comme `{"inviteOnly":…}`.

## Étape 8 — Reconstruire et redémarrer le site
```bash
cd <dossier-du-projet>
NEXT_PUBLIC_API_URL=https://solomili.duckdns.org/api/v1 npm ci
NEXT_PUBLIC_API_URL=https://solomili.duckdns.org/api/v1 npm run build
sudo systemctl restart <nom-du-service-site>       # (ou : pm2 restart <nom>)
```
(Si ton API est servie sous une autre adresse, mets celle-là. Elle est fixée au moment de la compilation.)

## Étape 9 — Automatiser les sauvegardes
`crontab -e` puis ajoute les deux lignes de la section 5 de `docs/DEPLOIEMENT.md` (en remplaçant les chemins et `DATABASE_URL`).

## Étape 10 — Vérifier dans le navigateur (mode navigation privée)
| Page | Ce que tu dois voir |
|---|---|
| `/` | L'accueil, pied de page avec Immobilier, Glossaire, Mentions légales, Cookies, Contact, Aide |
| `/login` puis connexion avec ton compte | Le tableau de bord et ton solde 🪙 inchangé |
| `/dashboard` → Simulateur Bourse | Tes positions et ton solde comme avant |
| `/immobilier` | L'écran de choix du profil (étudiant, salarié, cadre) ; les annonces ; l'achat exige d'avoir choisi l'Immobilier comme domaine gratuit ou d'être Pro (le bouton du tableau de bord viendra à l'étape 7b) |
| `/glossaire` | Le glossaire ; tape « cash » dans la recherche |
| `/legal`, `/privacy`, `/conditions`, `/cookies`, `/contact`, `/support` | Des pages qui s'ouvrent ; `/legal` affiche « [à compléter] » tant que `siteInfo.js` est vide |
| `/inscription` avec/sans code | Selon ton choix d'invitation |

## Retour arrière (si quelque chose ne va pas)
```bash
cd <dossier-du-projet>
git checkout <ancien-commit>            # celui noté à l'étape 2
cd backend && npm ci && npm run build && cd ..
sudo systemctl restart <nom-du-service-api>
# reconstruire le site comme à l'étape 8, puis, si la base a un problème :
pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" ~/sauvegardes-investkit/<fichier>.dump
```
Les nouvelles tables sont ajoutées à côté des anciennes ; revenir en arrière n'a besoin de la restauration que si
tu constates un problème de données.

## Ce que fait la mise à jour pour les joueurs
Voir la fin de la section 8 de `docs/DEPLOIEMENT.md` (invitation, domaine gratuit, versements uniques, Immobilier).
