# Phase 54 Research — Settings deck with brightness controls

**Phase:** 54 — Settings deck with brightness controls
**Researched:** 2026-06-08
**Confidence:** HIGH (the design surface is well-understood, the existing seams are clear, no new external dependencies)

## Don't Hand-Roll

- **Logo+version as a shared `@/ui/LogoVersion` element.** The data (PNG base64 + version string) is already loaded at module init in `system-back-button.tsx` (lines 8-17). Extracting into a single shared element is a small, contained refactor. Both consumers (system-back-button's `isMainDeck` branch and the new core-managed settings deck) get the same surface. No new dependency; just move the existing `readFileSync` calls and the JSX.
- **Settings deck as a core-managed deck, not a built-in addon.** The v1.5 prompt frames the settings deck as the new home for logo+version, replacing the v1.4 main-deck reserved-slot behavior. This is a core-deck-system concern (it touches the main deck's reserved slot, the runtime's deck-controller stack, and the `isMainDeck` render branch in `system-back-button.tsx`). The existing pattern is `IMPLICIT_LOCKED_DECK_ID` (a core-managed deck injected into the `runtimeDecks` map at `runtime.ts:295`). The settings deck follows the same pattern with a `SETTINGS_DECK_ID` constant.
- **Standard back button on the settings deck.** The system-back-button injection at `runtime.ts:914` handles `goBack()` automatically for non-main decks. No special-casing needed.
- **`setBrightnessAll(percentage)` for the up/down buttons.** Phase 53 ships this. The settings deck's onTap handlers compute the next percentage and call it. No new device-layer code.
- **Reuse the runtime's `methods` (`getActiveDeckId`, `navigateToDeck`, `goBack`) for the main-deck settings button.** The main-deck reserved-slot button is now a `navigateToDeck({ addToHistory: true })` call. The runtime's `methods` object already exposes this; the system-back-button can call into it.

## Common Pitfalls

- **Forgetting to inject the settings deck into the runtime's deck map.** If the settings deck is defined in `createDeckRuntime` but not added to the `runtimeDecks` object, the `navigateToDeck` call from the main-deck settings button will throw `DeckNavigationError('Deck settings is not defined')`. The settings deck must be in `runtimeDecks` at `runtime.ts:295` BEFORE the controller is created. **Mitigation:** the deck is always added to `runtimeDecks` (with a flag like `enableSettingsDeck: true` defaulting to true). If a user explicitly opts out, the main-deck settings button falls back to logo+version.
- **The settings deck's brightness state is global (across the runtime), not per-button.** The "current percentage" lives in the device registry (the `lastBrightness` from phase 53), not in the button's local store. The settings deck's render reads from the registry, not from a per-button store. This avoids the question of "which button's percentage wins" when multiple buttons exist. **Mitigation:** the settings deck imports `setBrightnessAll` (writes) and reads the current value from a new `getCurrentBrightness()` helper (or the existing `lastBrightness` from a query of the registry).
- **The main-deck reserved-slot is no longer "always logo+version".** This is the deliberate breaking change from v1.4. **Mitigation:** the 54-CONTEXT decision is to unconditionally replace the main-deck reserved slot with a settings button. Backwards-compat: if the user has no `settings` deck in their config (old configs), the main-deck reserved slot falls back to logo+version. The runtime ensures a default `settings` deck exists.
- **The settings affordance (icon + "Settings" text) is a new render branch in `system-back-button.tsx`.** The current `isMainDeck` branch renders logo+version directly. We add a `hasSettingsDeck` prop (or similar); when true, render the settings affordance; when false, fall back to logo+version.
- **The 10% step clamps at 0 and 100.** Brightness-down from 0 is a no-op (stays at 0); brightness-up from 100 is a no-op. The buttons can show their disabled state OR just be no-ops with visual feedback (label stays at 0% / 100%). Simpler: no-ops, label updates. (Future phase can add disabled visual state.)
- **The `navigateToDeck` method is on the runtime's `methods` object.** The system-back-button doesn't currently have access to `methods`; it gets only `props.isMainDeck` and `props.backIconOverride`. The render branch for the settings button needs `methods.navigateToDeck`. **Mitigation:** add an optional `onNavigateToSettings?: () => void` prop to `SystemBackButton`; the runtime passes a callback that calls `methods.navigateToDeck`.

## Existing Patterns in This Codebase

- **Core-managed decks** (`packages/cli/src/deck/runtime.ts:295`) — the runtime injects `IMPLICIT_LOCKED_DECK_ID` (line 220) into the `runtimeDecks` object. The settings deck follows the same pattern: a `SETTINGS_DECK_ID` constant + a `createImplicitSettingsDeck()` factory. The factory's deck has the right number of buttons for the keyCount.
- **Deck stack** — `createDeckController({ decks, mainDeckId })` at `runtime.ts:299`. The main deck is the root; the locked deck is a sibling. The settings deck is also a sibling, reachable from the main deck via `navigateToDeck('settings', { push: true })`.
- **`isMainDeck` render branch** (`runtime.ts:919`) — passes `isMainDeck: deckId === options.deck.id` to `SystemBackButton`. The current `isMainDeck: true` branch renders logo+version. We add a `hasSettingsDeck` prop and a new sub-branch for the settings affordance.
- **`methods` object** (`runtime.ts:1222` or similar — the `RuntimeMountedButtonMethods` interface) — the system-back-button's `onTap` and `onHold` already have access to `props.methods` via the button pipeline. The runtime's `methods` object includes `navigateToDeck`, `goBack`, `getActiveDeckId`, etc.
- **`setBrightnessAll`** (`packages/cli/src/device/registry.ts`) — phase 53. Returns `{ succeeded, failed, errors }`. The settings deck's onTap handlers call this directly. The settings deck doesn't need to render the result inline; the device registry is best-effort and the user gets the visual feedback of the percentage label changing.
- **The brightness button (phase 53)** is a separate concern — a standalone `brightness` button type. The settings deck has its own up/down affordance and doesn't consume the standalone button.

## Recommended Approach

### File-level changes

1. **`packages/cli/src/ui/LogoVersion.tsx` (NEW)** — the shared logo+version element. Reads `logo72x72.png` and `package.json` at module init (same `readFileSync` pattern as `system-back-button.tsx`). Exports a default `<LogoVersion />` element and named `LOGO_DATA_URL` + `CLI_VERSION` for tests.
2. **`packages/cli/src/ui/LogoVersion.test.tsx` (NEW)** — surface test: asserts the rendered HTML contains the data URL and the version string.
3. **`packages/cli/src/deck/system-back-button.tsx` (MODIFY)** — import `LogoVersion` from `@/ui/LogoVersion`. Replace the inline `<img>` + `<Text>v{CLI_VERSION}</Text>` with `<LogoVersion />`. Add a new sub-branch for the settings affordance: when `isMainDeck: true && onNavigateToSettings` is provided, render a settings icon + "Settings" text button; otherwise fall back to logo+version.
4. **`packages/cli/src/deck/runtime.ts` (MODIFY)** — the `SystemBackButton` instance at the reserved slot now receives an `onNavigateToSettings` prop. When the user is on the main deck AND a settings deck is configured, the button is a settings affordance. The runtime passes a callback that calls `methods.navigateToDeck('settings', { addToHistory: true })` (or the existing `methods` API; whichever is the actual seam — discover during planning).
5. **`packages/cli/src/deck/runtime.ts` (MODIFY)** — add a `SETTINGS_DECK_ID` constant and a `createImplicitSettingsDeck()` factory (analogous to `createImplicitLockedDeck` at `runtime.ts:210`). Inject the settings deck into the `runtimeDecks` object at line 295. The settings deck has 6 buttons: brightness-up, brightness-down, current-brightness-label, logo+version, [2 more for visual balance], [reserved slot for back button].
6. **`packages/cli/src/deck/settings-deck.tsx` (NEW)** — the core-managed settings deck's render function. Takes a host context + the device-registry brightness getter/setter. Renders the 6 buttons. The onTap handlers call `setBrightnessAll(percentage)` with the next 10% value.
7. **`packages/cli/src/deck/settings-deck.test.ts` (NEW)** — render + tap behavior tests.

### Wave plan (vertical slices)

- **Plan 54-01 (wave 1):** Core extraction — `LogoVersion` to `@/ui/LogoVersion`; refactor `system-back-button.tsx` to import it; add the settings affordance to the main-deck branch; runtime passes `onNavigateToSettings`. Tracer bullet: the main-deck reserved slot now shows a "Settings" affordance (icon + text) that navigates to the `settings` deck.
- **Plan 54-02 (wave 2, depends on 54-01):** Settings deck — core-managed deck with brightness up/down + current-brightness-label + logo+version + back-button reserved slot. Render and tap behavior. Tracer bullet: tap brightness-up → 10% step → `setBrightnessAll` called with new value; the on-screen label updates.

### Vertical slice integrity

- 54-01 is independently demoable: the main-deck reserved slot shows the settings affordance and the runtime navigates to the settings deck on tap. (The settings deck may not exist yet, but the navigation wiring is in place.)
- 54-02 is independently demoable: the settings deck renders, the up/down buttons work, the logo+version is visible, the back button is the standard chevron+Back. (The main-deck settings button from 54-01 is the entry point, but 54-02 is testable in isolation via direct render + tap on the settings-deck buttons.)

### Build order

1. Extract `LogoVersion` to `@/ui/LogoVersion`. (Wave 1, task 1.)
2. Refactor `system-back-button.tsx` to import `LogoVersion`. (Wave 1, task 2.)
3. Add the settings affordance to the main-deck branch in `system-back-button.tsx`. (Wave 1, task 3.)
4. Runtime wires `onNavigateToSettings` callback to the system-back-button. (Wave 1, task 4.)
5. Create `createImplicitSettingsDeck()` factory and inject into `runtimeDecks`. (Wave 2, task 1.)
6. Settings deck render function (with up/down buttons, label, logo+version, back button). (Wave 2, task 2.)
7. Settings deck tests. (Wave 2, task 3.)

## Open Considerations (not blocking, capture in plan)

- **Discovered seam for the `navigateToDeck` API.** The runtime's `methods` object is the public seam, but the system-back-button's render branch needs to call it. The simplest approach: pass a `onNavigateToSettings: () => void` prop from the runtime to the system-back-button, similar to how `backIconOverride` is passed. Discover the exact `methods.navigateToDeck` API during planning.
- **Settings deck keyCount.** The implicit locked deck has 5 time-tile buttons. The settings deck needs to fit the user's keyCount (default 15). The buttons layout: brightness-up, brightness-down, current-brightness-label, logo+version, [2 visual balance], [reserved slot] — 7 slots. If keyCount is 6, drop the visual balance buttons. The default keyCount is 15, so 7 buttons is fine.
- **State for the current brightness percentage.** Two options: (a) the settings deck reads from the device registry (the `lastBrightness` from phase 53); (b) the settings deck tracks its own local state. Option (a) is more honest (the registry is the source of truth); option (b) is simpler. **Recommendation:** option (a), with a new `getCurrentBrightness()` helper in the registry. If a new device registers, the percentage resets to a sane default (50%); the user just adjusts from there.

## References

- 54-CONTEXT.md (locked decisions)
- `packages/cli/src/deck/system-back-button.tsx` (the data reads; the `isMainDeck` render branch; the back-button branch)
- `packages/cli/src/deck/runtime.ts:155, 210, 295, 919` (the IMPLICIT_LOCKED_DECK_ID pattern; the `createImplicitLockedDeck` factory; the `runtimeDecks` injection point; the `isMainDeck` check)
- `packages/cli/src/device/registry.ts` (phase 53 — `setBrightnessAll`)
- 53-CONTEXT.md (decisions about the device registry's role in phase 53)
- 51-CONTEXT.md (decisions about the existing `Text` component, including the className-for-test-marker pattern)

---

*Research complete: 2026-06-08*
*Next: plan-phase 54*
