#!/usr/bin/env bash
# Test de restauration : restaure la dernière sauvegarde dans une base
# TEMPORAIRE et compare les nombres de lignes avec la base réelle.
# Ne touche JAMAIS à la base réelle (lecture seule côté source).
#
#   DATABASE_URL   base réelle (pour comparer)            (obligatoire)
#   ADMIN_URL      connexion pouvant créer une base       (défaut : DATABASE_URL avec la base "postgres")
#   BACKUP_DIR     dossier des sauvegardes                (défaut : ./backups)
#   BACKUP_FILE    sauvegarde précise à tester            (défaut : la plus récente)
#
# Usage : DATABASE_URL=... ./ops/restore-test.sh
set -euo pipefail

: "${DATABASE_URL:?Définis DATABASE_URL}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
FILE="${BACKUP_FILE:-$(ls -1t "$BACKUP_DIR"/investkit_*.dump 2>/dev/null | head -n1)}"
[ -n "$FILE" ] && [ -f "$FILE" ] || { echo "❌ Aucune sauvegarde trouvée dans $BACKUP_DIR"; exit 1; }

ADMIN_URL="${ADMIN_URL:-${DATABASE_URL%/*}/postgres}"
TEST_DB="investkit_restore_test_$$"
TEST_URL="${DATABASE_URL%/*}/$TEST_DB"

cleanup() { psql "$ADMIN_URL" -q -c "DROP DATABASE IF EXISTS $TEST_DB" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "🔁 Restauration de $FILE dans la base temporaire $TEST_DB..."
psql "$ADMIN_URL" -q -c "CREATE DATABASE $TEST_DB"
pg_restore --no-owner --no-privileges --dbname="$TEST_URL" "$FILE"

count() { psql "$1" -At -c "SELECT count(*) FROM $2"; }
FAIL=0
for t in users investcoins_balance investcoins_transactions virtual_portfolios leaderboard_rankings; do
  live="$(count "$DATABASE_URL" "$t")"
  rest="$(count "$TEST_URL" "$t")"
  if [ "$rest" -le "$live" ] && [ "$rest" -gt 0 -o "$live" -eq 0 ]; then
    echo "  ✅ $t : sauvegarde=$rest lignes (base réelle=$live)"
  else
    echo "  ❌ $t : sauvegarde=$rest lignes, base réelle=$live"; FAIL=1
  fi
done

# Cohérence économique : le solde de chaque joueur = somme de son ledger
# (à l'exception des soldes initiaux, aucune ligne n'écrit hors ledger).
bad="$(psql "$TEST_URL" -At -c "SELECT count(*) FROM investcoins_balance b WHERE b.balance <> COALESCE((SELECT SUM(amount) FROM investcoins_transactions t WHERE t.user_id=b.user_id),0)")"
echo "  ℹ️  soldes différents du total de leur ledger : $bad"

[ "$FAIL" -eq 0 ] && echo "✅ Test de restauration RÉUSSI" || { echo "❌ Test de restauration ÉCHOUÉ"; exit 1; }
