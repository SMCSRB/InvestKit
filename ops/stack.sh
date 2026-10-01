#!/usr/bin/env bash
# Démarre, arrête et surveille l'API et le site SANS systemd ni pm2. L'arrêt se fait PAR PORT : on retrouve le vrai processus qui écoute,
# même si le fichier .pid ne contient que le lanceur (c'était le défaut de « kill -- -$(cat fichier.pid) »).
#
#   ./ops/stack.sh status            état de l'API et du site
#   ./ops/stack.sh start   [api|site|all]
#   ./ops/stack.sh stop    [api|site|all]
#   ./ops/stack.sh restart [api|site|all]
#
# Réglages (variables d'environnement, tous facultatifs) :
#   API_PORT (5000)   SITE_PORT (3000)   LOG_DIR (~)   WAIT_SECONDS (90)
#   API_DIR  (<projet>/backend)   API_START  (« ./start-dev.sh » s'il existe, sinon « npm run dev »)
#   SITE_DIR (<projet>)           SITE_START (« node server.js »)   SITE_ENV (« NODE_ENV=production »)
# Exemple pour un deuxième site de test à côté :  SITE_PORT=3001 API_PORT=5001 LOG_DIR=~/test ./ops/stack.sh start
# Aucun secret ici : l'API lit ses réglages dans son propre script ou dans backend/.env.local.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_PORT="${API_PORT:-5000}"; SITE_PORT="${SITE_PORT:-3000}"
LOG_DIR="${LOG_DIR:-$HOME}"; WAIT_SECONDS="${WAIT_SECONDS:-90}"
API_DIR="${API_DIR:-$ROOT/backend}"; SITE_DIR="${SITE_DIR:-$ROOT}"
if [ -z "${API_START:-}" ]; then if [ -x "$API_DIR/start-dev.sh" ]; then API_START="./start-dev.sh"; else API_START="npm run dev"; fi; fi
SITE_START="${SITE_START:-node server.js}"; SITE_ENV="${SITE_ENV:-NODE_ENV=production}"
RUN_DIR="${RUN_DIR:-$HOME/.investkit-run}"; mkdir -p "$RUN_DIR" "$LOG_DIR"

# PID des processus qui ÉCOUTENT sur un port (lsof, sinon ss, sinon fuser).
pids_on_port() {
  local port="$1" out=""
  if command -v lsof >/dev/null 2>&1; then out="$(lsof -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null)"; fi
  if [ -z "$out" ] && command -v ss >/dev/null 2>&1; then out="$(ss -ltnpH "sport = :$port" 2>/dev/null | grep -o 'pid=[0-9]*' | cut -d= -f2)"; fi
  if [ -z "$out" ] && command -v fuser >/dev/null 2>&1; then out="$(fuser -n tcp "$port" 2>/dev/null | tr -s ' ' '\n' | grep -E '^[0-9]+$')"; fi
  printf '%s\n' "$out" | grep -E '^[0-9]+$' | sort -un
}
port_busy() { [ -n "$(pids_on_port "$1")" ]; }
alive() { kill -0 "$1" 2>/dev/null; }

name_of() { case "$1" in api) echo "API";; site) echo "Site";; esac; }
port_of() { case "$1" in api) echo "$API_PORT";; site) echo "$SITE_PORT";; esac; }
log_of()  { echo "$LOG_DIR/investkit-$1.log"; }
pidfile() { echo "$RUN_DIR/$1-$(port_of "$1").pid"; }

do_status() {
  local svc="$1" port pids url code
  port="$(port_of "$svc")"; pids="$(pids_on_port "$port" | tr '\n' ' ')"
  if [ -z "$pids" ]; then echo "✗ $(name_of "$svc") : arrêté (rien n'écoute sur le port $port)"; return 1; fi
  url="http://127.0.0.1:$port/"; [ "$svc" = api ] && url="http://127.0.0.1:$port/health"
  code="$(curl -s -o /dev/null -m 4 -w '%{http_code}' "$url" 2>/dev/null || true)"
  echo "✓ $(name_of "$svc") : en marche sur le port $port (processus $pids) · réponse HTTP ${code:-aucune}"
}

do_stop() {
  local svc="$1" port pids p i
  port="$(port_of "$svc")"; pids="$(pids_on_port "$port")"
  if [ -z "$pids" ]; then echo "• $(name_of "$svc") : déjà arrêté (port $port libre)"; rm -f "$(pidfile "$svc")"; return 0; fi
  # Les processus qui écoutent + leur groupe de lancement (npm, ts-node…) reçoivent un arrêt poli (TERM).
  for p in $pids; do kill -TERM "$p" 2>/dev/null; done
  if [ -s "$(pidfile "$svc")" ]; then local lead; lead="$(cat "$(pidfile "$svc")")"; [[ "$lead" =~ ^[0-9]+$ ]] && kill -TERM -- "-$lead" 2>/dev/null; fi
  for i in $(seq 1 20); do port_busy "$port" || break; sleep 0.5; done
  if port_busy "$port"; then            # toujours là après 10 s : arrêt forcé
    for p in $(pids_on_port "$port"); do kill -KILL "$p" 2>/dev/null; done; sleep 1
  fi
  if port_busy "$port"; then echo "✗ $(name_of "$svc") : impossible de libérer le port $port (processus $(pids_on_port "$port" | tr '\n' ' ')). Essaie : sudo kill -9 <numéro>"; return 1; fi
  rm -f "$(pidfile "$svc")"; echo "✓ $(name_of "$svc") : arrêté (port $port libre)"
}

do_start() {
  local svc="$1" port dir cmd env log i
  port="$(port_of "$svc")"; log="$(log_of "$svc")"
  if port_busy "$port"; then echo "• $(name_of "$svc") : déjà en marche sur le port $port (utilise « restart » pour le relancer)"; return 0; fi
  if [ "$svc" = api ]; then dir="$API_DIR"; cmd="$API_START"; env="PORT=$port"; else dir="$SITE_DIR"; cmd="$SITE_START"; env="PORT=$port $SITE_ENV"; fi
  [ -d "$dir" ] || { echo "✗ $(name_of "$svc") : dossier introuvable : $dir"; return 1; }
  # setsid : le service vit dans sa propre session (il survit à la fermeture du terminal) ; « exec » : le PID écrit est celui du VRAI programme lancé.
  # Les redirections sont posées sur tout le bloc : aucun descripteur du terminal ne reste ouvert dans le service (sinon un appelant qui attend la fin de ce script resterait bloqué).
  ( cd "$dir" && exec setsid bash -c 'echo $$ > "$1"; shift; cd "$1"; shift; export $1; shift; exec bash -c "$*"' _ "$(pidfile "$svc")" "$dir" "$env" "$cmd" ) >> "$log" 2>&1 < /dev/null &
  for i in $(seq 1 "$WAIT_SECONDS"); do port_busy "$port" && break; sleep 1; done
  if port_busy "$port"; then echo "✓ $(name_of "$svc") : démarré sur le port $port (journal : $log)"; return 0; fi
  echo "✗ $(name_of "$svc") : rien n'écoute sur le port $port après ${WAIT_SECONDS} s. Dernières lignes du journal ($log) :"; tail -n 15 "$log" 2>/dev/null; return 1
}

action="${1:-status}"; target="${2:-all}"
case "$target" in api) list="api";; site) list="site";; all) list="api site";; *) echo "Usage : $0 status|start|stop|restart [api|site|all]"; exit 2;; esac
rc=0
case "$action" in
  status)  for s in $list; do do_status "$s" || rc=1; done;;
  start)   for s in $list; do do_start "$s" || rc=1; done;;
  stop)    for s in $list; do do_stop "$s" || rc=1; done;;
  restart) for s in $list; do do_stop "$s" || rc=1; done; for s in $list; do do_start "$s" || rc=1; done;;
  *) echo "Usage : $0 status|start|stop|restart [api|site|all]"; exit 2;;
esac
exit $rc
