#!/bin/bash
# capture-deck.sh — capture one deck from the running daemon
#
# Usage: capture-deck.sh <output.png> <deck-hash> [wait-seconds]
#
# Connects to the running daemon on 52937 (WS) using the token from the
# emulator's iframe URL on 52938 (HTTP). Performs the hello handshake, sends
# `select-deck`, then screenshots the deck in the browser.

set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <output.png> <deck-hash> [wait-seconds]" >&2
  exit 1
fi

OUT="$1"
DECK_HASH="$2"
WAIT="${3:-5}"

OUT_DIR="$(dirname "$OUT")"
mkdir -p "$OUT_DIR"

agent-browser close 2>/dev/null || true

agent-browser open "http://127.0.0.1:52938/?deckOnly=1" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
sleep "$WAIT"

# Inject CSS to hide the FULL/Exit floating button so screenshots are clean.
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

# Navigate by performing a proper hello handshake + select-deck over WS.
agent-browser eval "
(async () => {
  const iframe = document.querySelector('iframe');
  if (!iframe) return 'no-iframe';
  const tokenMatch = iframe.src.match(/token=([^&]+)/);
  if (!tokenMatch) return 'no-token';
  const token = tokenMatch[1];

  const ws = new WebSocket('ws://127.0.0.1:52937?token=' + token);
  await new Promise((res, rej) => {
    ws.onopen = () => res(undefined);
    ws.onerror = (e) => rej(e);
    setTimeout(() => rej(new Error('open timeout')), 5000);
  });

  // Wait for hello-ack — server sends it on successful handshake.
  await new Promise((res, rej) => {
    ws.onmessage = (ev) => {
      try {
        const m = JSON.parse(ev.data);
        if (m.type === 'hello-ack') res(undefined);
      } catch {}
    };
    setTimeout(() => rej(new Error('ack timeout')), 3000);
  });

  // Now the connection is fully open — send select-deck.
  ws.send(JSON.stringify({ type: 'select-deck', deckId: '${DECK_HASH}' }));
  await new Promise((r) => setTimeout(r, 1500));
  ws.close();
  return 'navigated to ${DECK_HASH}';
})()
" >/dev/null 2>&1
sleep 2

agent-browser screenshot "$OUT" >/dev/null 2>&1

if [[ ! -s "$OUT" ]]; then
  echo "  WARN: empty screenshot for $DECK_HASH" >&2
  exit 1
fi

echo "  wrote $OUT  (deck=$DECK_HASH)"