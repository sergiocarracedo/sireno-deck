#!/bin/bash
set -euo pipefail

OUTPUT="${1:-demos/video-default.webm}"
RAW="${OUTPUT%.webm}-raw.webm"
URL="${URL:-http://localhost:52938/?deckOnly=1}"
LIGHT_URL="${2:-${LIGHT_URL:-}}"

dir=$(dirname "$OUTPUT")
mkdir -p "$dir"

capture_theme() {
  local capture_url="$1"
  local output="$2"
  local raw="${output%.webm}-raw.webm"

  echo "=== Open emulator: $capture_url ==="
  agent-browser close 2>/dev/null || true
  agent-browser open "$capture_url"
  agent-browser wait --load networkidle

  echo "=== Wait for populated deck ==="
  for _ in $(seq 1 60); do
    ready=$(agent-browser eval '(() => {
      const frame = document.querySelector("[data-testid=deck-frame]");
      const status = document.querySelector("[data-testid=iframe-status]");
      return frame && frame.querySelectorAll("[data-testid^=deck-key-]").length >= 15 &&
        (!status || status.getAttribute("data-status") === "loaded") ? "ready" : "waiting";
    })()' 2>/dev/null | tr -d '"' | tail -1)
    [[ "$ready" == "ready" ]] && break
    sleep 1
  done
  [[ "$ready" == "ready" ]] || { echo "Deck never became ready" >&2; return 1; }

  echo "=== Get deck bounds ==="
  CROP=$(agent-browser eval '(() => {
    const d = document.querySelector("[data-testid=deck-frame]");
    const r = d.getBoundingClientRect();
    return [r.width, r.height, r.x, r.y].map(Math.round).join(":");
  })()' 2>&1 | tail -1 | tr -d '"')
  echo "     crop=$CROP"

  echo "=== Record ==="
  agent-browser record start "$raw"
  sleep 2

  echo "=== Sequence ==="
  agent-browser eval '
(function () {
  function tap(k) {
    var el = document.querySelector("[data-testid=\"deck-key-"+k+"\"]");
    if (!el) return;
    el.dispatchEvent(new MouseEvent("mousedown", {bubbles:true}));
    setTimeout(function(){ el.dispatchEvent(new MouseEvent("mouseup", {bubbles:true})); }, 150);
  }
  function hold(k, t) {
    var el = document.querySelector("[data-testid=\"deck-key-"+k+"\"]");
    if (!el) return;
    el.dispatchEvent(new MouseEvent("mousedown", {bubbles:true}));
    setTimeout(function(){ el.dispatchEvent(new MouseEvent("mouseup", {bubbles:true})); }, t);
  }
  function dbltap(k) {
    var el = document.querySelector("[data-testid=\"deck-key-"+k+"\"]");
    if (!el) return;
    el.dispatchEvent(new MouseEvent("mousedown", {bubbles:true}));
    setTimeout(function(){
      el.dispatchEvent(new MouseEvent("mouseup", {bubbles:true}));
      setTimeout(function(){
        el.dispatchEvent(new MouseEvent("mousedown", {bubbles:true}));
        setTimeout(function(){ el.dispatchEvent(new MouseEvent("mouseup", {bubbles:true})); }, 150);
      }, 80);
    }, 150);
  }

  var D = 500;
  // [1] System-status pages
  setTimeout(function(){ tap(0); }, D); D+=1200;
  setTimeout(function(){ tap(0); }, D); D+=1200;
  setTimeout(function(){ tap(0); }, D); D+=1200;
  // [2] Weather Vigo
  setTimeout(function(){ tap(4); }, D); D+=1200;
  setTimeout(function(){ tap(4); }, D); D+=1200;
  setTimeout(function(){ tap(4); }, D); D+=1200;
  setTimeout(function(){ tap(4); }, D); D+=1200;
  // [3] Mute
  setTimeout(function(){ tap(8); }, D); D+=1200;
  setTimeout(function(){ tap(8); }, D); D+=1200;
  // [4] Pomodoro + media player
  setTimeout(function(){ tap(10); }, D); D+=2500;
  setTimeout(function(){ tap(12); }, D); D+=3500;
  setTimeout(function(){ tap(12); }, D); D+=1200;
  // [5] Emoji selector
  setTimeout(function(){ tap(9); }, D); D+=2000;
  setTimeout(function(){ tap(1); }, D); D+=1300;
  setTimeout(function(){ tap(13); }, D); D+=800;
  setTimeout(function(){ tap(7); }, D); D+=1300;
  setTimeout(function(){ hold(13,500); }, D); D+=1100;
  setTimeout(function(){ hold(14,500); }, D); D+=1100;
  // [6] Chrome overlay
  setTimeout(function(){ dbltap(14); }, D); D+=2500;
  setTimeout(function(){ tap(14); }, D); D+=1200;
  // [7] Demo decks
  setTimeout(function(){ tap(1); }, D); D+=1500;
  setTimeout(function(){ tap(1); }, D); D+=2500;
  setTimeout(function(){ tap(13); }, D); D+=2500;
  setTimeout(function(){ tap(14); }, D); D+=500;
  setTimeout(function(){ tap(7); }, D); D+=2500;

    "done"
  })()
  ' 2>&1 | tail -1

  sleep 40

  echo "=== Crop: $CROP ==="
  agent-browser record stop
  ffmpeg -y -i "$raw" -vf "crop=$CROP" -c:v libvpx-vp9 -crf 30 -b:v 0 "$output" 2>/dev/null && rm -f "$raw"
  ls -lh "$output"
}

capture_theme "$URL" "$OUTPUT"

if [[ -n "$LIGHT_URL" ]]; then
  LIGHT_OUTPUT="${OUTPUT%.webm}-light.webm"
  capture_theme "$LIGHT_URL" "$LIGHT_OUTPUT"
  echo "=== Join default and light captures ==="
  ffmpeg -y -i "$OUTPUT" -i "$LIGHT_OUTPUT" -filter_complex "[0:v][1:v]concat=n=2:v=1:a=0[v]" -map "[v]" -c:v libvpx-vp9 -crf 30 -b:v 0 "$OUTPUT.tmp.webm" 2>/dev/null
  mv "$OUTPUT.tmp.webm" "$OUTPUT"
  rm -f "$LIGHT_OUTPUT"
  ls -lh "$OUTPUT"
fi
