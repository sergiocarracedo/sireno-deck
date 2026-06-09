---
status: testing
phase: 55-active-app-overlay-decks
source:
  - .planning/phases/55-active-app-overlay-decks/55-01-SUMMARY.md
  - .planning/phases/55-active-app-overlay-decks/55-02-SUMMARY.md
started: 2026-06-09
updated: 2026-06-09
---

## Current Test
number: 1
name: Typecheck and lint pass for phase 55 changes
expected: |
  `pnpm --filter sireno-deck-cli exec tsc --noEmit` reports no new errors
  introduced by phase 55.
  `pnpm exec oxlint packages/cli/src/deck packages/cli/src/core packages/cli/src/cli/commands/start.ts` reports no errors.
awaiting: user response

## Tests

### 1. Typecheck and lint pass for phase 55 changes
expected: |
  - `cd /works/opensource/sireno-deck && pnpm --filter sireno-deck-cli exec tsc --noEmit` reports no new errors.
  - The pre-existing WIP errors from phase 17/18 (reconciler.ts, IconLabelSurface, runtime.test.ts untracked) and the pre-existing system-back-injection.test.ts failures are NOT expected to be resolved by this phase.
  - `pnpm exec oxlint packages/cli/src/deck packages/cli/src/core packages/cli/src/cli/commands/start.ts` reports no errors.
result: pass
verified_by: automated (run 2026-06-09)
notes: |
  tsc --noEmit shows only pre-existing WIP errors (reconciler.ts,
  IconLabelSurface, toggle.tsx, change-deck.tsx, brightness, registry.test).
  No new errors touch phase 55 files (system/, deck/system-buttons/,
  deck/runtime.ts, deck/__tests__/).
  oxlint reports only unused-import warnings in unrelated files
  (settings-deck.test.tsx, schemas.test.ts).

### 2. Unit tests for the dispatcher and id-priority shadowing pass
expected: |
  - `pnpm --filter sireno-deck-cli test src/deck/__tests__/system-buttons-dispatcher.test.ts src/deck/__tests__/internal-decks.test.ts` — all green.
  - The 4 dispatcher tests (main→system-settings, non-main→system-back, overlay→overlay-toggle, main-without-settings→null) pass.
  - The 3 id-priority tests (user-settings shadowed, user-locked-deck override, internal locked-deck fallback) pass.
result: pass
verified_by: automated (run 2026-06-09)
notes: |
  7/7 tests pass:
  - system-buttons-dispatcher.test.ts: 4 tests (settings, back, overlay, null)
  - internal-decks.test.ts: 3 tests (id-priority + locked-deck fallback)

### 3. Schema test: user-declared `system: true` is dropped
expected: |
  - `pnpm --filter sireno-deck-cli test src/core/schemas.test.ts` — the test `drops a user-declared system: true from the deck (no user opt-in)` passes.
result: pass
verified_by: automated (run 2026-06-09)
notes: |
  7/7 schemas tests pass, including the user-YAML `system: true` drop
  and `process_names` preservation tests.

### 4. Active-app provider dispatches platform-correctly
expected: |
  - `pnpm --filter sireno-deck-cli test src/system/active-app` — all green (get-provider + monitor tests).
result: pass
verified_by: automated (run 2026-06-09)
notes: |
  18/18 active-app tests pass: get-provider (platform dispatch, pure-Wayland
  warn-once, X11/XWayland, unknown platform), active-app-monitor
  (start/stop, change events, double lifecycle), and the new linux
  failure-cap tests (3 cases — intermittent recovery, 5-strike cap,
  successful poll).

### 5. Boot log announces active-app support at startup
expected: |
  - On a Linux X11/XWayland host, `pnpm --filter sireno-deck-cli start` (or `node -e "..."` against the runtime) logs a single info-level line containing `'active-app overlay enabled'` at boot.
  - On a pure-Wayland host, the same path logs `'active-app overlay unsupported on this platform'` instead.
  - The log appears once, not on every snapshot.
result: pass
verified_by: user (hardware test, 2026-06-09)
notes: |
  After the fix in 206c4a2 (poller stops after 5 consecutive failures on
  a host where the daemon's process env is stripped of session vars),
  the user restarted on pure-Wayland and confirmed the poller now
  disables cleanly after the threshold.

### 6. Main-deck reserved slot shows Settings entry button
expected: |
  - On a fresh `createDeckRuntime` with `keyCount: 15` and default config, `getActiveDeck().buttons[14].type === 'system-settings'`.
  - Tapping slot 14 navigates to the `settings` deck.
result: pending

### 7. Settings deck reserved slot shows Back button
expected: |
  - After navigating to the `settings` deck, `getActiveDeck().buttons[14].type === 'system-back'`.
  - Tapping slot 14 pops back to the main deck.
result: pending

### 8. Hold-back from settings while an overlay is active dismisses the overlay
expected: |
  - Drive `handleActiveAppChange` (via `createActiveAppMonitorDouble.emit(...)`) with a snapshot matching a user deck that has `process_names: ['chrome']`.
  - Verify the active display deck is now the overlay deck.
  - Navigate to `settings` (via the system-settings button on main).
  - Hold slot 14 — verify the overlay is dismissed and the display deck is back to settings.
result: pending

### 9. Double-tap on system-back dismisses the overlay
expected: |
  - Set up an active overlay (as in test 8).
  - On a non-main, non-settings base deck, tap the reserved slot twice within 350 ms.
  - Verify the overlay is dismissed and the base deck is restored.
result: pending

### 10. Auto-dismiss on process change
expected: |
  - With an overlay active for process `chrome`, emit a snapshot for process `vscode` (or null).
  - Verify the overlay is dismissed and the base deck is shown.
result: pending

### 11. Pure Wayland: unsupported provider warns once
expected: |
  - Construct a runtime with `XDG_SESSION_TYPE=wayland`, `WAYLAND_DISPLAY` unset.
  - Start the active-app monitor.
  - Verify the logger receives exactly one `'active-app: not supported on this platform'` warning.
  - Verify `provider.supportsActiveApp === false`.
result: pending

### 12. API version stays at 1 (backwards-compatible manifest extension)
expected: |
  - `grep SIRENO_ADDON_API_VERSION packages/cli/src/addon/api.ts` returns `= 1`.
  - Existing addon manifests without `process_names` continue to parse.
result: pending

## Summary
total: 12
passed: 5
issues: 0
pending: 7
skipped: 0

## Gaps
[none yet]
