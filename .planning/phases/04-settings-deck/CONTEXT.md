# Phase 4 Context — Settings Deck

## Goal

Add an internal settings deck, reachable from the main system settings button, that controls Stream Deck screen brightness and shows app info.

## Decisions

1. **Brightness target:** Stream Deck device brightness, not monitor brightness. Real device sends a brightness command to the Stream Deck; emulator stores a brightness value.
2. **Emulator brightness state:** Runtime state + pub/sub channel (`sireno:settings:brightness`). Real device sends hardware command and does not need runtime state.
3. **Progress surface:** Show progress bar on tap and auto-hide after a timeout (default 2 seconds). The surface is reusable and accepts icon, label, progress value, and visibility.
4. **App logo/version:** Use a built-in icon and show the app version from `package.json`.

## Scope

- Extract reusable `IconLabelProgressSurface` in `packages/cli/src/ui/surfaces/`.
- Create or extend internal settings deck in `packages/cli/src/builtin-addons/internal-settings/`.
- Wire system settings button in `packages/cli/src/builtin-addons/core/` to navigate to settings deck.
- Extend `OutputClient` interface to support device brightness commands in `packages/cli/src/outputClient/real.ts` and `emulator.ts`.
- Add tests for the progress surface, settings deck wiring, and brightness output client.

## Non-Goals

- Monitor brightness control (out of scope; existing monitor brightness provider remains untouched).
- Theme-level app logo asset (use built-in icon).
- Persistent brightness across restarts (runtime state only).

## Verification

- System settings button navigates to internal settings deck.
- Brighter/darker buttons change brightness and show progress bar on tap.
- App info button shows logo + version.
- Both emulator and real mode brightness commands work.
- `pnpm typecheck` and targeted tests pass.
