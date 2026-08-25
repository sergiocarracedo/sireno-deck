#!/bin/bash
# capture.sh — produce one screenshot of a Sireno Deck emulator view
#
# Usage:
#   ./capture.sh <demo-yml> <output-png> [theme] [deck-hash]
#
# Examples:
#   ./capture.sh demo-decks-index.yml 01-hero.png
#   ./capture.sh demo-decks-index.yml 13-theme-riptide.png riptide
#
# Notes:
#   - Daemon runs in emulator mode on isolated ports (52957 / 52958) so it
#     never touches the user's working daemon on 52937 / 52938.
#   - Theme is set via a wrapper config that includes the demo and overrides
#     theme: (the CLI doesn't accept --theme).
#   - Pass deck-hash to navigate to a specific deck (otherwise main deck).

set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <demo-yml> <output-png> [theme] [deck-hash]" >&2
  exit 1
fi

DEMO="$1"
OUT="$2"
THEME="${3:-default}"
DECK_HASH="${4:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
DEMO_PATH="$REPO_ROOT/demos/$DEMO"

if [[ ! -f "$DEMO_PATH" ]]; then
  echo "Demo not found: $DEMO_PATH" >&2
  exit 1
fi

WS_PORT=52957
HTTP_PORT=52958

OUT_DIR="$(dirname "$OUT")"
mkdir -p "$OUT_DIR"

agent-browser close 2>/dev/null || true

# Wrapper config: declare the demo file as the only deck, then set theme.
WRAPPER="/tmp/sirenodeck-capture-$$-${DEMO%.yml}-${THEME}.yml"
cat >"$WRAPPER" <<EOF
theme: ${THEME}

decks:
  $(basename "$DEMO" .yml): !include ${DEMO_PATH}
EOF

cd "$REPO_ROOT"
LOG="/tmp/sirenodeck-capture-$$.log"

SIRENO_DAEMON_CHILD=1 \
node packages/cli/bin/sirenodeck.js start \
  --config "$WRAPPER" \
  --emulator \
  --port "$WS_PORT" \
  --http-port "$HTTP_PORT" \
  >"$LOG" 2>&1 &
DAEMON_PID=$!

cleanup() {
  kill "$DAEMON_PID" 2>/dev/null || true
  wait "$DAEMON_PID" 2>/dev/null || true
  rm -f "$WRAPPER"
  agent-browser close 2>/dev/null || true
}
trap cleanup EXIT

# Wait for the emulator HTTP server.
for i in {1..60}; do
  if curl -fsS "http://127.0.0.1:$HTTP_PORT/" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -fsS "http://127.0.0.1:$HTTP_PORT/" >/dev/null 2>&1; then
  echo "Emulator never came up. Log tail:" >&2
  tail -80 "$LOG" >&2 || true
  exit 1
fi

# Open the deck view.
URL="http://127.0.0.1:$HTTP_PORT/?deckOnly=1"
if [[ -n "$DECK_HASH" ]]; then
  URL="http://127.0.0.1:$HTTP_PORT/#/${DECK_HASH}?deckOnly=1"
fi
agent-browser open "$URL"
agent-browser wait --load networkidle

# Give the WS bridge a moment to deliver deck-config + first state.
sleep 2

agent-browser screenshot "$OUT"

if [[ ! -s "$OUT" ]]; then
  echo "Empty screenshot produced. Log tail:" >&2
  tail -80 "$LOG" >&2 || true
  exit 1
fi

echo "  wrote $OUT"