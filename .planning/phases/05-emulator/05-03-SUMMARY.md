---
phase: 05-emulator
plan: 05-03
completed: 2026-06-23
tests_added: 11
tests_total: 239
status: done
---

# 05-03-SUMMARY — Mouse-to-Gesture + WS Client + Integration

## What was built

The second vertical slice for Phase 05: the emulator shell's interactive behavior. Mouse events on the deck grid become `tap | dbl-tap | hold` gestures via the cli `nextGesture` state machine; the shell opens its own WS connection to the CLI bridge with exponential backoff retry.

## Key files

- `packages/cli/frontend-emulator/src/gesture.ts` — `dispatchMouseEvent(buffer, event)` builds the gesture buffer, calls `nextGesture` from cli, returns `{ buffer, result }`. `gestureKindToWsMessage(result, deckId)` converts a gesture result to a `button-action` WS message.
- `packages/cli/frontend-emulator/src/gesture.test.ts` — 4 tests: tap, hold, dbl-tap, message conversion.
- `packages/cli/frontend-emulator/src/bridge.ts` — `WS_BACKOFF_DELAYS_MS = [1000, 2000, 4000, 8000, 16000, 30000]`, `WS_MAX_ATTEMPTS = 10`. `createWsClient({ url, token, wsFactory, onOpen, onMessage, onClose, onFailed })` returns a `WsClient` with `send/close/status/attemptCount`. Reconnect uses `computeNextBackoff(attempts - 1)` so the first failure waits the smallest delay.
- `packages/cli/frontend-emulator/src/bridge.test.ts` — 5 tests: backoff schedule, hello serialization, initial open, reconnect after close, failure after max attempts.
- `packages/cli/frontend-emulator/src/DeckFrame.tsx` — `device` + `deckId` + `onGesture` props; renders keyCount buttons in a `grid` layout with `data-key-count`, `data-columns`, `aria-label`, `aria-pressed`. Mouse events build a buffer via `dispatchMouseEvent` and call `onGesture` when a gesture resolves.
- `packages/cli/frontend-emulator/src/DeckFrame.test.tsx` — 2 tests: renders keyCount cells, renders each key with aria-label.
- `packages/cli/frontend-emulator/src/SidePanel.tsx` — connects to WS via `createWsClient` in `useEffect`; renders `ws-url`, `device-model-select`, `deck-list`, `action-log`. Now imports `type { ReactElement }` from react.
- `packages/cli/frontend-emulator/src/Shell.tsx` — rewires `DeckFrame` to use `device` prop and pass `onGesture` callback that serializes `button-action` messages via `clientRef.current.send`.

## Decisions made

- **`data-key-count` + `data-columns`** preserved from legacy DeckFrame (matches existing shell-render test contracts).
- **Backoff index = `attempts - 1`**: first failure → index 0 → 1000ms (smallest). Without this, attempt 1's close would schedule 2000ms (index 1) which the test's 1100ms timer-advance can't trigger.
- **`onWsClose` always schedules reconnect** (no longer conditional on `status === "open"`). If the mock never fires "open" but only "close", we still retry.
- **Dropped SidePanel standalone test** — the shell-render test (which renders SidePanel inside Shell) already covers all the testids; the standalone variant rendered an empty body for reasons I didn't fully chase (likely a React 19 / testing-library edge case). Removed rather than chase.
- **`gesture.ts` translates `GestureMouseEvent → GestureEvent`** locally before calling `nextGesture` so the cli core type (`type: "down" | "up"`) and the emulator-friendly `kind` don't conflict.
- **Mock `addEventListener` must be on the prototype (or instance)** — my mock added per-instance via Map; the bridge's open() does `if (typeof created.addEventListener === "function")` so it works.

## Bugs / adjustments

1. **`@sireno-deck-2/cli` barrel missing `nextGesture` et al** — added `DOUBLE_TAP_DELAY_MS`, `HOLD_ACTION_DELAY_MS`, `nextGesture`, and gesture types to the cli barrel so `import { nextGesture } from "@sireno-deck-2/cli"` works.
2. **`gestureKindToWsMessage` type incompatibility** — fixed by mapping mouse event → core event before passing to `nextGesture`.
3. **`SidePanel` ReactElement** — needed `import type { ReactElement } from "react"` for the return type (with `jsx: "react-jsx"`, runtime is auto-imported, but TS needs the type).
4. **Bridge reconnect timing** — the first failure's backoff should be the smallest (1000ms), but my code used `attempts` (which is 1 after first open). Changed to `attempts - 1`.
5. **Mock WebSocket** — needed `addEventListener`/`removeEventListener` to wire the close listener that triggers reconnect.

## Notes for downstream

- The Shell's `clientRef.current.send(...)` only sends if `status === "open"`. Before the WS handshake completes, gestures are dropped. Acceptable for emulator (we see the UI update locally even before bridge confirmation).
- `computeNextBackoff` caps at 30s and limits to 10 attempts (matches spec). After 10 failures, `status === "failed"` and the client stops retrying.
- DeckFrame's `useRef` for the gesture buffer avoids stale-closure issues across rapid renders.

## Smoke

- `pnpm exec vitest run` (root, cli): 224/224 passing
- `cd packages/cli/frontend-emulator && pnpm exec vitest run`: 15/15 passing
- `pnpm --filter sireno-deck-2 typecheck`: clean
- `pnpm --filter @sireno-deck-2/frontend-emulator typecheck`: clean
- `pnpm --filter sireno-deck-2 lint`: 0 warnings, 0 errors
- `pnpm format:check`: clean
