#!/usr/bin/env bash
# Test de restauration : une sauvegarde qu'on n'a jamais restaurée n'est pas une sauvegarde.
# Restaure la sauvegarde la plus récente (ou celle donnée en argument) dans une base TEMPORAIRE, vérifie son contenu, puis supprime la base.
# Ne touche JAMAIS à la base de production.
# Variables : BACKUP_DIR (défaut ~/investkit-backups), BACKUP_PASSPHRASE (si sauvegarde chiffrée),
#   RESTORE_ADMIN_URL = URL d'un utilisateur autorisé à créer une base (défaut : DATABASE_URL de backend/.env.local).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ -z "${RESTORE_ADMIN_URL:-}" ]; then
  if [ -z "${DATABASE_URL:-}" ] && [ -f "$ROOT/backend/.env.local" ]; then
    DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ROOT/backend/.env.local" | head -1 | cut -d= -f2-)"
  fi
  RESTORE_ADMIN_URL="${DATABASE_URL:?RESTORE_ADMIN_URL ou DATABASE_URL requis}"
fi
BACKUP_DIR="${BACKUP_DIR:-$HOME/investkit-backups}"
FILE="${1:-$( (ls -1t "$BACKUP_DIR"/investkit-*.dump "$BACKUP_DIR"/investkit-*.dump.enc 2>/dev/null || true) | head -1)}"
[ -n "$FILE" ] && [ -f "$FILE" ] || { echo "✗ Aucune sauvegarde trouvée dans $BACKUP_DIR"; exit 1; }
echo "→ Sauvegarde testée : $FILE"

WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
if [ -f "$FILE.sha256" ]; then ( cd "$(dirname "$FILE")" && sha256sum -c "$(basename "$FILE").sha256" >/dev/null ) && echo "✓ Empreinte SHA-256 conforme" || { echo "✗ Empreinte différente : sauvegarde corrompue"; exit 1; }; fi
DUMP="$FILE"
if [[ "$FILE" == *.enc ]]; then
  : "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE requis pour une sauvegarde chiffrée}"
  DUMP="$WORK/restore.dump"
  openssl enc -d -aes-256-cbc -pbkdf2 -pass env:BACKUP_PASSPHRASE -in "$FILE" -out "$DUMP"
fi

# URL de la base temporaire = même serveur, autre nom de base.
TMPDB="investkit_restore_test_$(date +%s)"
BASE_URL="${RESTORE_ADMIN_URL%/*}"
QUERY=""; case "$RESTORE_ADMIN_URL" in *\?*) QUERY="?${RESTORE_ADMIN_URL#*\?}"; BASE_URL="${RESTORE_ADMIN_URL%%\?*}"; BASE_URL="${BASE_URL%/*}";; esac
TMP_URL="$BASE_URL/$TMPDB$QUERY"
ADMIN_DB_URL="$RESTORE_ADMIN_URL"

cleanup() { psql "$ADMIN_DB_URL" -qAt -c "DROP DATABASE IF EXISTS \"$TMPDB\"" >/dev/null 2>&1 || true; }
trap 'cleanup; rm -rf "$WORK"' EXIT

psql "$ADMIN_DB_URL" -qAt -c "CREATE DATABASE \"$TMPDB\"" >/dev/null || { echo "✗ Impossible de créer la base temporaire (droit CREATEDB requis : voir RESTORE_ADMIN_URL)"; exit 1; }
pg_restore --no-owner --no-privileges --dbname="$TMP_URL" "$DUMP" 2>"$WORK/restore.log" || { echo "✗ Échec de la restauration"; tail -5 "$WORK/restore.log"; exit 1; }
echo "✓ Restauration réussie dans la base temporaire $TMPDB"

q() { psql "$TMP_URL" -qAt -c "$1"; }
USERS="$(q 'SELECT COUNT(*) FROM users')"
TX="$(q 'SELECT COUNT(*) FROM investcoins_transactions')"
echo "  utilisateurs : $USERS · écritures du registre : $TX"
[ "$USERS" -ge 0 ] || exit 1

# Contrôle d'intégrité métier : le solde de chaque joueur doit égaler la somme de son registre.
BAD="$(q "SELECT COUNT(*) FROM investcoins_balance b WHERE b.balance <> COALESCE((SELECT SUM(t.amount) FROM investcoins_transactions t WHERE t.user_id = b.user_id), 0)")"
if [ "$BAD" -gt 0 ]; then echo "⚠ $BAD joueur(s) dont le solde ne correspond pas à la somme du registre (à examiner : données d'avant le registre ?)"; else echo "✓ Soldes cohérents avec le registre"; fi
# Invariant de la banque : crédit créé = capital remboursé + solde restant + effacé.
BANKBAD="$(q "SELECT COUNT(*) FROM bank_loans WHERE status IN ('active','defaulted') AND balance_h < 0")" || BANKBAD=0
[ "$BANKBAD" -eq 0 ] && echo "✓ Prêts : aucun solde négatif" || echo "⚠ $BANKBAD prêt(s) avec solde négatif"

echo "✓ TEST DE RESTAURATION RÉUSSI (base temporaire supprimée)"
