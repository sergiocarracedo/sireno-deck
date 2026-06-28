---
phase: 05-emulator
status: not-started
depends_on: [04-ws-frontend]
---

# Phase 05 — Emulator

Goal: a second vite dev server that renders a side panel + iframe. The iframe embeds the frontend vite. Mouse events on the deck grid become gesture events sent to the WS bridge.

## Outcomes

1. `src/render/emulator-server.ts` — vite spawn manager for emulator mode.
2. `packages/cli/emulator/` — separate Vite React app (the shell).
   - Side panel: deck picker, action log, WS message log, state inspector.
   - Center: iframe pointing at frontend vite URL.
   - Gesture state machine: mouse down/up/timestamp → `tap | dbl-tap | hold` → `button-action` over WS.
3. `src/system/virtual-stream-deck.ts` — `VirtualStreamDeckLifecycle` for emulator mode (no-op device; lets the emulator shell inject key events).
4. Tests: gesture machine (already covered in Phase 03), emulator shell grid mapping, `--device-model` → keyCount/layout mapping.

## Requirements traceability

- **R12** (emulator renders frontend vite in iframe; mouse events become gestures via shell gesture machine)

## Key files

```
src/render/
  emulator-server.ts

src/system/
  virtual-stream-deck.ts

src/device/
  models.ts       # --device-model → { keyCount, columns, rows }
  models.test.ts

packages/cli/emulator/
  vite.config.ts
  index.html
  src/
    main.tsx
    App.tsx
    Shell.tsx
    SidePanel.tsx
    DeckFrame.tsx
    gesture.ts     # shell-local gesture machine
    bridge.ts      # WS client for action injection
```
