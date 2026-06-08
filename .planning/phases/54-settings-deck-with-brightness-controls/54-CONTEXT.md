# Phase 54 CONTEXT — Settings deck with brightness controls

**Phase:** 54 — Settings deck with brightness controls
**Discussed:** 2026-06-08
**Status:** locked — proceed to plan-phase 54

## Domain

The settings deck is a new core-managed deck (NOT a built-in addon — the user clarified this is part of the core). It provides brightness up/down controls and shows the project logo + CLI version (the v1.4 quick 037 main-deck role). The main deck's reserved slot becomes a settings button that navigates to this new deck; the settings deck's own reserved slot is a back-to-main button.

This is a deliberate breaking change from v1.4 quick 037 (which put the logo+version on the main deck's reserved slot). The settings deck is now the canonical home for that visual; the main deck's reserved slot is a settings affordance.

## Locked decisions

### Settings deck is core-managed, not a built-in addon

The settings deck is part of the core deck layer (`packages/cli/src/deck/`), not a built-in addon registered in `getBundledAddons()`. Rationale: the v1.5 prompt explicitly says the settings deck holds the logo+version that "is in the main deck now" and replaces the main-deck reserved slot — this is a core-deck-system concern, not an addon concern. A core-managed deck:

- Exists in the deck controller's stack from startup (like the main and lock decks).
- Has its own reserved-slot behavior (logo+version on the settings deck, settings-button on the main deck).
- Is rendered by the core deck-render pipeline, not by an addon's `render` callback.

The new built-in `brightness` addon (phase 53) is unrelated to this; the settings deck's brightness up/down is a core-rendered affordance that calls `setBrightnessAll(percentage)` from the device registry.

### Logo+version moves to core

The logo+version surface (currently in `packages/cli/src/deck/system-back-button.tsx` lines 8-17 — `LOGO_DATA_URL` and `CLI_VERSION`) is moved to a shared core element at `packages/cli/src/ui/LogoVersion.tsx`. The system-back-button's `isMainDeck` branch imports it. The new core-managed settings deck imports it for the logo+version tile.

This is a small, contained refactor: the data reads (`readFileSync` of `logo72x72.png` and `package.json`) move to the new file; both consumers import the element.

### Main deck reserved slot is always a settings button

The main deck's reserved slot is unconditionally replaced by a settings button that navigates to the `settings` deck. There is no config-gated opt-out. The v1.4 logo+version behavior on the main deck is gone.

When the user has no `settings` deck configured (e.g. older config files that don't reference one), the system back-button injection still skips the reserved slot for the main deck (existing behavior: `isMainDeck` branch shows logo+version). For v1.5, the core ensures a default `settings` deck exists in the runtime's deck map so the settings button always has a target.

The settings button is a `navigate-deck`-style button: tap → `controller.navigateTo('settings', { push: true })`. The current `system-back-button` reserved-slot logic is updated: the main-deck branch no longer renders logo+version (it now renders a settings icon + "Settings" text that calls `navigateTo('settings')`).

### Brightness up/down uses 10% steps

The settings deck renders two buttons: brightness-up and brightness-down. Each tap adjusts by 10 percentage points, clamped to `[0, 100]`. Both call `setBrightnessAll(percentage)` from the device registry.

- Brightness-up: `next = min(100, current + 10)`
- Brightness-down: `next = max(0, current - 10)`

The settings deck's brightness state lives in the runtime's device-registry-aware state. The initial value is whatever the most-recent `setBrightnessAll` call set, or 50% as a sane default.

The settings deck also shows the current brightness percentage as a small label between the up/down buttons (e.g. "75%"), so the user has feedback.

### Settings deck back button is the standard chevron+Back

The settings deck's reserved slot uses the standard system-injected back button (`isMainDeck: false` branch of `SystemBackButton`): chevron-left + "Back" text. Tap → `goBack()`. The settings deck is just a subdeck; the existing back button works.

## Specifics

### File-level changes

1. **`packages/cli/src/ui/LogoVersion.tsx` (NEW)** — the shared logo+version element. Reads the PNG and package.json at module load. Exports `<LogoVersion />` (a JSX element) and possibly `LOGO_DATA_URL` / `CLI_VERSION` named exports for tests.
2. **`packages/cli/src/deck/system-back-button.tsx` (MODIFY)** — import `LogoVersion` from `@/ui/LogoVersion`. Replace the inline `<img>` + `<Text>v{CLI_VERSION}</Text>` with `<LogoVersion />`. The `isMainDeck` branch still shows the logo+version; the back-button branch is unchanged.
3. **`packages/cli/src/deck/system-back-button.tsx` (FURTHER MODIFY for settings)** — when on the main deck, render a "Settings" affordance (icon + "Settings" text) that calls `navigateTo('settings')`. The `isMainDeck` branch now has TWO sub-renders:
   - If the user has a `settings` deck → show "Settings" button.
   - Else → fall back to logo+version (backwards compat for old configs that don't define a settings deck).
4. **`packages/cli/src/deck/settings-deck.ts` (NEW)** — the core settings deck definition. Contains:
   - The deck config (a 6-key or 8-key grid with: brightness-up, brightness-down, current-brightness-label, logo+version, [reserved slot for back button]).
   - The `getSettingsDeckRender(deps)` function: takes a host context + the device-registry brightness getter, returns the JSX for the settings deck's buttons. Calls `setBrightnessAll(percentage)` on tap.
5. **`packages/cli/src/deck/deck-orchestrator.ts` (MODIFY)** or equivalent — register the settings deck with the controller at startup. The `main_deck` is already special-cased; add `settings_deck` as another "core-managed" deck that the controller knows about. (Discovered during planning; the exact file is whatever the runtime uses to set up the deck stack.)
6. **`packages/cli/src/ui/LogoVersion.test.tsx` (NEW)** — surface test.
7. **`packages/cli/src/deck/settings-deck.test.ts` (NEW)** — settings deck render + tap behavior tests.

### Wave plan

- **Plan 54-01 (wave 1):** Core — extract `LogoVersion` to `@/ui/LogoVersion`, refactor `system-back-button.tsx` to import it, add the settings-button affordance to the main-deck branch. Tracer bullet: the main-deck reserved slot now shows "Settings" + navigates to the settings deck (when a settings deck exists).
- **Plan 54-02 (wave 2, depends on 54-01):** Settings deck — core-managed deck with brightness up/down + logo+version + back-button reserved slot. Render and tap behavior. Tracer bullet: tap brightness-up → 10% step → `setBrightnessAll` called with new value; the on-screen label updates.

## Canonical refs

- `packages/cli/src/deck/system-back-button.tsx` (lines 8-17 — the data reads; lines 27-43 — the `isMainDeck` render branch; lines 45-59 — the back-button branch).
- `packages/cli/src/device/registry.ts` (phase 53 — `setBrightnessAll`).
- `packages/cli/src/addon/builtin.ts` (do NOT add the settings deck here — it's core-managed).
- `packages/cli/src/builtin-addons/brightness/` (phase 53 — the standalone `brightness` button addon; unrelated to the settings deck's up/down affordance).

## Existing code insights

### Reusable assets

- `setBrightnessAll(percentage, logger?)` from `packages/cli/src/device/registry.ts` (phase 53) — the settings deck calls this directly.
- `defineMountedButton` is not used here (the settings deck is core-managed, not an addon).
- `ButtonSurface` is the standard surface wrapper — used by all buttons.

### Established patterns

- The "core-managed deck" pattern is already established for `main` and `lock` decks. Adding `settings` follows the same pattern (deck config in the runtime's deck map, reserved slot logic in `system-back-button`).
- Logo+version follows the v1.4 quick 037 implementation (PNG base64 + version string) — no redesign.
- The brightness-button addon (phase 53) is a separate concern (standalone button) and is NOT consumed by the settings deck. The settings deck has its own up/down affordance.

### Integration points

- The settings deck's brightness up/down buttons are part of the settings deck's render output, not standalone addon buttons. They live in the deck-render code path, not in the addon API.
- The system-back-button's main-deck branch needs to know whether a settings deck is configured. The orchestrator can pass a `hasSettingsDeck: boolean` flag into the system-back-button's render, or the system-back-button can call into the deck controller to ask. (Discovered during planning; the simpler seam is to pass a flag.)

## Verification anchors

- A test asserts that `<LogoVersion />` renders an `<img>` with the logo data URL and a `<Text>` with the CLI version.
- A test asserts that `system-back-button.tsx` for `isMainDeck: true` renders a "Settings" affordance (icon + text) when a settings deck is configured, and falls back to logo+version otherwise.
- A test asserts that tapping the main-deck reserved-slot button (settings) calls `navigateTo('settings')`.
- A test asserts that the settings deck's brightness-up tap calls `setBrightnessAll(60)` from a starting state of 50%.
- A test asserts that the settings deck's brightness-down tap clamps at 0 (i.e. starting from 0, brightness-down is a no-op; the displayed value stays at 0).
- A test asserts that the settings deck's reserved-slot button is the standard back button (chevron + "Back").

## Deferred ideas (out of scope for phase 54)

- **Brightness slider (continuous)** — a 0-100 slider is a different UI affordance; the up/down buttons are a starting point. A future phase could add a slider.
- **Settings deck for language / theme picker** — the v1.5 prompt mentions nothing about this; out of scope. If added later, the settings deck's structure is now in place.
- **Settings deck for addon enable/disable** — also out of scope.
- **An auto-brightness policy** (e.g. dim at night) — out of scope per the v1.5 plan.
- **A "sireno info" page** that shows full version + dependency versions + git SHA — out of scope; logo+version is the minimum viable info.
- **A settings gear icon on the main-deck reserved slot** (vs the current "Settings" text) — a small visual upgrade; the current design is functional.

---

*CONTEXT locked: 2026-06-08*
*Next: plan-phase 54*
