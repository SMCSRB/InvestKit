#!/usr/bin/env bash
# Sauvegarde quotidienne de la base PostgreSQL d'InvestKit.
#   - format « custom » compressé (pg_dump -Fc), lisible par pg_restore
#   - fichier en lecture seule pour son propriétaire (600), empreinte SHA-256 à côté
#   - vérification immédiate que l'archive est lisible (pg_restore --list)
#   - chiffrement optionnel (BACKUP_PASSPHRASE) avec openssl AES-256
#   - rotation : on supprime ce qui a plus de BACKUP_RETENTION_DAYS jours, mais on garde toujours les BACKUP_KEEP_MIN plus récentes
# Variables (toutes facultatives) : DATABASE_URL (sinon lue dans backend/.env.local), BACKUP_DIR (défaut ~/investkit-backups),
#   BACKUP_RETENTION_DAYS (14), BACKUP_KEEP_MIN (3), BACKUP_PASSPHRASE.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ -z "${DATABASE_URL:-}" ] && [ -f "$ROOT/backend/.env.local" ]; then
  DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ROOT/backend/.env.local" | head -1 | cut -d= -f2-)"
fi
: "${DATABASE_URL:?DATABASE_URL introuvable (définis-la ou renseigne backend/.env.local)}"

BACKUP_DIR="${BACKUP_DIR:-$HOME/investkit-backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
KEEP_MIN="${BACKUP_KEEP_MIN:-3}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
umask 077

OUT="$BACKUP_DIR/investkit-$STAMP.dump"
echo "→ Sauvegarde vers $OUT"
pg_dump --format=custom --no-owner --no-privileges --file="$OUT" "$DATABASE_URL"

# Vérification : l'archive doit être lisible et contenir des tables.
TABLES="$(pg_restore --list "$OUT" | grep -c ' TABLE ' || true)"
if [ "$TABLES" -lt 1 ]; then echo "✗ Archive invalide (aucune table)"; rm -f "$OUT"; exit 1; fi
echo "✓ Archive lisible ($TABLES tables)"

if [ -n "${BACKUP_PASSPHRASE:-}" ]; then
  openssl enc -aes-256-cbc -pbkdf2 -salt -pass env:BACKUP_PASSPHRASE -in "$OUT" -out "$OUT.enc"
  rm -f "$OUT"
  OUT="$OUT.enc"
  echo "✓ Chiffrée (AES-256) : $OUT   (déchiffrer : openssl enc -d -aes-256-cbc -pbkdf2 -pass env:BACKUP_PASSPHRASE -in fichier.enc -out fichier.dump)"
fi

( cd "$BACKUP_DIR" && sha256sum "$(basename "$OUT")" > "$(basename "$OUT").sha256" )
chmod 600 "$OUT" "$OUT.sha256"

# Rotation : plus vieux que N jours, en gardant toujours les KEEP_MIN plus récentes.
mapfile -t ALL < <(ls -1t "$BACKUP_DIR"/investkit-*.dump "$BACKUP_DIR"/investkit-*.dump.enc 2>/dev/null || true)
if [ "${#ALL[@]}" -gt "$KEEP_MIN" ]; then
  for f in "${ALL[@]:$KEEP_MIN}"; do
    if [ -n "$(find "$f" -mtime +"$RETENTION_DAYS" -print 2>/dev/null)" ]; then rm -f "$f" "$f.sha256"; echo "  supprimée (ancienne) : $(basename "$f")"; fi
  done
fi
echo "✓ Terminé : $(basename "$OUT") ($(du -h "$OUT" | cut -f1))"
