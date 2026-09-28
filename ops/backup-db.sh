#!/usr/bin/env bash
# Sauvegarde de la base PostgreSQL (format compressé pg_dump) avec rotation.
#
# Configuration par variables d'environnement (aucune valeur en dur) :
#   DATABASE_URL       (obligatoire) ex: postgresql://investkit:mdp@localhost:5432/investkit
#   BACKUP_DIR         dossier des sauvegardes            (défaut : ./backups)
#   BACKUP_KEEP_DAYS   durée de conservation en jours      (défaut : 14)
#   BACKUP_SYNC_TARGET (optionnel) copie hors serveur via rsync, ex: user@autre-machine:/sauvegardes/
#
# Usage : DATABASE_URL=... ./ops/backup-db.sh
set -euo pipefail

: "${DATABASE_URL:?Définis DATABASE_URL}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FINAL="$BACKUP_DIR/investkit_${STAMP}.dump"
TMP="$FINAL.partial"

# Écrit dans un fichier temporaire : une sauvegarde interrompue ne peut jamais
# être prise pour une sauvegarde valide.
pg_dump --format=custom --no-owner --no-privileges --file="$TMP" "$DATABASE_URL"

# Vérifie que l'archive est lisible avant de la garder.
pg_restore --list "$TMP" > /dev/null
mv "$TMP" "$FINAL"
chmod 600 "$FINAL"
echo "✅ Sauvegarde créée : $FINAL ($(du -h "$FINAL" | cut -f1))"

# Rotation : supprime les sauvegardes plus anciennes que KEEP_DAYS,
# mais garde toujours les 3 plus récentes.
ls -1t "$BACKUP_DIR"/investkit_*.dump | tail -n +4 | while read -r f; do
  if [ -n "$(find "$f" -mtime +"$KEEP_DAYS" -print)" ]; then
    rm -f "$f"
    echo "🗑️  Ancienne sauvegarde supprimée : $f"
  fi
done

if [ -n "${BACKUP_SYNC_TARGET:-}" ]; then
  rsync -a "$FINAL" "$BACKUP_SYNC_TARGET"
  echo "📤 Copie hors serveur : $BACKUP_SYNC_TARGET"
fi
