# Sauvegardes et restauration

Deux scripts dans `ops/` (bash, aucun outil à installer en plus de PostgreSQL) :

| Script | Rôle |
|---|---|
| `ops/backup.sh` | sauvegarde la base (format compressé `pg_dump -Fc`), vérifie que l'archive est lisible, écrit son empreinte SHA-256, chiffre si `BACKUP_PASSPHRASE` est défini, supprime les sauvegardes de plus de 14 jours (en gardant toujours les 3 dernières) |
| `ops/restore-test.sh` | **restaure la dernière sauvegarde dans une base temporaire**, vérifie l'empreinte, le nombre d'utilisateurs et d'écritures, la cohérence soldes/registre, puis supprime la base temporaire. Ne touche jamais à la base de production. |

Les dossiers et fichiers de sauvegarde sont créés en accès réservé au propriétaire (700/600).

## Mise en place (une fois)
1. Teste à la main : `./ops/backup.sh` puis `./ops/restore-test.sh`. Le second doit finir par « TEST DE RESTAURATION RÉUSSI ».
   - Le test de restauration crée une base temporaire : l'utilisateur PostgreSQL du site doit avoir le droit `CREATEDB` (`sudo -u postgres psql -c "ALTER ROLE investkit CREATEDB;"`), ou fournis `RESTORE_ADMIN_URL` d'un autre utilisateur.
2. Planifie avec `crontab -e` (sauvegarde chaque nuit à 3 h 15, test de restauration chaque dimanche à 4 h) :
   ```
   15 3 * * *  cd /chemin/vers/InvestKit && ./ops/backup.sh >> ~/investkit-backups/backup.log 2>&1
   0 4 * * 0   cd /chemin/vers/InvestKit && ./ops/restore-test.sh >> ~/investkit-backups/restore-test.log 2>&1
   ```
3. **Copie hors du serveur** (sinon une panne du disque emporte tout) : par exemple `rsync -a ~/investkit-backups/ utilisateur@autre-machine:investkit-backups/` ou un stockage cloud chiffré. Définis `BACKUP_PASSPHRASE` si la copie quitte ta maison, et garde la phrase dans un gestionnaire de mots de passe (sans elle, la sauvegarde chiffrée est illisible).
4. Regarde de temps en temps le fichier `restore-test.log` : la dernière ligne doit dire « TEST DE RESTAURATION RÉUSSI ».

## Restaurer pour de vrai (panne ou incident)
1. Arrête l'API. 2. (Chiffrée ? `openssl enc -d -aes-256-cbc -pbkdf2 -pass env:BACKUP_PASSPHRASE -in fichier.dump.enc -out fichier.dump`.)
3. `dropdb investkit && createdb investkit` (ou restaure dans une base neuve et change `DATABASE_URL`). 4. `pg_restore --no-owner --dbname="$DATABASE_URL" fichier.dump`. 5. Redémarre l'API (les migrations sont rejouées, idempotentes). 6. Vérifie le site et le registre (`docs/plan-incident.md`).

Perte maximale acceptée : 24 h (une sauvegarde par nuit). Pour moins, lancer `backup.sh` plus souvent.
