# State

> Where the repo is right now.

## Branch

`refactor/architecture-doc` @ HEAD — v1.7 P-list shipped (P1-P8)

## What just landed

- **P8 — Backend→Service rename** — all types/fields/imports renamed. 60+ files.
- **OutputClient unification** — `runRealModePipeline` + `runEmulatorLifecycle` collapsed into a single `runPipeline` that uses `selectOutputClient({emulator, device, intervalMs?})`. New `packages/cli/src/cli/commands/output-client/{types,real,emulator,index}.ts`. `emulator-mode.ts` slimmed to helpers only (`buildDeckConfigMessage`, `spawnFrontendVite`, `spawnEmulatorVite`, `killChild`, `resolveFrontendCwd`, `resolveEmulatorCwd`, `findWorkspaceRoot`, `AddonFrontendRef`). `real-mode.ts` deleted. Emulator mode now starts system providers too (latent gap closed).
- 284 unrelated dirty files left in the working tree (pre-existing in-progress work from `feat/human-changes` merge `74b342fd`). **Don't touch them** unless explicitly asked.

## What just landed (this commit)

- `.planning/research/{STACK,FEATURES,PITFALLS,SUMMARY}.md` — lean mirrors of the architecture doc.
- `.planning/research/ARCHITECTURE.md` — copy of the root doc so this dir is self-contained.
- `.planning/PROJECT.md` — project description, scope guardrails, success criteria.
- `.planning/ROADMAP.md` — v1.7 P-list with audit items + open questions.
- `.planning/STATE.md` — this file.
- `.planning/DECISIONS.md` — locked decisions from the architecture-doc Q&A.
- `.planning/AGENTS.md` — lean learnship-aware workflow rules.
- `.planning/solutions/` — empty skeleton for `/compound` outputs.

## What just landed (uniform gesture stream)

- `key-event` WS message replaces `button-action` for the client→server path.
  Frontend uses `onPointerDown` / `onPointerUp` (+ `setPointerCapture`); emulator
  and frontend share the same wire format.
- `EmulatorOutputClient` runs `createGestureDetector` (mirrors `RealOutputClient`).
  Both forward the resulting gesture to `runtime.dispatchGesture`.
- `HOLD_ACTION_DELAY_MS` and `DOUBLE_TAP_DELAY_MS` collapse to 200ms.
- Latent dbl-tap callback bug in `core/gesture-state.ts` fixed (drove the
  pre-existing test gap that was masked by 500ms constants).
- `PROTOCOL_VERSION` stays at 1; `key-event` is additive, no version bump.
- Outer `ButtonFrame` flash dropped for emulator (intentional — see §7.2).

## What just landed (per-transport gesture detectors — supersedes the prior entry)

- **Reverted** the prior `key-event` model. The wire format is now gesture-only
  (`button-action`); raw `down`/`up` events never cross the bridge.
- **Emulator SPA** (`packages/cli/emulator/src/gesture.ts`) owns its own
  per-key gesture detector, importing the shared constants from
  `core/gesture-state.ts`. Final gestures are sent as `button-action`.
- **Real hardware** — `RealOutputClient` runs `createGestureDetector` on
  `device.onKeyEvent(...)` and dispatches directly. No WS involvement.
- **Backend `EmulatorOutputClient`** is now a thin pass-through: looks up the
  button by position and calls `runtime.dispatchGesture`. No detection logic.
- **Chrome SPA** (`packages/cli/frontend/`) cleaned: no `sendButtonAction`, no
  `onClick → tap`, no `gestures` prop, no `button-action` incoming handler. It
  only subscribes to `runtime:gesture:*` via `useAddonChannel`. Pure display.
- **Constants stay** at `HOLD_ACTION_DELAY_MS = 200`, `DOUBLE_TAP_DELAY_MS = 200`,
  imported by both transports. The dbl-tap `onGesture` callback fix from the
  prior entry stays (real bug, still applies).
- **Decoupling rule** added to `ARCHITECTURE.md §7.4`.

## Working tree

```
$ git status --short | wc -l
284 (untouched, pre-existing)
```

## Next

v1.7 complete. Next: user decides v1.8 scope.

## Milestone History

### v1.7 — Polish & 3rd-Party Fixtures

Completed: 2026-07-08
P-items: P1 (React Router), P2 (gestureHandlers), P4 (default main deck + n-1 injection), P5 (internal? flag), P6 (SplitActionSurface), P8 (Backend→Service rename)
Key achievements: All v1.7 P-items shipped and verified. Milestone audit passed. Zero new stubs or integration gaps.

## Pre-existing known issues (do NOT touch without forensics)

- **79 failures in `packages/cli/src/deck/runtime.test.ts`** — Phase 42/67 system-back-injection firing in test contexts. Pre-dates Phase 71. Flagged for future forensics.

## Recently shipped (for context, not for editing)

- **P8 — Backend→Service rename** — all types/fields/imports. 60+ files. 28/28 tests pass.
- **P6 — SplitActionSurface on n-1** — already delivered by P4 (computeSystemButtonForSlotN1).
- **P5 — internal? on AddonDeckDefinition** — registry skips internal decks. 88/88 tests pass.
- **P4 — default main deck, n-1 injection, addon auto-register** — 3 commits. 69/69 tests pass.
- **P2 — gestureHandlers default-deny** (`38dc601b`) — api.ts + registry.ts + addon-handler-bridge.ts + virtual-modules.ts + Deck.tsx. 9 builtins audited. 9/9 + 13/13 tests pass. 0 lint errors.
- **P1 — React Router in frontend** (`74d9dc59`) — service-driven nav, BrowserRouter, URL projection. 2 vitest cases added.
- **Phase 75-01** — `value-display` first-party addon (1-3 values cap, parallel `Promise.all` polling). 8/8 tests pass.
- **Phase 74-01** — `system-status-label-values` metrics capped at 1-2; 3+ rejected with hint to use `value-display`. 7/7 tests pass.
- **Phase 73-01/02** — pasteText now writes to clipboard AND sends Ctrl+V/Cmd+V; key-macro providers throw on failure (caught + shown as runtime button error). 4/4 + 19/19 tests pass.
- **Phase 72-01/02/03** — icon fallback chain for `OverlayToggleButton` and SplitActionSurface; gap-closure docs. 6/6 + 14/14 tests pass. (1 deferred test — visual fix only.)
- **Phase 71-01/02** — `dispatchGestureEnd` refactor + system back button fix. 6/6 gesture-state tests pass; runtime.test.ts baseline unchanged.
