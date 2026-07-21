# Plan 10-01 Summary

**Completed:** 2026-07-21

## What was built
Implemented the legacy startup-splash behavior on real hardware: `OutputHandle.pushRawImage(filePath)` now composites `logoFull.png` on a black background, splits the result into 72×72 raw RGB per-key buffers (matching the live `browser-renderer.ts` pipeline), and calls `device.fillKeyBuffer` for every key. Wired the call into `RealOutputClient.init` immediately after `connectStreamDeck` and before `spawnFrontendVite` so the splash appears on hardware startup. Existing black shutdown (`pushBlackFrame`) preserved unchanged.

## Key files
- `packages/cli/src/render/push-raw-image.ts`: new module — sharp pipeline (load → resize-contain → composite on black → split per key → fillKeyBuffer). Returns silently on missing/failed image; caller can wrap in try/catch.
- `packages/cli/src/render/__tests__/push-raw-image.test.ts`: 3 tests (happy path, missing file, buffer shape).
- `packages/cli/src/outputClient/real.ts`: imported `pushRawImage` and `fileURLToPath`, added the splash call inside `init()` between `connectStreamDeck` and the `spawnFrontendVite` branch, plus a non-fatal `try/catch` around it (matching `pushBlackFrame` style).
- `packages/cli/src/outputClient/types.ts`: unchanged — `OutputHandle.pushRawImage?: (filePath: string) => Promise<void>` was already declared at line 50.

## Decisions made
- **Splash placement:** placed the splash call INSIDE `RealOutputClient.init`, between `connectStreamDeck` (line 102 of real.ts) and the `spawnFrontendVite` block (line 174). The plan's task description suggested adding it to `run.ts` between init calls, but `init` internally calls `spawnFrontendVite` before returning — the correct insertion point is inside `init`, not outside. Documented this as a deviation.
- **KEY_SIZE = 72:** matches the live `browser-renderer.ts:167` pipeline. (Note: `pushBlackFrame` uses 8×8 raw RGB, but the splash is meant to look like the live render so we use 72×72. The black frame on shutdown is a black frame regardless of size.)
- **No copy of logoFull.png:** already bundled at `packages/cli/src/assets/logoFull.png` (291.9K, valid PNG). No cross-repo runtime dependency.

## Deviations
- **Task 05 wiring location:** instead of `run.ts`, the splash call is inside `RealOutputClient.init` between `connectStreamDeck` and `spawnFrontendVite`. The plan's intent (splash before Playwright on hardware only) is satisfied; the exact file/line differs.

## Notes for downstream
- The `pushRawImage` helper is reusable for any "push a single image to the device" use case beyond splash (e.g. test fixtures, debug overlays).
- Pre-existing typecheck errors in `real.ts` (lines 55, 82, 139) are unrelated to this plan and remain.