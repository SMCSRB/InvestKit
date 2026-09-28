# Déploiement d'InvestKit (serveur personnel, phase de test)

Objectif : pouvoir déplacer le site vers un autre serveur (ex. OVH) en
quelques dizaines de minutes. **Aucun nom de serveur, chemin ou mot de passe
n'est écrit dans le code** : tout passe par des variables d'environnement.

## 1. Prérequis sur le serveur
- Node.js 20+, PostgreSQL 14+ (16 testé), `git`, `rsync` (pour les copies de sauvegarde)
- Un reverse proxy HTTPS (nginx ou Caddy) devant le site (HTTPS obligatoire)

## 2. Installation
```bash
git clone <adresse-du-dépôt> investkit && cd investkit
git checkout <branche-à-déployer>

# Base de données (le mot de passe est fourni, jamais écrit en dur)
INVESTKIT_DB_PASSWORD='un-mot-de-passe-long' ./database/setup.sh

# Backend
cd backend && npm ci
cp .env.example .env.local        # puis REMPLIR toutes les valeurs (voir le fichier)
npm run build
# Le schéma et les migrations s'appliquent tout seuls au démarrage (idempotents)
node dist/index.js                # ou via le service ci-dessous

# Frontend  (NEXT_PUBLIC_API_URL est intégrée AU BUILD : reconstruire si elle change)
cd ..
NEXT_PUBLIC_API_URL=https://ton-domaine/api/v1 npm ci && npm run build
npm start
```

## 3. Variables d'environnement
Liste complète et commentée : `backend/.env.example` (API) et `.env.example` (site).
Points d'attention en production :
| Variable | Rôle |
|---|---|
| `JWT_SECRET` | Obligatoire. `openssl rand -hex 32`. Changer ce secret déconnecte tout le monde. |
| `DATABASE_URL` | Connexion PostgreSQL. |
| `CORS_ORIGIN` | Adresse publique du site. Non défini = toutes les origines acceptées (un avertissement s'affiche au démarrage). |
| `FRONTEND_URL` | Adresse publique (liens des emails, retours Stripe). |
| `NEXT_PUBLIC_API_URL` | Adresse publique de l'API, fixée au build du site. |

## 4. Lancement en service (exemple systemd)
`/etc/systemd/system/investkit-api.service`
```ini
[Service]
WorkingDirectory=/chemin/vers/investkit/backend
EnvironmentFile=/chemin/vers/investkit/backend/.env.local
ExecStart=/usr/bin/node dist/index.js
Restart=always
User=investkit
[Install]
WantedBy=multi-user.target
```
(Idem pour le site avec `npm start`.) Adapter les chemins à ton serveur ; ils ne
sont dans aucun fichier du projet.

## 5. Sauvegardes automatiques
Scripts : `ops/backup-db.sh` (sauvegarde + vérification + rotation) et
`ops/restore-test.sh` (restaure dans une base temporaire et compare).

Planification (cron, chaque nuit à 3h, restauration testée chaque dimanche) :
```cron
0 3 * * *  cd /chemin/vers/investkit && DATABASE_URL='postgresql://…' BACKUP_DIR=/var/backups/investkit ./ops/backup-db.sh >> /var/log/investkit-backup.log 2>&1
30 3 * * 0 cd /chemin/vers/investkit && DATABASE_URL='postgresql://…' BACKUP_DIR=/var/backups/investkit ./ops/restore-test.sh >> /var/log/investkit-backup.log 2>&1
```
- Conservation : 14 jours (`BACKUP_KEEP_DAYS`), les 3 plus récentes sont toujours gardées.
- **Une sauvegarde sur le même disque ne protège pas d'une panne du disque ou du
  serveur.** Renseigne `BACKUP_SYNC_TARGET=utilisateur@autre-machine:/dossier/`
  pour une copie ailleurs (autre ordinateur, NAS, stockage distant).
- Vérifie de temps en temps le fichier de log : un test de restauration en échec
  se voit par la ligne « ❌ ».

Restauration réelle après incident :
```bash
createdb investkit_neuve
pg_restore --no-owner --no-privileges --dbname=postgresql://…/investkit_neuve /var/backups/investkit/investkit_AAAAMMJJ….dump
# puis pointer DATABASE_URL vers la nouvelle base et redémarrer l'API
```

## 6. Migrer vers un autre serveur
1. `./ops/backup-db.sh` sur l'ancien serveur, copier le `.dump` sur le nouveau.
2. Sur le nouveau : sections 1 à 4, puis `pg_restore` (ci-dessus) dans la base créée.
3. Recopier `backend/.env.local` (en gardant le même `JWT_SECRET` pour ne pas déconnecter les joueurs), adapter `CORS_ORIGIN`, `FRONTEND_URL`, `NEXT_PUBLIC_API_URL` au nouveau domaine, reconstruire le site.
4. Basculer le DNS quand tout répond.

## 7. Domaine dynamique (DuckDNS) : limites
Un serveur à domicile a une IP qui peut changer, une connexion qui peut tomber
et une adresse exposée : garder le système à jour, ne mettre en ligne que le
reverse proxy HTTPS (pas PostgreSQL), et ne pas ouvrir d'autres ports.
