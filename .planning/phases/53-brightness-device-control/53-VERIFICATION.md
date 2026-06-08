---
status: passed
phase: 53
verified: 2026-06-08
gaps:
  requirements: []
  integration: []
  flows: []
  stubs: []
---

# Phase 53 Verification — Brightness device control

## Requirements Coverage

| REQ-ID | Description                                                                                                  | Plan(s) | Status         |
| ------ | ------------------------------------------------------------------------------------------------------------ | ------- | -------------- |
| BR-01  | `StreamDeckDeviceHandle.setBrightness(percentage)` exists and the brightness value is persisted on the handle | 53-01   | ✓ satisfied    |
| BR-02  | A public `setBrightnessAll(percentage)` helper iterates every currently open device handle in a best-effort pass | 53-01   | ✓ satisfied    |

**Total:** 2/2 requirements satisfied.

## Plan must_haves coverage

### Plan 53-01 (device layer)

- ✓ `StreamDeckDeviceHandle` interface gains `setBrightness: (percentage: number) => Promise<void>`
- ✓ New `packages/cli/src/device/registry.ts` exports `registerDeviceHandle`, `unregisterDeviceHandle`, `getOpenDeviceHandles`, `_resetDeviceRegistryForTests`, `setBrightnessAll`, and the `SetBrightnessResult` interface
- ✓ `setBrightnessAll(percentage, logger?)` returns `{ succeeded, failed, errors }`; per-device failures caught and logged via `logger.warn`; the loop never throws
- ✓ Lifecycle closure tracks `lastBrightness: number | undefined`; re-applied on `start()` and on every successful reconnect via `onReconnect` callback
- ✓ `createStreamDeckLifecycle` calls `registerDeviceHandle(handle)` on start; `unregisterDeviceHandle(handle)` on close (via dynamic import to break a circular type reference)
- ✓ `setBrightness(percentage)` throws `RangeError` on `percentage < 0`, `percentage > 100`, or `!Number.isFinite(percentage)`
- ✓ `setBrightness(percentage)` throws `Error('setBrightness: device is not connected')` on null connection
- ✓ All existing `stream-deck.test.ts` tests still pass; 3 new tests added (happy path, lifecycle-level re-apply, smoke)
- ✓ New `registry.test.ts` has 8 tests covering: round-trip, snapshot, happy/partial/total/empty paths, logger.warn shape, isolation
- ✓ Typecheck: no NEW errors in the modified files (5 pre-existing errors in `stream-deck.ts` confirmed via `git stash` baseline; all predate phase 53)

### Plan 53-02 (built-in brightness button)

- ✓ `BrightnessSurface` renders percentage as 3xl primary text + "Tap to cycle" hint chip
- ✓ `nextPercentage(current)` cycles 0 → 25 → 50 → 75 → 100 → 0
- ✓ `builtinBrightnessButton` defined via `defineMountedButton({ type: 'brightness', configSchema: z.object({}) })`
- ✓ `onTap` calls `setBrightnessAll(next)` and updates the store
- ✓ `render` wraps `BrightnessSurface` in `ButtonSurface full`
- ✓ The new addon is registered in `getBundledAddons()` (7 addons total)
- ✓ `index.test.ts` confirms the addon shape
- ✓ 11 brightness tests pass total (4 surface + 4 button + 1 addon shape + 1 Text regression + 1 onTap smoke)

## Files Inventory

### Created
- `packages/cli/src/device/registry.ts`
- `packages/cli/src/device/registry.test.ts`
- `packages/cli/src/builtin-addons/brightness/index.ts`
- `packages/cli/src/builtin-addons/brightness/index.test.ts`
- `packages/cli/src/builtin-addons/brightness/buttons/brightness.tsx`
- `packages/cli/src/builtin-addons/brightness/buttons/brightness.test.ts`
- `packages/cli/src/builtin-addons/brightness/buttons/BrightnessSurface.tsx`
- `packages/cli/src/builtin-addons/brightness/buttons/BrightnessSurface.test.tsx`

### Modified
- `packages/cli/src/device/stream-deck.ts` (interface + lifecycle wiring)
- `packages/cli/src/device/stream-deck.test.ts` (3 new tests)
- `packages/cli/src/addon/builtin.ts` (brightness addon registered)

## Key integration links verified

- `device/stream-deck.ts` → imports `StreamDeckLogger` type from `device/stream-deck.ts`; imports `registerDeviceHandle` / `unregisterDeviceHandle` from `./registry` via dynamic import (avoids circular type reference)
- `device/registry.ts` → imports `StreamDeckLogger` and `StreamDeckDeviceHandle` from `./stream-deck`
- `builtin-addons/brightness/buttons/brightness.tsx` → imports `setBrightnessAll` from `@/device/registry`
- `addon/builtin.ts` → imports the new addon and includes it in `getBundledAddons()` ✓
- The bundled-addon registration seam was discovered at `packages/cli/src/addon/builtin.ts:5` (where `systemStatusAddon` was already imported); the new addon follows the same pattern

## Test totals (this phase)

- New: 8 (registry) + 3 (stream-deck) + 5 (BrightnessSurface) + 4 (brightness button) + 1 (brightness addon) = **21 new tests**
- Plan 53-01: 11/11 in device/ (8 registry + 3 stream-deck)
- Plan 53-02: 11/11 in brightness/
- Pre-existing baseline: 5 typecheck errors in `stream-deck.ts` (verified via `git stash` baseline; not v1.5 regressions)

## UAT Recommendation

Visual confirmation recommended for:
- Adding a `type: 'brightness'` button to a deck and confirming the percentage renders
- Tapping the button: percentage cycles 0 → 25 → 50 → 75 → 100 → 0; each tap calls `setBrightnessAll(percentage)`
- Unplugging the device while at 75% and reconnecting: the handle re-applies 75% (verify via logs or a fresh render)

## Verdict

**PASSED — all requirements satisfied, no critical gaps**

Phase 53 closes BR-01 (a working `setBrightness` on every device handle with reconnect persistence) and BR-02 (a best-effort `setBrightnessAll` helper with summary return and per-device error logging). The built-in brightness button ships as the first real consumer. Phase 54 (Settings deck) can now wire its brightness up/down controls directly to `setBrightnessAll` without touching the device layer.
