#!/bin/bash
# capture-all.sh — produce all 15 captures for the Stitch website
#
# Runs each capture against a fresh daemon. Daemons are killed cleanly
# between captures so chokidar doesn't see the config file disappear.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

CAP="$SCRIPT_DIR/capture-one.sh"
DEMOS="$REPO_ROOT/demos"
OUT="$SCRIPT_DIR"

# (output file, demo yml, theme, deck-hash)
captures=(
  "01-hero-main-deck.png         |demo-decks-index.yml          |default   |demo-decks-index"
  "02-media-controls.png         |demo-media.yml                |default   |demo-media"
  "03-system-metrics.png         |demo-system-status.yml        |default   |demo-system-status"
  "04-emojis.png                 |demo-emoji-selector.yml       |default   |emoji-selector"
  "05-date-time.png              |demo-date-time.yml            |default   |demo-date-time"
  "06-weather.png                |demo-weather.yml              |default   |demo-weather"
  "07-action-buttons.png         |demo-core.yml                 |default   |demo-core"
  "08-value-display.png          |demo-value-display.yml        |default   |demo-value-display"
  "09-app-shortcuts-grid.png     |demo-app-shortcuts.yml        |default   |demo-app-shortcuts"
  "10-app-overlays.png           |demo-app-overlays.yml         |default   |demo-app-overlays"
  "11-pomodoro.png               |demo-pomodoro.yml             |default   |demo-pomodoro"
  "12-theme-default.png          |demo-decks-index.yml          |default   |demo-decks-index"
  "13-theme-light.png            |demo-decks-index.yml          |light     |demo-decks-index"
  "14-theme-riptide.png          |demo-decks-index.yml          |riptide   |demo-decks-index"
  "15-settings-deck.png          |demo-decks-index.yml          |default   |core:settings"
)

total=${#captures[@]}
ok=0
fail=0

for entry in "${captures[@]}"; do
  IFS='|' read -r out demo theme deck <<< "$entry"
  out="$(echo "$out" | xargs)"
  demo="$(echo "$demo" | xargs)"
  theme="$(echo "$theme" | xargs)"
  deck="$(echo "$deck" | xargs)"

  printf "[%02d/%02d] %s (deck=%s theme=%s)\n" $((ok + fail + 1)) "$total" "$out" "$deck" "$theme"

  if bash "$CAP" "$OUT/$out" "$DEMOS/$demo" "$theme" "$deck" 8; then
    ok=$((ok + 1))
  else
    fail=$((fail + 1))
    echo "  FAILED"
  fi
done

# Tidy up any leftover wrapper configs from successful runs.
rm -f "$DEMOS"/.tmp-stitch-*.yml

echo
echo "Done. ok=$ok fail=$fail total=$total"