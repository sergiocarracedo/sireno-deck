---
wave: 2
depends_on:
  - PLAN-1.md
---

# Phase 4 Plan 2: Settings Deck + Real Device + App Info

## Goal
Build the internal settings deck, wire it to the system settings button, make real device brightness work, and add the app info button.

## Must-Haves
- Internal settings deck has darker, lighter, and app-info buttons at positions 0, 1, 2.
- System settings button navigates to the settings deck.
- Real device brightness changes via `device.setBrightness`.
- App info button shows app logo and version from `package.json`.
- Tests and `pnpm typecheck` pass.

## Task 2.1: Create internal settings deck and bind progress
- **Files:** `packages/cli/src/builtin-addons/internal-settings/decks/settings.ts`, `packages/cli/src/builtin-addons/internal-settings/__tests__/settings.test.ts` (create), `packages/cli/src/builtin-addons/internal-settings/frontend.tsx` (if surface binding needs a frontend wrapper)
- **Action:** Define deck with three buttons: brightness-down at 0, brightness-up at 1, app-info at 2. Use `icon-label-progress` surface for brightness buttons bound to `sireno:settings:brightness` so the progress bar shows on tap. Use `icon-label` surface for app-info.
- **Verify:** Settings deck test checks button count, types, positions, and actions. Surface binding test checks progress bar shows on tap.
- **Done:** [ ]

## Task 2.2: Wire navigation and real device brightness
- **Files:** `packages/cli/src/deck/system-buttons/generator.ts` or `packages/cli/src/deck/system-buttons/injection.ts` (exact file to be determined), `packages/cli/src/outputClient/real.ts`, `packages/cli/src/device/stream-deck.ts`
- **Action:** Set the system settings button `target_deck` to `"internal-settings"`. In real output client, implement `adjustBrightness` by calling `device.setBrightness(value)` and publish `sireno:settings:brightness` after change.
- **Verify:** Manual test: real device tap changes brightness; integration test or manual check confirms navigation works.
- **Done:** [ ]

## Task 2.3: App info, tests, and final verification
- **Files:** `packages/cli/src/builtin-addons/internal-settings/decks/settings.ts`, `packages/cli/src/ui/surfaces/__tests__/IconLabelProgressSurface.test.tsx`, `packages/cli/src/deck/__tests__/methods.test.ts`, `packages/cli/src/deck/__tests__/runtime.test.ts`, `packages/cli/src/builtin-addons/internal-settings/__tests__/settings.test.ts`
- **Action:** Set app-info label to `Sireno v{version}` from root `package.json`. Add tests for settings deck, progress surface, and brightness methods. Run `pnpm typecheck` and full `pnpm test`. Remove any temporary emulator test deck from Plan 1.
- **Verify:** All new tests pass; full suite has only pre-existing failures.
- **Done:** [ ]

## Context
See `CONTEXT.md`, `RESEARCH.md`, and `PLAN-1.md` in this directory.
