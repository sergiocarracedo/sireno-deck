# Plan 54-01 Summary

**Completed:** 2026-06-08

## What was built

The shared `@/ui/LogoVersion` element is extracted from `system-back-button.tsx` so both consumers (the existing system-back-button's isMainDeck branch and the upcoming core settings deck in plan 54-02) render the same surface. The main-deck reserved slot now renders a settings affordance (icon + "Settings" text) when a settings deck is configured, with backwards-compatible fallback to logo+version for old configs. The runtime wires the navigation through `methods.navigateToDeck('settings', { addToHistory: true })`.

## Key files

- `packages/cli/src/ui/LogoVersion.tsx` (NEW) — exports `<LogoVersion />` and named `LOGO_DATA_URL` / `CLI_VERSION` constants. Reads the logo PNG and `package.json` at module init via `readFileSync`.
- `packages/cli/src/ui/LogoVersion.test.tsx` (NEW) — 3 tests: logo image + version text rendered, data constants exported, className marker present.
- `packages/cli/src/deck/system-back-button.tsx` (MODIFY) — imports `LogoVersion` from `@/ui/LogoVersion`; removes the local `readFileSync` calls and constants. Adds `onNavigateToSettings?: () => void` to `SystemBackButtonProps`. The `isMainDeck` branch renders the settings affordance when the prop is provided, falls back to `<LogoVersion />` otherwise.
- `packages/cli/src/deck/system-back-button.test.tsx` (MODIFY) — updated the "Home" test to assert "sireno-logo-version" (the v1.4 "Home" string is gone; the new shape is logo+version OR settings). Added 2 new tests: settings affordance when prop provided, fallback to logo+version when not.
- `packages/cli/src/deck/runtime.ts` (MODIFY) — added `SETTINGS_DECK_ID = 'settings'` constant. The `SystemBackButton`'s `render` callback now receives `onNavigateToSettings` when the user is on the main deck AND a settings deck is configured. The callback calls `methods.navigateToDeck('settings', { addToHistory: true })`.

## Decisions made

- **Marker className `sireno-logo-version`**, not a `data-*` attribute. The `Text` component (per phase 51 learning) strips custom `data-*` attributes. ClassName survives the render pipeline.
- **The runtime checks `SETTINGS_DECK_ID in runtimeDecks` before wiring the prop.** If the user has no settings deck (old configs), the prop is `undefined` and the system-back-button falls back to `<LogoVersion />`. This is the backwards-compat path.
- **Navigation uses `methods.navigateToDeck(targetDeckId, { addToHistory: true })`.** This is the existing public seam in the runtime's `methods` object. No new public API.
- **The "Home" test was renamed** to "renders the logo+version element when isMainDeck is true and no onNavigateToSettings is provided" because the v1.4 "Home" string is no longer rendered (the new isMainDeck shape is logo+version OR settings affordance). The test still asserts the v1.4 fallback path.

## Notes for downstream

- Plan 54-02 (the next wave) consumes `<LogoVersion />` from `@/ui/LogoVersion` (the same import path). The settings deck's reserved-slot back button is the standard `isMainDeck: false` chevron+Back (already handled by the system-back-button injection).
- The `SETTINGS_DECK_ID` constant is now declared in `runtime.ts` and used in two places: (a) the `isMainDeck` check (line 919) to wire the `onNavigateToSettings` prop, (b) `createImplicitSettingsDeck` factory in plan 54-02 to inject the implicit settings deck. The constant is the single source of truth for the settings-deck ID.
- Pre-existing baseline failures in `runtime.test.ts` (44 tests) are unchanged. Verified via `git stash` + re-run + `git stash pop`. The settings navigation is wired for any runtime that has a settings deck; old configs without one still work (the prop is undefined → logo+version fallback).
