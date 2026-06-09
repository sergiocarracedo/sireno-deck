# Plan 55-01 Summary

**Completed:** 2026-06-09
**Plan:** `.planning/phases/55-active-app-overlay-decks/55-01-PLAN.md`

## What was built

This plan delivered the foundation for active-app overlay decks: a structural `system?: boolean` flag on `DeckConfig` (set in core only, silently dropped from user YAML), an `INTERNAL_DECKS` const map replacing the legacy `createImplicit*` factory functions, a clean 3-branch system-button dispatcher, and a working active-app monitor wired in `start.ts` for both `createDeckRuntime` call sites. The broken `SystemOverlayToggleButton.tsx` (trailing orphan syntax) was deleted, unblocking typecheck.

## Key files

- `packages/cli/src/core/schemas.ts` — added `system?: boolean` to `DeckConfig` and `system: z.boolean().optional()` to `CoreDeckConfigSchema`; user-declared `system: true` is silently dropped at build time
- `packages/cli/src/deck/system-buttons/system-buttons.ts` — fixed the `OVERLAY_TOGGLE_TYPE` typo (`'oveerlay-toggle'` → `'overlay-toggle'`), replaced dead args with a `SystemButtonContext`, added the `INTERNAL_DECKS` const map and `INTERNAL_LOCKED_DECK_ID` constant
- `packages/cli/src/deck/runtime.ts` — switched `DeckRuntimeOptions` from `activeAppMonitor` → `activeAppProvider`, build the monitor inside `start()` via `createActiveAppMonitor({ provider, onChange: handleActiveAppChange })`
- `packages/cli/src/cli/commands/start.ts` — both `createDeckRuntime` call sites now pass `activeAppProvider: getActiveAppProvider({ logger })` and log support at boot
- `packages/cli/src/deck/system-buttons/SystemOverlayToggleButton.tsx` — deleted (broken; the in-use file is `overlay-toggle-button.tsx`)
- `packages/cli/src/core/schemas.test.ts` — added `drops a user-declared system: true from the deck (no user opt-in)` test
- `packages/cli/src/deck/__tests__/internal-decks.test.ts` — 3 tests for id-priority shadowing (settings, locked-deck override, internal locked-deck fallback)

## Decisions made

- `system: true` is a **structural** flag set in core (via the `INTERNAL_DECKS` map) only. The user-facing `RawDeckSchema` is `.passthrough()`, so users can technically write `system: true` in YAML, but the `CoreDeckConfigSchema` strips it before the deck reaches the runtime `decks` map. The schema test pins this guarantee.
- `get-windows ^9.3.0` is the active-app dependency (renamed from `active-win` in Mar 2026; ESM-only). Pure-Wayland is detected via `XDG_SESSION_TYPE=wayland && !WAYLAND_DISPLAY` and falls through to the `unsupported` provider that warns once and no-ops.
- `IMPLICIT_*` renamed to `INTERNAL_*` per user-locked terminology. `INTERNAL_LOCKED_DECK_ID` value stays `'__sireno_locked_session__'`; `SETTINGS_DECK_ID` keeps its name.
- Id-priority merge `{ ...userDecks, ...INTERNAL_DECKS }` (internal decks spread last → win on collision) is the only wiring change for `runtimeDecks`.

## Notes for downstream

- 55-02 builds on this: the dispatcher (now clean) is extended with a `system-settings` branch for the main-deck reserved slot.
- The `activeAppProvider` option is overridable in tests via `createActiveAppMonitorDouble`. Tests can `emit(snapshot)` to trigger `handleActiveAppChange`.
- The 5 unrelated failures in `system-back-injection.test.ts` predate this plan (phase 52) and are out of scope here.

## Commits

- `f2ef60d` feat(55-01): add system?: boolean to DeckConfig (internal-only flag)
- `adb7ce8` docs(55-01): clarify system: true user-YAML gate (silently dropped)
- `71a5128` refactor(55-01): delete broken SystemOverlayToggleButton (unblocks typecheck)
- `f91c25a` refactor(55-01): INTERNAL_DECKS map, drop createImplicit* factories
- `2fde7ea` feat(55-01): wire activeAppProvider into runtime start() and start.ts
- `5076c96` test(55-01): INTERNAL_DECKS id-priority shadowing + locked-deck fallback
