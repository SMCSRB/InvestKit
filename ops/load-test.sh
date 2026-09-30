#!/usr/bin/env bash
# Test de charge : combien de requêtes par seconde ton serveur tient-il ? (Phase 9 de la feuille de route)
# Usage : ./ops/load-test.sh [http://localhost:5000] [durée en secondes] [connexions simultanées]
# ⚠️ À lancer sur un serveur de TEST (ou en dehors des heures d'usage) : il sollicite fortement l'API. Les limiteurs de débit (429) sont
# volontairement actifs : les pages protégées par limite d'IP montrent donc surtout que la protection fonctionne.
set -euo pipefail
BASE="${1:-http://localhost:5000}"; DURATION="${2:-15}"; CONN="${3:-50}"
cd "$(dirname "${BASH_SOURCE[0]}")/../backend"
run() { echo; echo "── $1"; npx autocannon --no-progress -d "$DURATION" -c "$CONN" "${@:2}" 2>&1 | grep -E "Latency|Req/Sec|requests in|2xx|non 2xx|errors|timeouts" ; }
run "GET /health (juste le serveur)" "$BASE/health"
run "GET /api/v1/openapi.json (JSON moyen)" "$BASE/api/v1/openapi.json"
run "POST /api/v1/tools/monte-carlo (calcul, limité à 40 requêtes / 15 min / IP : attendu : beaucoup de 429)" -m POST -H 'content-type: application/json' -b '{"initial":5000,"monthly":150,"years":12,"annualReturnPct":6.5,"annualVolPct":14,"paths":1000}' "$BASE/api/v1/tools/monte-carlo"
echo; echo "Lecture : « Req/Sec » moyen = requêtes par seconde tenues ; « Latency » = temps de réponse (ms) ; « non 2xx » = refus (429 = limite de débit, normal)."
