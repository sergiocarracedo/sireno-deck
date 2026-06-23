---
phase: 06-hardware
plan: 06-02
wave: 1
depends_on: [06-01-PLAN]
files_created:
  - packages/cli/src/render/buffer-hash.ts
  - packages/cli/src/render/buffer-hash.test.ts
  - packages/cli/src/render/screenshot-cadence.ts
  - packages/cli/src/render/screenshot-cadence.test.ts
  - packages/cli/src/render/browser-renderer.ts
  - packages/cli/src/render/browser-renderer.test.ts
  - packages/cli/src/render/index.ts
files_modified:
  - packages/cli/src/device/registry.ts
  - packages/cli/src/device/registry.test.ts
  - packages/cli/src/device/stream-deck.ts
  - packages/cli/src/device/stream-deck.test.ts
  - .gitignore
autonomous: true
---

# Phase 06 Plan 02 — Browser renderer + screenshot cadence + SDK API fixup

## What was built

- `render/buffer-hash.ts` — `BufferChangeTracker` per-key with sha1[:16] hash comparison. Skips write when buffer unchanged.
- `render/screenshot-cadence.ts` — `CadenceTimer` (interval-based) + `EventDebouncer` (debounce-based). Both shared between `BrowserRenderer`.
- `render/browser-renderer.ts` — Playwright + sharp pipeline. Hybrid trigger: timer (default 500ms) + pub-sub events (`runtime:activeDeck`, `runtime:invalidate`) debounced to 50ms. Each tick: `page.screenshot()` → `sharp.extract` per key → `BufferChangeTracker.update` skip-or-write → `device.fillKeyBuffer`.
- `render/index.ts` — barrel re-exporting the renderer APIs.
- Fixed SDK API drift from Phase 06-01: `listOpenStreamDecks` → `listStreamDecks`; `StreamDeckDeviceInfo` (model/path/serialNumber) vs `StreamDeck` handle (MODEL/CONTROLS). Dropped `keyCount` from `DeviceDescriptor` (only available after `openStreamDeck`).
- `.gitignore` updated to include `*.tsbuildinfo`.

## Tests added (24)

- `buffer-hash.test.ts` (5): first update returns true; second identical returns false; different buffers return true; per-key isolation.
- `screenshot-cadence.test.ts` (6): `CadenceTimer` schedules first tick after intervalMs; no overlap; stop() cancels; `EventDebouncer` trigger schedules flush; coalesces multiple triggers; dispose cancels.
- `browser-renderer.test.ts` (6): launches chromium + context + page + goto on start; tick screenshots; screenshot failure skips write; stop() closes page + context + browser; subscribes to `runtime:activeDeck`; subscribes to `runtime:invalidate`.
- `registry.test.ts` (+2): model enum as descriptor.model; missing serialNumber → empty string.
- `stream-deck.test.ts` (+7): friendly model name from `getStreamDeckModelName`; selects by path; selects by model; throws when no selector matches; `openStreamDeck` called with selected info's path; `setBrightness`/`fillKeyBuffer`/`close` forwards to handle.

## Must-haves status

- [x] `render/buffer-hash.ts` exports `BufferChangeTracker`
- [x] `render/screenshot-cadence.ts` exports `CadenceTimer` + `EventDebouncer`
- [x] `render/browser-renderer.ts` integrates both + playwright + sharp
- [x] Hyphen-trigger via pub-sub (`runtime:activeDeck`, `runtime:invalidate`)
- [x] Skip write when buffer hash unchanged
- [x] SDK API correctly uses `listStreamDecks` + `StreamDeckDeviceInfo`
- [x] All 24 new tests pass; total 271 (was 247)
- [x] typecheck clean, lint clean, format clean

## Notes

- `BufferChangeTracker` uses sha1 first 16 hex chars as the cache key. Truncation is safe for our use case (we only need equality, not crypto); full sha1 is overkill.
- `CadenceTimer` does NOT overlap — each tick awaits the previous callback (via `result.then(follow)` pattern) before scheduling the next.
- `EventDebouncer` uses `setTimeout` (not lodash) — minimal, no deps.
- `DeviceDescriptor` dropped `keyCount` because `listStreamDecks()` returns `StreamDeckDeviceInfo[]` without the `CONTROLS` array. The selection prompt only needs model/path/serial. After `connectStreamDeck`, `getKeyCount()` works on the open handle.
- `getStreamDeckModelName(DeviceModelId)` is now the source of truth for the friendly model name (replacing direct `handle.MODEL` which is the enum string).
