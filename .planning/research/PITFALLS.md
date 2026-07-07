# Pitfalls

> Known gotchas — read before planning any phase that touches these areas.

## Zod

- **`.refine()` / `.superRefine()` silently breaks `.shape` consumers** — `.shape` returns a `ZodObject<{...}>` only when the schema is a plain `ZodObject`. Use `.min(1).max(2, "msg")` directly on `ZodArray` instead, so the schema remains a plain `ZodArray` and `.shape` consumers can read it. See `.planning/solutions/best-practices/zod-refine-silently-breaks-shape-consumers-2026-06-09.md` (Phase 74).

## tsx / TSX runtime

- **`tsx` CLI wrapper hangs under execa** for eval-based regression. Use `node --import tsx/esm --eval` instead (Phase 11 fix). See `.planning/solutions/runtime-errors/tsx-cli-wrapper-hangs-under-execa-2026-05-27.md`.
- **Raw theme/addon runtime imports must pass the package `tsconfig.json` explicitly** — don't use `tsconfig: false`. Otherwise the honest runtime path diverges from the package TSX policy and you end up needing manual `React` imports.

## Test fixtures

- **Anchor fixtures to source-file-relative paths**, not invocation-dependent cwd. Package-scoped and workspace-root test runs will diverge silently otherwise (Phase 11 regression).

## Gestures

- **`runtime.dispatchGesture` is the single entry point** for hardware + emulator clicks. If you add a new path (e.g., frontend-UI click handler that bypasses the dispatcher), gestures won't reach the WS stream and the frontend's `useAddonChannel('runtime:gesture:...')` won't fire.
- **HOLD + DBL_TAP delays live in `core/gesture-state.ts`** — change there, not in callers.

## Stream Deck hardware

- **Real clocks drift, real sensors read off** — keep the calibration knob, not just less code. The physical world needs tuning a minimal model can't see.
- **Per-model key counts differ** — `DEFAULT_KEY_COUNT = 15` is hardcoded in `render/ws-bridge.ts`. XL has 32 keys; multi-row devices are future work.
- **Linux udev setup required** for USB access. Documented in `packages/cli/README.md`.

## Addon API

- **Namespacing is mandatory** — keys in `buttonTypes`, `decks` must be prefixed `${addonName}:`. `AddonRegistry` enforces this.
- **Two deck shapes coexist** — `AddonDeckFactory({host})` (no config) and `AddonDeckDefinition({config, host, methods})` (config-aware). Pick `AddonDeckDefinition` for new code; `AddonDeckFactory` only for trivial cases.
- **`internal?: boolean`** exists on `AddonButtonTypeBackend` (hides from user config) but NOT yet on `AddonDeckDefinition` — P5 in the roadmap adds it.
- **`gestureHandlers` is not enforced today** — any backend with `onTap/onDblTap/onHold` fires regardless. P2 fixes this with default-deny.

## WS Protocol

- **Two consumers** of `deck-config` payload exist: `packages/cli/frontend/src/App.tsx` (renders the deck) and `packages/cli/emulator/src/App.tsx` (renders + injects clicks). When you change the payload shape, both must update in the same commit.
- **`PROTOCOL_VERSION`** lives in `packages/cli/src/api/protocol-internal.ts`. Bump it on breaking changes; the hello handshake enforces it.

## Daemon

- **Pidfile + token must be cleaned up on crash** — `start.ts` writes both. Cleanup on SIGTERM/SIGINT; on hard crash, recovery reads pidfile and surfaces to user via `status` command.
- **`start.ts` resolves `frontend/dist/index.html`** — the `build` step (tsdown + frontend Vite) must run before `start` works in real mode.

## Frontend

- **No React Router today** — `<App />` reads `deck-config` WS messages directly. Adding routing is a deliberate change (P1).
- **Frontend-UI clicks bypass the gesture stream** — known small issue in ARCHITECTURE.md §9. Frontend `sendButtonAction` calls `runtime.invokeAction` directly, so hardware-gesture observers (subscribers to `runtime:gesture:...`) don't see them. Fix on demand, not speculatively.

## Pre-existing test failures

- **79 failures in `packages/cli/src/deck/runtime.test.ts`** from Phase 42/67 system-back-injection firing in test contexts where it shouldn't. **Pre-dates Phase 71.** Flagged for future forensics — do not "fix" opportunistically, it'll mask the real bug.

## Regressions — capture to `/compound`

After fixing any bug that took more than 15 minutes to find, write a `.planning/solutions/<category>/<slug>.md` with YAML frontmatter (`module`, `problem_type`, `severity`, `tags`). Future plans search these before planning.