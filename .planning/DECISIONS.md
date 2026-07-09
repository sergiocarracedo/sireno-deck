# Decisions

> Locked architectural decisions, in reverse chronological order. Add new entries at the top. See `ARCHITECTURE.md` for the long-form rationale.

## 2026-07-07 — Architecture doc replaces phase ceremony

**Context:** The repo's `.planning/` carried learnship phases, quick tasks, plan files, and per-phase discussion logs. Heavy ceremony, hard to keep current. User wanted the source of truth to be a single architecture document.

**Decision:**

1. **Architecture doc lives at the repo root** — `ARCHITECTURE.md`. Mirror at `.planning/research/ARCHITECTURE.md` so the research directory stays self-contained.
2. **No phase/quick ceremony** — the v1.7 P-list (P1–P8) lives in `ROADMAP.md` as a checklist. Each P-entry becomes one PR.
3. **`AGENTS.md` is lean** — points to the architecture doc + roadmap + PITFALLS, no per-phase ceremonies.
4. **Solutions store keeps working** — `.planning/solutions/<category>/<slug>.md` with YAML frontmatter (`module`, `problem_type`, `severity`, `tags`). Future plans search before planning.

## 2026-07-07 — P1 React Router (service-driven nav)

**Decision:** Add `react-router-dom` to the frontend. Per-deck route `/decks/:deckId`. The **service** picks the active deck; the URL is the read-only projection. The frontend never decides navigation; it just renders whatever `deck-config` message the service sent, and updates the URL when `deck-active` arrives.

**Rationale:** Keeping the service authoritative means active-app overlay decks, system-back injection, and history stacks all stay server-side. The frontend stays dumb.

## 2026-07-07 — P2 gestureHandlers default-deny

**Decision:** `gestureHandlers` is an **enforced opt-in** filter (default-deny). If a backend declares `onTap/onDblTap/onHold` without listing the gesture in `gestureHandlers`, log a warning and **silently strip the undeclared handlers**. No shim, no compatibility flag — `SIRENO_ADDON_API_VERSION` stays at 1; the audit is the migration.

**Rationale:** Today any backend with `onTap` fires for any tap. The frontend can't tell the service "I don't want dbl-tap for this button." Default-deny is the only way to make the field meaningful. The audit list (9 of 10 built-ins) is in `ROADMAP.md` and ships in P2.

## 2026-07-07 — P4+P5 auto-register addon decks + `internal?: boolean`

**Decision:** Every deck an addon declares in `manifest.decks` registers at load time. User config can still _reference_ an addon deck by `${addonName}:${deckKey}`. The `internal?: boolean` flag on `AddonDeckDefinition` opts a deck out of user-config discovery surfaces (CLI listing, schema completions).

**Rationale:** Today users must list addon decks in `config.yml` to use them — friction. Auto-register fixes that. The `internal` flag prevents the settings deck from polluting the user's deck list.

## 2026-07-07 — P6 SplitActionSurface on every deck

**Decision:** `SplitActionSurface` renders on the **n-1 slot of every deck** — main, sub, overlay. Primary action per deck type:

- Main deck → **settings nav** (secondary: null/empty)
- Sub-deck (navStackDepth > 1) → **back** (secondary: null/empty)
- Overlay deck → **dismiss overlay** (secondary: empty)

**Rationale:** Today the system back button only renders on overlay decks + navStackDepth>1. Sub-decks don't show a back tile; users have to long-press or use a hidden affordance. Putting it on every deck makes navigation consistent.

## 2026-07-07 — P8 backend → service rename (deferred)

**Decision:** Rename `*Backend` to `*Service` where it reads as "the long-lived Node process" (e.g., `AddonGlobalBackend` → `AddonGlobalService`, `AddonButtonBackendContext` → `AddonButtonServiceContext`). One commit, no behavior change.

**Rationale:** The user-visible surface is "the service" (the daemon). "Backend" is ambiguous — could mean the addon backend, the daemon, or the protocol peer. The rename is cheap and reduces docs churn.

**Status:** Deferred to its own PR after P1/P2/P4/P5/P6 land.

## Earlier decisions (carried over from deleted .planning/DECISIONS.md)

These were captured during Phases 67–75 and remain valid. See git history `e4fd7b7c^-` if you need the original files.

- **v1.6 ship** (Phase 67 verified) — settings button migration to `IconLabelSurface`, fixed-position `createInternalSettingsDeck()` with n-1 free for runtime-injected back button.
- **Phase 71** — `dispatchGestureEnd` extracted to `packages/cli/src/deck/gesture-state.ts`; system back button omits `onDblTap` when no overlay context.
- **Phase 72** — `CoreDeckConfigSchema.icon` field added; 4-tier icon fallback chain (configured icon → first emoji → name initial → layout-grid).
- **Phase 73** — pasteText writes to clipboard + sends paste keystroke; key-macro providers throw on failure (caught by runtime + shown via `showRuntimeButtonError`).
- **Phase 74** — `system-status-label-values` metrics capped at 1-2 (3+ rejected with hint to use `value-display`).
- **Phase 75** — `value-display` first-party addon; `SystemStatusFormatterSchema` exported from `system-status/schemas.ts`.

## 2026-07-08 — OutputClient abstraction over real-vs-emulator pipeline

**Context:** `runRealModePipeline` (473-702) and `runEmulatorLifecycle` (773-867) shared ~80% of their logic — config/theme load, runtime + providers + ws-bridge + addon services — but had divergent finalizers. Emulator mode silently skipped system providers (latent gap: clipboard paste, media keys, session monitor, active-app, key-macro unavailable).

**Decision:** Introduce `OutputClient` (`packages/cli/src/cli/commands/output-client/{types,real,emulator,index}.ts`). A single `runPipeline(options)` calls `selectOutputClient({emulator, device, intervalMs?})` and runs `.start(ctx)`. `RealOutputClient` wraps `BrowserRenderer`; `EmulatorOutputClient` wraps vite spawn + ws-bridge dispatch. `runRealMode` and `runEmulatorLifecycle` are deleted; `real-mode.ts` removed; `emulator-mode.ts` slimmed to helpers (`buildDeckConfigMessage`, `spawnFrontendVite`, `spawnEmulatorVite`, `killChild`, `resolveFrontendCwd`, `resolveEmulatorCwd`, `findWorkspaceRoot`, `AddonFrontendRef`).

**Rationale:** The two pipelines were a 2x maintenance burden with no real test coverage on the divergent tail. OutputClient makes the divergence local and explicit (each subclass owns its start/stop), reuses the same providers + addon services wiring, and closes the emulator provider gap as a side effect.

## 2026-07-09 — Uniform gesture stream: raw `key-event` over fully-formed `button-action`

**Context:** Emulator and real hardware had to use the same gesture semantics (tap, dbl-tap, hold, with the same timing windows), but the emulator frontend pre-classified the gesture and sent a fully-formed `button-action` message. Real hardware went through `createGestureDetector`; emulator did not. Two gesture code paths. The frontend's `sendButtonAction` further bypassed `runtime.dispatchGesture` and called `runtime.invokeAction` directly, so addons never received a `runtime:gesture:*` event for emulator clicks.

**Decision:** Replace the `button-action` message with a raw `key-event` message (`{ deckId, position, kind: "down" | "up", timestamp }`). The frontend now sends `key-event` from `onPointerDown` / `onPointerUp` (with `setPointerCapture` so a drag-off tile still emits `up`). `EmulatorOutputClient` mirrors `RealOutputClient` — both call `createGestureDetector({onGesture})` and feed the result to `runtime.dispatchGesture`. Constants `HOLD_ACTION_DELAY_MS` and `DOUBLE_TAP_DELAY_MS` collapse to 200ms (was 500ms) — shared between real and emulator. `PROTOCOL_VERSION` stays at 1; `key-event` is an additive new message, no version bump, no handshake change. The outer `ButtonFrame` no longer flashes on emulator press (its data came from the now-removed `button-action` echo); the inner `ButtonSurface` keeps reacting to `runtime:gesture:*`.

**Rationale:** One source of truth for gesture semantics. Hardware and emulator cannot diverge on tap/dbltap/hold behavior because they share the same state machine. A latent dbl-tap callback bug (gesture-state.ts fired dbl-tap only via the synchronous return value, never through `onGesture`) was fixed as part of this work — both real and emulator would have silently dropped dbl-tap before. 200ms matches the user spec for emulator feel. PROTOCOL v1 stays additive so old frontends still work after deploy.

## 2026-07-09 (later) — Per-transport gesture detectors; only final gestures on the wire

**Context:** The earlier 2026-07-09 decision moved gesture detection into the backend (`EmulatorOutputClient` ran `createGestureDetector` on raw `key-event` messages from the emulator SPA). That works but it puts gesture semantics on the backend — the wire format carried raw `down`/`up` and the backend was the sole arbiter of `tap`/`dbl-tap`/`hold`. The decoupling principle says neither side should know how the other detects gestures. A change to emulator tap-detection rules today requires editing backend code.

**Decision:** Revert that part. Each transport owns its own gesture detection.

- **Real hardware** — `RealOutputClient` runs `createGestureDetector` on `device.onKeyEvent(...)` and calls `runtime.dispatchGesture` directly. No WS involvement.
- **Emulator overlay** (`packages/cli/emulator/`) — captures pointerdown / pointerup / leave on each tile, runs its own per-key gesture detector (`packages/cli/emulator/src/gesture.ts`, importing `nextGesture` from `@sireno-deck/cli`), and emits the final gesture as `{type: "button-action", deckId, position, gesture}`.
- **`EmulatorOutputClient`** — thin pass-through. Looks up the button by position and calls `runtime.dispatchGesture`. No detection logic.
- **`chrome` SPA (`packages/cli/frontend/`)** — pure display. Subscribes to `runtime:gesture:*` via `useAddonChannel` and forwards gestures to the addon's React component. **No emission of any button event.** No `sendButtonAction`, no `onClick → tap`, no `gestures` prop, no `button-action` incoming handler.
- **Wire format** — `button-action` carries `{deckId, position, gesture: 'tap' | 'dbl-tap' | 'hold'}`. No raw `key-event` messages anywhere. `PROTOCOL_VERSION` stays at 1 — no schema change.
- **Shared logic** — `core/gesture-state.ts` constants `HOLD_ACTION_DELAY_MS = 200`, `DOUBLE_TAP_DELAY_MS = 200`, and `createGestureDetector` / `nextGesture` are the single source of timing. Both transports import them, so any future tuning applies atomically. The 200ms constants and the dbl-tap `onGesture` callback fix from the earlier decision stay.

**Rationale:** Decoupling. Neither the backend nor the chrome knows how the emulator SPA detects gestures; neither the backend nor the emulator knows how real hardware delivers them. The wire format is gesture-only, the runtime is gesture-source-agnostic. A change to emulator tap-detection timing is a local edit in `emulator/gesture.ts`; the backend never has to know. Symmetric to how real hardware already worked.

