# Phase 4 Plan 1 SUMMARY — Brightness Backend + Progress Surface

## Status: ✅ DONE

All 3 tasks implemented; tests pass; typecheck clean.

## Task 1.1 — Brightness state + adjustBrightness method ✅
- `packages/cli/src/deck/runtime.ts`: `getBrightness()`/`setBrightness(value)` added to Runtime interface. State initialized to 100. `setBrightness` clamps 0–100 and publishes `sireno:settings:brightness` when value changes.
- `packages/cli/src/deck/methods.ts`: `adjustBrightness({ direction: "up" | "down" })` stepping ±10. `dispatch` routes `brightness://up` / `brightness://down`.
- Tests: `runtime.test.ts` (brightness describe block) and `methods.test.ts` (3 new tests) all green.

## Task 1.2 — IconLabelProgressSurface ✅
- New: `packages/cli/src/ui/surfaces/IconLabelProgressSurface.tsx`
  - Props: `{ source, label, progress, visible, visibleMs? }`. Defaults: `visibleMs = 2000`.
  - `useEffect` deps: `[visible, visibleMs, progress]` — **progress is in deps so each tap that updates the value resets the hide timer** (otherwise identical re-renders would not reset the timer).
  - Data attrs on root: `data-sireno-surface="icon-label-progress"`, `data-visible={shown ? "true" : "false"}`, `data-progress={clampedProgress}`.
  - Progress bar block-level with width % when `shown`.
- `packages/cli/src/ui/surfaces/index.ts`: re-export added.
- `packages/cli/src/ui/theme-presentation.tsx`: registered `surfaces.iconLabelProgress`.

## Task 1.3 — Temporary test deck + emulator wiring + surface test ✅
- `packages/cli/src/builtin-addons/internal-settings/decks/settings.ts`: added 2 test buttons at positions 3, 4:
  - `test:brightness-up` with `actions.tap: "brightness://up"` (label "Brighter")
  - `test:brightness-down` with `actions.tap: "brightness://down"` (label "Darker")
  - Existing buttons (brightness/theme/about) untouched.
- `packages/cli/src/outputClient/emulator.ts`: after stdio block, `opts.runtime.setBrightness(opts.runtime.getBrightness())` to publish initial brightness 100 to the `sireno:settings:brightness` channel.
- Created `packages/cli/src/ui/surfaces/__tests__/IconLabelProgressSurface.test.tsx`:
  - 3 tests: hides by default, shows+hides via visibleMs, resets timer on progress change.
  - Requires `/** @vitest-environment jsdom */` directive.

## Verification
- Targeted tests (runtime/methods/surface): **69 passed / 69 total**, 0 failed.
- `pnpm typecheck`: ✅ no errors.

## Files changed (PLAN-1)
- `packages/cli/src/deck/runtime.ts`
- `packages/cli/src/deck/methods.ts`
- `packages/cli/src/deck/__tests__/runtime.test.ts`
- `packages/cli/src/deck/__tests__/methods.test.ts`
- `packages/cli/src/ui/surfaces/IconLabelProgressSurface.tsx` (new)
- `packages/cli/src/ui/surfaces/index.ts`
- `packages/cli/src/ui/theme-presentation.tsx`
- `packages/cli/src/ui/surfaces/__tests__/IconLabelProgressSurface.test.tsx` (new)
- `packages/cli/src/builtin-addons/internal-settings/decks/settings.ts`
- `packages/cli/src/outputClient/emulator.ts`

## Next: PLAN-2
Run `/next` to begin PLAN-2.
