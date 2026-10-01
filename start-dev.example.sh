#!/usr/bin/env bash
# Lance le site en développement (API + site). COPIE ce fichier en « start-dev.sh » (il est ignoré par git) :
#     cp start-dev.example.sh start-dev.sh && chmod +x start-dev.sh
# Les SECRETS ne sont JAMAIS écrits ici : ils sont lus dans le fichier « .env.dev » (aussi ignoré par git, voir docs/secrets.md).
set -euo pipefail
cd "$(dirname "$0")"

ENV_FILE="${INVESTKIT_ENV_FILE:-.env.dev}"
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Fichier $ENV_FILE introuvable. Crée-le à partir de .env.dev.example (voir docs/secrets.md) : cp .env.dev.example .env.dev" >&2
  exit 1
fi
chmod 600 "$ENV_FILE" 2>/dev/null || true
set -a          # exporte tout ce que le fichier définit
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

# Variables obligatoires : on s'arrête avec un message clair plutôt que de démarrer à moitié (sans afficher leurs valeurs).
missing=()
for v in DATABASE_URL JWT_SECRET FIELD_ENCRYPTION_KEY; do
  [ -n "${!v:-}" ] || missing+=("$v")
done
if [ "${EMAIL_PROVIDER:-ethereal}" = "smtp" ]; then
  for v in SMTP_HOST SMTP_USER SMTP_PASS; do [ -n "${!v:-}" ] || missing+=("$v"); done
fi
if [ "${#missing[@]}" -gt 0 ]; then
  echo "❌ Variables manquantes dans $ENV_FILE : ${missing[*]}" >&2
  exit 1
fi

echo "▶ API (port ${PORT:-5000})…"
( cd backend && npm run dev ) &
API_PID=$!
trap 'kill "$API_PID" 2>/dev/null || true' EXIT
echo "▶ Site (port 3000)…"
npm run dev
