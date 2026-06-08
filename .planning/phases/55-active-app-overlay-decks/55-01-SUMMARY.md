# Plan 55-01 Summary: process_names schema + OS-abstracted active-app provider + monitor

**Completed:** 2026-06-08

## What was built

- **`packages/cli/src/system/active-app/`** — a new module that abstracts the per-platform foreground-window polling behind a single `ActiveAppProvider` interface. Four implementations: `linux` (uses `get-windows`, detects pure Wayland), `darwin` (uses `get-windows` with permission prompts disabled), `windows` (uses `get-windows`), and `unsupported` (stub with `supportsActiveApp: false` and once-only warning). A `getActiveAppProvider()` factory selects based on `process.platform`.
- **`process_names?: readonly string[]`** added to `AddonGeneratedDeck` and `DeckConfig`, validated as `z.array(z.string().min(1)).optional()` in the schema. Carries through both the user-deck expansion path and the addon-generated-deck path. `SIRENO_ADDON_API_VERSION` stays 1.
- **`get-windows` ^9.3.0** installed as a regular `dependency` (not `optionalDependencies`). The OS abstraction means unsupported platforms just log + disable; we don't need a soft dep.
- **`ActiveAppMonitor` + `createActiveAppMonitorDouble`** — the monitor wraps any provider, the double is a test seam that emits synthetic snapshots.

## Key files

- `packages/cli/src/system/active-app/provider.ts` — `ActiveAppProvider`, `ActiveAppSnapshot`, `LoggerLike` types
- `packages/cli/src/system/active-app/unsupported.ts` — stub provider; logs ONCE per instance, emits null on start
- `packages/cli/src/system/active-app/linux.ts` — `get-windows` poller with Wayland detection
- `packages/cli/src/system/active-app/darwin.ts` — `get-windows` poller, permission prompts off
- `packages/cli/src/system/active-app/windows.ts` — `get-windows` poller
- `packages/cli/src/system/active-app/index.ts` — `getActiveAppProvider()` factory
- `packages/cli/src/system/active-app/active-app-monitor.ts` — wrapper + test double
- `packages/cli/src/addon/api.ts` — `AddonGeneratedDeck.process_names?` added
- `packages/cli/src/core/schemas.ts` — `RawDeckSchema`, `DeckConfig` updated; field flows through both the user-deck expansion (line 463-475) AND the final reconstruction (line 626-639)

## Decisions made

- **`get-windows` is a regular dep, not optional** — the user said "no optional, but remember this must be os independent". The factory + per-platform files give us OS independence without soft-dep trickery. On unsupported platforms (pure Wayland, unknown OS, missing binary), the runtime gets an `unsupported` provider that gracefully no-ops.
- **Provider selection uses `env` parameter for testability** — `createLinuxProvider(deps, env = process.env)` so tests can simulate pure Wayland without mutating global state.
- **Dynamic `await import('get-windows')` inside `start()`** — avoids loading the native module at import time, so test runs in unsupported environments (like our CI on Linux without the binary built) don't crash.
- **Dedup happens in the provider AND in the double** — the per-platform provider dedupes by `ownerName` (avoids calling `get-windows` on every tick); the test double also dedupes (so tests can emit raw snapshots without worrying about duplicates).
- **`active-app-monitor` exposes `setOnChange` on the double** — the real monitor passes `onChange` to the provider at construction time. The double needs late-binding so tests can construct the double, set the listener, then start emitting. Mirrors how `createSessionMonitorDouble` works.

## Tests

- `src/core/schemas.test.ts`: 3 new tests (preserves process_names, backwards-compat, rejects empty) — 8/8 total pass
- `src/system/active-app/get-provider.test.ts`: 7 tests (darwin, win32, linux normal, linux pure Wayland, linux XWayland, unknown platform, once-only warning) — 7/7 pass
- `src/system/active-app/active-app-monitor.test.ts`: 8 tests (provider passthrough, initial snapshot, dedup, null transitions, counters) — 8/8 pass

## Notes for downstream

- `get-windows` install script was blocked by pnpm's default safety policy. We need to add it to `pnpm.onlyBuiltDependencies` OR ship prebuilt binaries via a script. For dev on Linux without the binary, the import would fail at runtime — handled by the `try/catch` in each provider (logs warning, keeps polling). The `unsupported` provider path is the test-friendly fallback.
- For 55-02: the runtime needs to:
  1. Accept `activeAppMonitor: ActiveAppMonitor` in its options
  2. Maintain `overlayDeckId: string | null` state
  3. Subscribe to the monitor in `runtime.start()`, unsubscribe in `runtime.stop()`
  4. On snapshot change → match against addon-declared decks → push/dismiss overlay
  5. Expose `dismissOverlay()` method
  6. Add `processNamesMatch(declared, active, platform)` helper
  7. Implement 350ms double-tap detection on back actions
  8. New reserved-slot button type `overlay-toggle` for the dismiss action
- The actual addon-deck API for declaring process names is `AddonGeneratedDeck.process_names`. The runtime needs an `addonRegistry.listDecks()` or similar method to enumerate them. Discover during 55-02.
