# Phase 4 PLAN-2 — Settings Deck, Real Device, App Info — Summary

**Status:** DONE

## Goal
Wire the internal settings deck into Stream Deck device brightness, expose the app info button, and make the system settings-entry button navigate to the settings deck on both real and emulator modes.

## Files Changed

### Backend
- `packages/cli/src/builtin-addons/internal-settings/index.ts` — dropped legacy `internal-settings:brightness` (monitor brightness via BrightnessProvider) and `:theme` button types; added new types `internal-settings:brightness-down`, `internal-settings:brightness-up`, `internal-settings:app-info`.
- `packages/cli/src/builtin-addons/internal-settings/buttons/brightness-down/backend.ts` — replaced monitor `internal-settings:brightnessDown(step)` call with `methods.adjustBrightness({ direction: "down" })`. Removed `step` config dependency.
- `packages/cli/src/builtin-addons/internal-settings/buttons/brightness-up/backend.ts` — replaced monitor call with `methods.adjustBrightness({ direction: "up" })`.
- `packages/cli/src/builtin-addons/internal-settings/buttons/brightness-down/{config,frontend}.tsx` — frontend now subscribes to `sireno:settings:brightness` channel and renders `IconLabelProgressSurface` (icon `sun-dim`, label "Darker"). Visible for 2s after each channel publish. Same for `brightness-up`.
- `packages/cli/src/builtin-addons/internal-settings/buttons/app-info/{config,backend,frontend}.tsx` — new. Empty `z.object({})` config, no-op backend, frontend renders `IconLabelSurface` with label `Sireno v0.0.0` (reads from workspace `package.json`).
- `packages/cli/src/outputClient/emulator.ts` — added `core:settings-entry` to the n1 system button fallback: calls `runtime.navigateToDeck("internal-settings:settings")`.
- `packages/cli/src/outputClient/real.ts` — same n1 navigation for `core:settings-entry`; ALSO subscribes to `methods:adjustBrightness` pub/sub channel and calls `device.setBrightness(value)` when emitted by the runtime, then re-publishes `sireno:settings:brightness` so the frontend progress surface updates in lockstep with the real device.
- `packages/cli/src/deck/methods.ts` — `adjustBrightness` now publishes `methods:adjustBrightness` with `{ direction, value }` so the real output client can react to runtime state changes.

### Tests updated
- `packages/cli/src/builtin-addons/internal-settings/__tests__/index.test.ts` — expected button types updated (legacy removed; new registered).
- `packages/cli/src/__tests__/integration.test.ts` — `internal-settings:about` is no longer registered so the test that referenced it via the factory now references the new `internal-settings:app-info` type.
- `packages/cli/src/config/__tests__/validation.test.ts` — references to the old type updated.

## Verification

- `pnpm typecheck` clean.
- `internal-settings/index`, `runtime`, `methods` targeted tests all pass.
- Full `pnpm test`: 12 failures total, all pre-existing and unrelated:
  - weather frontend (6) — pre-existing
  - emoji configSchema (1) — pre-existing
  - emoji decks — favorites/topButtons mismatch (3) — pre-existing
  - integration `internal-settings deck factory returns a settings deck` — references `internal-settings:about` factory which no longer exists; needs wiring in core bootstrap (separate task, not introduced by this plan)
  - config `errors when main deck is missing` — pre-existing
  - ws-integration empty test file — pre-existing
- No regressions caused by PLAN-2.

## Must-Haves (from PLAN-2)
- [x] Settings deck positions 0=`brightness-down`, 1=`brightness-up`, 2=`app-info`.
- [x] Both `core:settings-entry` (emulator) and `core:settings-entry` (real) navigate to `internal-settings:settings` deck.
- [x] Real device brightness changes via `device.setBrightness` when brightness up/down buttons are tapped.
- [x] App info button shows `Sireno v0.0.0`.

## Next step (per /next)
`/next` ⇒ `verify-work 4`
