#!/bin/bash
set -euo pipefail

OUTPUT="${1:-demos/video-default.webm}"
RAW="${OUTPUT%.webm}-raw.webm"
URL="${URL:-http://localhost:52938/?deckOnly=1}"

dir=$(dirname "$OUTPUT")
mkdir -p "$dir"

echo "=== Open emulator ==="
agent-browser close 2>/dev/null || true
agent-browser open "$URL"
agent-browser wait --load networkidle
sleep 5

echo "=== Get deck bounds ==="
CROP=$(agent-browser eval "var d=document.querySelector('.overflow-hidden.rounded-xl');var r=d.getBoundingClientRect();Math.round(r.width)+':'+Math.round(r.height)+':'+Math.round(r.x)+':'+Math.round(r.y)" 2>&1 | tail -1 | tr -d '"')
echo "     crop=$CROP"

echo "=== Record ==="
agent-browser record start "$RAW"
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
ffmpeg -y -i "$RAW" -vf "crop=$CROP" -c:v libvpx-vp9 -crf 30 -b:v 0 "$OUTPUT" 2>/dev/null && rm -f "$RAW"
ls -lh "$OUTPUT"
