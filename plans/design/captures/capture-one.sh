#!/bin/bash
# capture-one.sh — capture a single screenshot from a fresh isolated emulator
#
# Usage: capture-one.sh <output.png> <config-yml> [theme] [deck-hash] [wait-seconds]
#
# Notes:
#   - Spawns a dedicated daemon on the standard ports (52937 WS, 52938 HTTP).
#     Port override is not honored by ws-bridge.run.ts — those ports are
#     hardcoded inside the daemon, so we use the defaults.
#   - Isolated XDG_RUNTIME_DIR keeps the runtime dir clean.
#   - The wrapper config lives in /demos/ (path-traversal safe — !include
#     must stay inside dirname(config)). We delete it AFTER the daemon
#     process group is fully gone so chokidar doesn't see the unlink.

set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <output.png> <config-yml> [theme] [deck-hash] [wait-seconds]" >&2
  exit 1
fi

OUT="$1"
CONFIG_YML="$2"
THEME="${3:-default}"
DECK_HASH="${4:-}"
WAIT="${5:-6}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

OUT_DIR="$(dirname "$OUT")"
mkdir -p "$OUT_DIR"

RUNTIME_DIR="/tmp/sireno-stitch-$$"
LOG="/tmp/sireno-stitch-$$.log"

# Wrapper config: must be in /demos/ so !include can reference the demo file.
# Map demo yml name → list of additional addon src paths needed for that deck
# to render (pomodoro, app-shortcuts, value-display-extra, etc. ship as
# separate addons under packages/addons/, not as builtins).
declare -A DEMO_ADDONS=(
  ["demo-pomodoro"]="../packages/addons/pomodoro"
  ["demo-app-shortcuts"]="../packages/addons/app-shortcuts"
  ["demo-app-overlays"]="../packages/addons/app-shortcuts"
)

WRAPPER="$REPO_ROOT/demos/.tmp-stitch-$$-$(basename "$CONFIG_YML")"
DEMO_BASE="$(basename "$CONFIG_YML" .yml)"

ADDON_LINES=""
extra="${DEMO_ADDONS[$DEMO_BASE]:-}"
if [[ -n "$extra" ]]; then
  ADDON_LINES="addons:
  - src: ${extra}
    config:
      defaults:
        autoShow: false
"
fi

cat >"$WRAPPER" <<EOF
theme: ${THEME}

${ADDON_LINES}decks:
  ${DEMO_BASE}: !include $(basename "$CONFIG_YML")
EOF

cleanup() {
  if [[ -n "${DAEMON_PID:-}" ]]; then
    # Wrapper is a session leader (spawnDetached), so negative-pid signals
    # reach the whole tree: wrapper -> supervisor -> daemon -> vite children.
    kill -TERM -"$DAEMON_PID" 2>/dev/null || true
    for _ in {1..40}; do
      if ! kill -0 "$DAEMON_PID" 2>/dev/null; then
        break
      fi
      sleep 0.5
    done
    kill -KILL -"$DAEMON_PID" 2>/dev/null || true
  fi
  rm -f "$WRAPPER"
  rm -rf "$RUNTIME_DIR"
}
trap cleanup EXIT

mkdir -p "$RUNTIME_DIR"
chmod 700 "$RUNTIME_DIR"

agent-browser close 2>/dev/null || true

cd "$REPO_ROOT"

XDG_RUNTIME_DIR="$RUNTIME_DIR" \
SIRENO_DAEMON_CHILD=1 \
node packages/cli/bin/sirenodeck.js start \
  --config "$WRAPPER" \
  --emulator \
  >"$LOG" 2>&1 &
DAEMON_PID=$!

# Wait for the emulator HTTP server (52938).
for i in {1..120}; do
  if curl -fsS "http://127.0.0.1:52938/" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -fsS "http://127.0.0.1:52938/" >/dev/null 2>&1; then
  echo "  ERROR: emulator never came up. Log tail:" >&2
  tail -60 "$LOG" >&2 || true
  exit 1
fi

URL="http://127.0.0.1:52938/?deckOnly=1"
if [[ -n "$DECK_HASH" ]]; then
  URL="http://127.0.0.1:52938/?deckOnly=1#/${DECK_HASH}"
fi

agent-browser open "$URL" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
sleep "$WAIT"

agent-browser eval "
(() => {
  let s = document.getElementById('sireno-stitch-css');
  if (!s) {
    s = document.createElement('style');
    s.id = 'sireno-stitch-css';
    document.head.appendChild(s);
  }
  s.textContent = \`
    [data-testid='fullscreen-toggle'] { display: none !important; visibility: hidden !important; }
  \`;
  return 'ok';
})()
" >/dev/null 2>&1
sleep 1

agent-browser screenshot "$OUT" >/dev/null 2>&1

if [[ ! -s "$OUT" ]]; then
  echo "  ERROR: empty screenshot. Log tail:" >&2
  tail -60 "$LOG" >&2 || true
  exit 1
fi

echo "  wrote $OUT  (deck=$DECK_HASH theme=$THEME)"