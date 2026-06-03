# Plan 35-01 Summary

## What Built

- Extended `packages/cli/src/render/browser-renderer.ts` with renderer-owned live hardware mode: `liveHardwareMode` option, `BrowserRendererFrame`/`BrowserRendererFrameHandler` types, `setFrameHandler(...)` method, and a `LIVE_HARDWARE_CAPTURE_INTERVAL_MS = 250` constant.
- Rewired `runCaptureLoop()` to keep running after `renderedVersion` catches `latestVersion` in live hardware mode, producing steady-state recaptures from the same mounted page without re-running `renderPageHtml(...)`.
- Added `writeBrowserRendererFrame(...)` helper and plumbed it through `startDaemon(...)` so later renderer frames reach the physical device through the existing per-key deduped `writeKeyBuffer(...)` seam.
- Guarded `ensureBrowserRenderer(...)` to only call `setFrameHandler(...)` when a frame handler is actually provided, keeping emulator sessions on the HTML-push-only contract.
- Added focused regressions: browser-renderer test proves steady-state recaptures never call `goto(...)` or `setContent(...)` again, and start test proves later steady-state frames reach hardware without a second `updateDeck(...)` call.

## Verification

- `pnpm --filter sireno-deck-cli exec vitest run src/render/browser-renderer.test.ts` — 9 passed
- `pnpm --filter sireno-deck-cli exec vitest run src/cli/commands/start.test.ts` — 33 passed (3 pre-existing config/icon drift failures)

## Commits

- `a7b099d` `feat(35-01): keep browser renderer live on hardware`
- `761fe8c` `feat(35-01): wire hardware daemon onto live renderer frame seam`

## Notes

- The renderer owns the steady-state loop; `start.ts` stays thin. Emulator mode is not widened.
- Steady-state recaptures use the already-mounted page screenshot, not `renderPageHtml(...)`, so CSS animation timelines continue naturally.
- Per-key deduped writes through `writeKeyBuffer(...)` remain the sole hardware transport strategy.
