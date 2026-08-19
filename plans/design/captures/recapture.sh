#!/bin/bash
# recapture.sh — recapture the 01, 13, 14 hero/theme shots against the user's
# real main deck (rich content), and redo 06-weather with longer wait + taps.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
USER_CONFIG="/home/sergio/.config/sireno-deck/config.yml"

# Place wrappers DIRECTLY next to the user's config so the path-traversal
# check on !include paths accepts them — !include must stay within
# dirname(config), and the user's config references demos/X.yml.
WRAPPER_DIR="/home/sergio/.config/sireno-deck"
mkdir -p "$WRAPPER_DIR"

# Important: the daemon caches the config path in $XDG_RUNTIME_DIR and
# prefers the cached value over --config. We delete the cache before each
# start so our wrapper config actually loads.
RUNTIME_DIR="/run/user/1000"
SIRENO_RUNTIME_DIR="/home/sergio/.config/sireno-deck"

# Build a wrapper for the given theme by copying the user's config and
# rewriting the `theme:` line.
write_wrapper() {
  local theme="$1"
  local file="$WRAPPER_DIR/.stitch-${theme}.yml"
  USER_CONFIG_VAL="$USER_CONFIG" \
  USER_DIR_VAL="$(dirname "$USER_CONFIG")" \
  THEME_VAL="$theme" \
  FILE_VAL="$file" \
  python3 "$SCRIPT_DIR/_write_wrapper.py"
  echo "$file"
}

clear_runtime_cache() {
  rm -f "$RUNTIME_DIR/sireno-deck.config" \
        "$RUNTIME_DIR/sireno-deck.flags.json" \
        "$RUNTIME_DIR/sireno-deck.pid" \
        "$RUNTIME_DIR/sireno-deck.pid.lock" \
        "$RUNTIME_DIR/sireno-deck.token" \
        "$RUNTIME_DIR/sireno-deck.children.json" \
        "$RUNTIME_DIR/sireno-deck.runtime-state.json" 2>/dev/null || true
  rm -f "$SIRENO_RUNTIME_DIR/sireno-deck.config" 2>/dev/null || true
}

cleanup_daemon() {
  if [[ -n "${DAEMON_PID:-}" ]]; then
    kill -TERM -"$DAEMON_PID" 2>/dev/null || true
    for _ in {1..40}; do
      kill -0 "$DAEMON_PID" 2>/dev/null || break
      sleep 0.5
    done
    kill -KILL -"$DAEMON_PID" 2>/dev/null || true
  fi
  for port in 52937 52938 5180; do
    for pid in $(ss -ltnp 2>/dev/null | awk -v p=":$port" '$4 ~ p {match($0,/pid=([0-9]+)/,a); print a[1]}'); do
      cmd="$(ps -p "$pid" -o cmd= 2>/dev/null || true)"
      if echo "$cmd" | grep -qE 'sirenodeck|vite'; then
        kill "$pid" 2>/dev/null || true
      fi
    done
  done
  sleep 2
  clear_runtime_cache
  rm -f "$WRAPPER_DIR/.stitch-light.yml" \
        "$WRAPPER_DIR/.stitch-neon-grids.yml" 2>/dev/null || true
}

start_daemon() {
  local config="$1"
  local log="/tmp/stitch-recap.log"
  cleanup_daemon
  agent-browser close 2>/dev/null || true
  cd "$REPO_ROOT"
  SIRENO_DAEMON_CHILD=1 node packages/cli/bin/sirenodeck.js start \
    --config "$config" \
    --emulator > "$log" 2>&1 &
  DAEMON_PID=$!
  for _ in {1..120}; do
    if curl -fsS "http://127.0.0.1:52938/" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  echo "  ERROR: daemon never came up" >&2
  tail -40 "$log" >&2 || true
  return 1
}

capture_deck() {
  local out="$1"
  local deck_hash="${2:-}"
  local extra_settle="${3:-8}"
  local url="http://127.0.0.1:52938/?deckOnly=1"
  [[ -n "$deck_hash" ]] && url="$url#/$deck_hash"
  agent-browser open "$url" >/dev/null 2>&1
  agent-browser wait --load networkidle >/dev/null 2>&1
  sleep "$extra_settle"
  agent-browser eval "
    (() => {
      let s = document.getElementById('sireno-stitch-css');
      if (!s) {
        s = document.createElement('style');
        s.id = 'sireno-stitch-css';
        document.head.appendChild(s);
      }
      s.textContent = '[data-testid=\"fullscreen-toggle\"] { display: none !important; visibility: hidden !important; }';
    })()
  " >/dev/null 2>&1
  sleep 2
  agent-browser screenshot "$out" >/dev/null 2>&1
  echo "  wrote $out"
}

# --- 01: hero (default theme, main deck) ---
echo "==> 01-hero-main-deck.png (default theme, main deck)"
start_daemon "$USER_CONFIG"
capture_deck "/works/opensource/sireno-deck/plans/design/captures/01-hero-main-deck.png" "main" 14
sleep 8
agent-browser screenshot "/works/opensource/sireno-deck/plans/design/captures/01-hero-main-deck.png" >/dev/null 2>&1
echo "  re-shot 01 with extra settle time"

# --- 13: light theme ---
echo "==> 13-theme-light.png (light theme, main deck)"
LIGHT_WRAPPER="$(write_wrapper light)"
start_daemon "$LIGHT_WRAPPER"
capture_deck "/works/opensource/sireno-deck/plans/design/captures/13-theme-light.png" "main" 14
sleep 8
agent-browser screenshot "/works/opensource/sireno-deck/plans/design/captures/13-theme-light.png" >/dev/null 2>&1
echo "  re-shot 13-theme-light"

# --- 14: neon-grids theme ---
echo "==> 14-theme-riptide.png (neon-grids theme, main deck)"
NG_WRAPPER="$(write_wrapper neon-grids)"
start_daemon "$NG_WRAPPER"
capture_deck "/works/opensource/sireno-deck/plans/design/captures/14-theme-riptide.png" "main" 14
sleep 8
agent-browser screenshot "/works/opensource/sireno-deck/plans/design/captures/14-theme-riptide.png" >/dev/null 2>&1
echo "  re-shot 14-theme-neon-grids"

# --- 06: weather ---
echo "==> 06-weather.png (default theme, demo-weather with longer wait)"
start_daemon "$REPO_ROOT/demos/demo-weather.yml"
capture_deck "/works/opensource/sireno-deck/plans/design/captures/06-weather.png" "demo-weather" 18
echo "  weather: longer wait complete"

cleanup_daemon
rm -rf "$WRAPPER_DIR"
rm -f /works/opensource/sireno-deck/plans/design/captures/test-light.png

echo
echo "Done. Files:"
ls -la /works/opensource/sireno-deck/plans/design/captures/*.png | head -20