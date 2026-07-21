# Quick Task 005 Summary

**Task:** UAT bug fixes — bitmap icons disappear on overlay change, n-1 shows back on overlay root, chrome overlay icons show error, CLI false-negatives on ydotool/wtype detection.
**Completed:** 2026-07-21

## What was done

1. **Bug 1 — Icons disappear on overlay change.** Root cause: `setupAddonServices` broadcast handlers (`runtime:activeDeck`, `runtime:overlay-available`) were calling `buildDeckConfigMessage(deck, addonByType, {}, …)` with empty `resolverOptions`. For relative paths like `./assets/chrome.svg`, the empty options made `resolveIconSource` throw, and `resolveOne` silently returned the raw source to the frontend, which can't render it. Fixed by adding `resolverOptions: ReturnType<typeof buildResolverOptions>` to `SetupAddonServicesOptions`, destructuring it, and passing it into both `buildDeckConfigMessage` calls.

2. **Bug 2 — N-1 button is "back" on overlay root.** Root cause: `computeSystemButtonForSlotN1` returned `core:back` for any non-main deck, including the root of an overlay where "back" is a no-op. Changed the function to return `core:overlay-toggle` when `deck.isOverlay === true` (overrides the `core:back` fallback). Updated `handleSystemButton` in `runtime.ts` so `core:overlay-toggle` now handles `tap` AND `dbl-tap` (previously only `dbl-tap` toggled). Updated 3 tests + added 1 new test in `system-back-injection.test.ts`, plus updated the overlay-deck case in `emulator-mode-build-config.test.ts`.

3. **Bug 3 — Chrome overlay icons show error.** This is a manifestation of Bug 1 (the same broadcast handlers passed empty resolverOptions, so the chrome button on the main deck — `./assets/chrome.svg` — failed to resolve). Fixed by Bug 1's change.

4. **Bug 4 — CLI claims ydotool/wtype missing; chrome deck macros don't fire.**
   - Added optional `extraFsProbe?: (command: string) => boolean` to `RequirementsCheckDeps`. When `which` returns nothing, the fallback probe is consulted. Wired in `run.ts` with an `existsSync` check over `/usr/local/bin`, `/usr/bin`, `~/.local/bin`, `/snap/bin`, `/opt/homebrew/bin`. Tests: 2 new tests added (fallback success + `extraFsProbe=false` matches no-probe behavior); all 14 existing tests still pass.
   - Converted the user's `chrome:` deck in `config.yml` from raw `xdotool key X` actions to `type://X` macros (7 buttons: New Tab, Close Tab, Reopen Tab, New Window, Reload, Hard Reload, Dev Tools). Now these buttons route through the typed-macro pipeline instead of trying to spawn `xdotool` directly.

## Files changed

- `packages/cli/src/cli/commands/run.ts` — added `resolverOptions` to `SetupAddonServicesOptions`, replaced `{}` with `resolverOptions` in both broadcast handlers, added `extraFsProbe` wiring for requirements
- `packages/cli/src/deck/system-back-injection.ts` — overlay decks now inject `core:overlay-toggle`
- `packages/cli/src/deck/runtime.ts` — `core:overlay-toggle` handles `tap` gesture
- `packages/cli/src/deck/__tests__/system-back-injection.test.ts` — 3 tests updated, 1 test added
- `packages/cli/src/cli/commands/__tests__/emulator-mode-build-config.test.ts` — overlay deck n-1 assertion updated
- `packages/cli/src/system/requirements.ts` — added optional `extraFsProbe` fallback
- `packages/cli/src/system/__tests__/requirements.test.ts` — 2 tests added
- `config.yml` — chrome deck uses `type://` macros

## Commits

- `d9699e5d` fix(run): pass resolverOptions to overlay/active-deck broadcasts
- `95142b94` fix(deck): n-1 on overlay root becomes overlay-toggle (not back)
- `cd54374b` fix(requirements): fs fallback when PATH stripped; chrome deck uses type://
- `b2145485` test(build-config): overlay deck n-1 is now overlay-toggle, not back

## Test status

- All new tests pass (3 added: 1 in system-back-injection, 2 in requirements).
- Pre-existing test failures (30 tests / 12 files) unchanged — weather frontend, emoji selector, run.test mock, integration, addon, addon-core-lock, config.bootstrap, emoji-decks, weather-frontend, ws-integration. Documented in STATE.md and out of scope for this task.
- Full suite: `Test Files  12 failed | 102 passed (114)` / `Tests  30 failed | 987 passed (1017)`.