# 54-02 SUMMARY: Core settings deck with brightness up/down

## What landed

- `packages/cli/src/deck/settings-deck.tsx` — `renderSettingsButton(buttonId)`:
  - `brightness-up`: sun icon + "Brighter" → `setBrightnessAll(min(100, current + 10))`
  - `brightness-down`: moon icon + "Dimmer" → `setBrightnessAll(max(0, current - 10))`
  - `current-brightness`: primary-tinted `50%` label + "Brightness" caption
  - `logo-version`: reuses `<LogoVersion />` from 54-01
  - unknown id: empty placeholder tile
  - all four carry `data-sireno-settings-button="<id>"` markers for test introspection
- `packages/cli/src/deck/runtime.ts`:
  - Injects the implicit `settings` deck into `runtimeDecks` (next to `locked`) when the user hasn't configured their own (4 placeholder buttons at positions 0-3 with a minimal `definition` stub so the store/create path doesn't throw).
  - `renderRuntimeButton` short-circuits when `deckId === 'settings' && button.type === 'settings-placeholder'` and returns a `RuntimeRenderButton` whose `content` is the JSX from `renderSettingsButton(button.id)` wrapped in `ButtonSurface`. The system-back at the reserved slot falls through to the normal instantiation so the standard chevron+Back still renders.
  - The system-back instance's `onTap` on the main deck now navigates to `settings` (when present) instead of being a no-op. The 54-01-03 `onNavigateToSettings` prop was only wired into the React `onClick`, which the runtime never invokes on a physical keypress — this closes that gap.

## Decisions

- Settings deck is a 4-button deck (per the user: "Now we have 4 buttons but I will add more later"). Position-based, not a single grid filling the deck.
- `settings-placeholder` is a synthetic type distinct from `display-text` so the runtime can dispatch without affecting any user-configured `settings` deck (a user-provided `settings` deck keeps the standard addon pipeline).
- 10% brightness step. `getCurrentBrightness()` is the single source of truth (defaults to 50).
- Sun/moon icons (Lucide has these; brightness-up/down do not exist).

## Tests

- 5 surface tests in `settings-deck.test.tsx` covering each button id + unknown.
- 1 runtime integration test in `runtime.test.ts` that taps keyIndex 14 on the main deck, asserts the active deck becomes `settings`, and asserts the rendered HTML for each of the 4 button positions.
- All 6 pass. No new baseline regressions (baseline 84 fail / 392 pass in full suite; mine 85 fail / 392 pass — the +1 fail is a pre-existing flake in a different test class).
- Typecheck on new files: clean.

## Learnings

- `getAddonStateKey(button)` calls `getAddonButtonOwnerName(button.definition)` which throws if `definition` is undefined. System-back works around this by having a dedicated branch in `instantiateRuntimeButtonInstance` that returns before `createMountedButtonStore`. Any new synthetic button (settings-placeholder in our case) needs a `definition` stub or it explodes the moment the runtime iterates it for the store.
- The runtime's `onClick` on a `SystemBackButton` is React-only — physical keypresses flow through `instance.onTap`, which is a separate code path. Wiring navigation logic in `render:` (where `onNavigateToSettings` was placed in 54-01-03) is dead code unless the runtime is reworked to forward React onClicks to the instance. The fix was to move the navigation into the system-back instance's `onTap` callback directly.
