---
wave: 1
depends_on: []
---

# Phase 4 Plan 1: Brightness Backend + Progress Surface

## Goal
Make the Stream Deck brightness controllable in the runtime and render a reusable progress surface on the emulator, so tapping a brightness button shows the new brightness value.

## Must-Haves
- Runtime exposes `setBrightness` / `getBrightness` and emits `sireno:settings:brightness`.
- `Methods.adjustBrightness` clamps 0-100 and steps by ±10.
- Emulator initializes brightness to 100 and updates when `adjustBrightness` is called.
- `IconLabelProgressSurface` is created, registered, and shows/hides progress with a 2-second timeout.
- `pnpm typecheck` and new tests pass.

## Task 1.1: Add brightness state and adjust method
- **Files:** `packages/cli/src/deck/runtime.ts`, `packages/cli/src/deck/methods.ts`, `packages/cli/src/deck/__tests__/runtime.test.ts`, `packages/cli/src/deck/__tests__/methods.test.ts`
- **Action:** Add `setBrightness` / `getBrightness` to runtime. Emit `sireno:settings:brightness` on change. Add `Methods.adjustBrightness({ direction: "up" | "down" })` that clamps 0-100 and steps ±10.
- **Verify:** Runtime test checks get/set and pub/sub event. Methods test checks up/down and clamping.
- **Done:** [ ]

## Task 1.2: Create and register `IconLabelProgressSurface`
- **Files:** `packages/cli/src/ui/surfaces/IconLabelProgressSurface.tsx`, `packages/cli/src/ui/surfaces/index.ts`, `packages/cli/src/ui/surfaces/__tests__/IconLabelProgressSurface.test.tsx` (create)
- **Action:** Create surface with props `{ icon, label, progress, visible }`. Render icon, label, and progress bar. When `visible` becomes true, set an internal 2-second timeout to hide the progress bar; reset the timeout if `visible` changes while already visible. Register in the surface registry.
- **Verify:** Surface test checks progress bar renders when visible, hides after 2 seconds, and resets timeout on re-tap. Registry resolves the surface.
- **Done:** [ ]

## Task 1.3: Wire emulator and verify end-to-end
- **Files:** `packages/cli/src/outputClient/emulator.ts`, `packages/cli/src/cli/commands/run.ts` (temporary test deck only if needed)
- **Action:** Ensure methods receive the runtime. Initialize runtime brightness to 100 on emulator start. Add a temporary two-button deck in the emulator that dispatches `adjustBrightness` and uses `IconLabelProgressSurface` bound to `sireno:settings:brightness`.
- **Verify:** Manual emulator run: tap brighter/darker, progress bar appears with new brightness and hides after 2 seconds.
- **Done:** [ ]

## Context
See `CONTEXT.md` and `RESEARCH.md` in this directory.
