---
status: complete
phase: 37-partial-rerender-on-source-changes
source:
  - .planning/phases/37-partial-rerender-on-source-changes/37-01-SUMMARY.md
  - .planning/phases/37-partial-rerender-on-source-changes/37-02-SUMMARY.md
started: 2026-06-03T23:40:00+02:00
updated: 2026-06-03T23:55:00+02:00
---

## Current Test
number: 7
name: (none — all tests complete)
awaiting: user response

## Tests

### 7. reloadStylesheet stub implementation
result: skipped
reason: Stub implementation only, not exercising the path.

## Summary

total: 7
passed: 3
issues: 0
pending: 0
skipped: 4

## Current Test
number: 3
name: Addon source change triggers registry-diff path
expected: |
  When an addon TSX/JSX file in `addons/` changes:
  - The new `watchAddonSources` watcher fires (check: no "config reload failed" error, since it's addon-source-triggered)
  - `runtime.updateAddonRegistry()` is called
  - Non-structural change: `invalidateMountedStore()` is called → deck re-renders
  This test requires manually editing an addon source file while the daemon runs.
awaiting: user response

## Tests

### 1. Daemon starts with addon source watcher active
expected: |
  `pnpm cli:dev` (or `pnpm start --config config.yml`) starts without emitting any new errors related to the new watcher code.
  The console should show the normal startup sequence plus: no errors about `watchAddonSources`, no null pointer issues on startup.
  Run: `pnpm run cli:dev` (or `pnpm start --config config.yml` with emulator), let it boot for 3 seconds, confirm it connects to the Stream Deck or emulator, then Ctrl+C.
result: pass

### 2. Config reload still works (unchanged behavior)
expected: |
  Changing `config.yml` while the daemon is running triggers `reloadRuntime()` as before.
  No change to the config file watcher behavior — this is the baseline regression check.
result: pass

### 3. Addon source change triggers registry-diff path
expected: |
  When an addon TSX/JSX file in `addons/` changes:
  - The new `watchAddonSources` watcher fires (check: no "config reload failed" error, since it's addon-source-triggered)
  - `runtime.updateAddonRegistry()` is called
  - Non-structural change: `invalidateMountedStore()` is called → deck re-renders
  This test requires manually editing an addon source file while the daemon runs.
result: pass

### 4. CSS file change triggers immediate reloadStylesheet
expected: |
  When a CSS file in `addons/` changes:
  - The watcher detects `/\.(css)$/i` extension
  - `runtime.reloadStylesheet()` is called immediately (no 100ms debounce)
  - No deck re-render is triggered (no `invalidateMountedStore()` call)
result: pending

### 5. Structural change (add/remove button type) triggers requestFullReload
expected: |
  When a structural registry change is detected (button type added or removed):
  - A warn log appears: "addon registry structural change detected — full restart required for addon additions/removals"
  - `runtime.requestFullReload()` is called → triggers `reloadRuntime()`
result: pending

### 6. Cleanup on daemon shutdown
expected: |
  When the daemon shuts down (Ctrl+C or signal):
  - `stopWatchingAddons()` is called
  - The fs watcher is closed
result: pending

### 7. reloadStylesheet stub implementation
expected: |
  `runtime.reloadStylesheet()` iterates over `mountedDeckHosts` and calls `host.reloadStylesheet()` on each.
  Check: `packages/cli/src/deck/runtime.ts` — `reloadStylesheet()` method calls `host.reloadStylesheet()` on each mounted host.
  Note: This is a stub; actual browser transport message passing needs follow-up.
result: pending

## Summary

total: 7
passed: 3
issues: 0
pending: 4
skipped: 0

## Gaps

[none yet]