# 04 — Architecture

---

## [A1] [P2] `run.ts` is 1849 lines — monolithic pipeline

**Evidence:** `packages/cli/src/cli/commands/run.ts` — 1849 lines, single file.

See code-smells report [CS1] for details.

**Architecture angle:** The file owns the entire daemon lifecycle — config validation, system provider startup, addon registration, runtime construction, WS bridge wiring, hot-reload, signal handling. There is no separation between "what to do" (orchestration) and "how to do it" (implementation). This makes it hard to:
- Test pipeline stages in isolation
- Understand the startup flow without reading the whole file
- Add new pipeline stages (e.g. a health-check or metrics provider)

---

## [A2] [P0] Frontend Deck.tsx gesture detection contradicts ARCHITECTURE.md

**Evidence:**

`ARCHITECTURE.md §2` says:
> "the chrome SPA in packages/cli/frontend/ is pure display: it subscribes to runtime:gesture:* (per button) and the generic state channels. It never emits any button event."

`packages/cli/frontend/src/components/Deck.tsx:142-218` implements manual double-tap (300ms) and hold (500ms) detection and calls `useButtonAction(deckId, position)` which sends `button-action` WS messages.

`packages/cli/frontend/src/hooks/use-button-action.ts` sends:
```ts
{ type: "button-action", deckId, buttonIndex, action: "tap" | "dbl-tap" | "hold" }
```

**Impact:** The architecture doc is wrong about the frontend's role. Either:
1. The doc is stale and the frontend *does* emit button events (for emulator mode) — fix the doc.
2. The code is wrong and should be removed — fix the code.

Either way, a new contributor reading the doc and then the code will be confused. This is the worst kind of doc-code mismatch: a stated invariant that the code violates.

**Effort:** Depends on the answer. If the code is intentional for emulator mode, fix the doc (low). If the code must be removed, route gesture detection through the bridge gesturer (medium).

**Fix sketch (if intentional):**
Update `ARCHITECTURE.md §2` to say:
> "the chrome SPA in packages/cli/frontend/ is display-first: it subscribes to `runtime:gesture:*` channels for real-hardware mode and emits `button-action` events for emulator mode."

**Fix sketch (if unintentional):**
Remove `useButtonAction` from `DeckButtonCell`, remove gesture detection timers, listen only to `runtime:gesture:*` channels, and let the emulator send `button-action` directly to the bridge (which it already does in `emulator/App.tsx`).

---

## [A3] [P0] `sendToCaller` broadcasts to all — misnamed function, privacy bug

**Evidence:** `packages/cli/src/ws-bridge.ts:249-254`

See security report [S2] for full details.

**Architecture angle:** The WS bridge's method-call response path should be point-to-point (caller → result). Broadcasting defeats the purpose of the `caller` parameter and breaks the intent of the `sendToCaller` abstraction. The function signature is correct; the body is a copy of `broadcastToAll`.

---

## [A4] [P1] Token chain not wired end-to-end

**Evidence:** `packages/cli/src/cli/commands/run.ts:1401` — `startWsBridge` called without `expectedToken`. The token is generated in preflight and stored in `config.token` but never propagated to the WS bridge.

**Architecture angle:** The auth chain has three hops:
1. `preflight` → generates token → stores in `config.token`
2. `startHttpServer` → receives token → enforces Bearer auth (FIXED)
3. `startWsBridge` → should receive token → does NOT (BROKEN)

The chain is broken at hop 3. The fix is a one-line argument pass.

---

## [A5] [P2] Boundary violation — `packages/cli/src/index.ts` may import frontend code (unconfirmed)

**Evidence:** Beta review identified `packages/cli/src/index.ts:31-35` importing frontend code, violating the `packages/cli/src/**` → frontend boundary. Could not confirm in this review (lint OOM'd).

**Impact:** If still present, it means `packages/cli` leaks into the frontend package space, which the boundary rule exists to prevent.

**Effort:** Low to check — run oxlint on `packages/cli/src/index.ts` alone and verify.

---

## [A6] [P3] Two gesture detection implementations

The runtime has a proper gesture state machine in `packages/cli/src/runtime/core/gesture-state-machine.ts`. The frontend has a manual implementation in `Deck.tsx`. The emulator also sends button actions directly. There are three code paths for gesture detection:

1. **Real hardware**: `runtime → gesture-state-machine.ts → ws-bridge → frontend subscribes to `runtime:gesture:*``
2. **Emulator (via bridge)**: `emulator App.tsx → ws-bridge → runtime → gesture-state-machine.ts`
3. **Emulator (direct)**: `emulator Deck.tsx → useButtonAction → ws-bridge → runtime`

Path 3 bypasses the gesture state machine — a button press in the frontend arrives at the runtime as a pre-classified gesture ("tap", "dbl-tap", "hold") instead of a raw `keyDown`/`keyUp` pair. This means the frontend's 300ms double-tap threshold differs from whatever the runtime state machine uses.

**Fix:** Unify — either all gestures route through the state machine, or the state machine is only for real hardware. Document the boundary clearly.
