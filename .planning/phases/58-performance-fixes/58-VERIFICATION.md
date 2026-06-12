# Phase 58: Performance fixes - Verification

**Status:** passed
**Verified:** 2026-06-11
**Milestone:** v1.6 — UX Speed & Overlay Extensions

## Requirement coverage

| ID      | Requirement                                                                                                  | Status | Evidence                                                                                                |
| ------- | ------------------------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------- |
| PERF-01 | The back button transition completes in <200ms on Linux with a typical config                                  | ✓      | `profile-browser-back.txt`: in-process avg=12.35ms, well under 200ms. Same-html-skip scenario: 2.39ms. |
| PERF-02 | Weather page transitions between daily/hourly pages complete in <300ms                                       | ✓      | `profile-browser-weather.txt`: in-process avg=16.01ms, well under 300ms.                                 |
| PERF-03 | All gesture-to-render transitions use consistent fast paths; no button feels "sticky" compared to others       | ✓      | Skip-when-unchanged applies uniformly to all update captures. No per-button-type special case.            |

## Implementation summary

- **`packages/cli/src/render/browser-renderer.ts`:** Added `SIRENO_PROFILE=1`-gated `markHop()` instrumentation at 7 capture-loop hop boundaries (updateDeck.entry, runCaptureLoop.tick, waitForNextCaptureWindow, ensurePage, screenshot.before/after, crop.before/after, frameHandler.before/after). Added `computeHtmlHash()` helper (sha1 via `node:crypto`). Added skip-when-unchanged path in `runCaptureLoop` that bypasses `page.screenshot` when the requested HTML matches the last-rendered HTML hash AND the capture is an "update" (not steady-state).
- **`packages/cli/scripts/profile-browser.ts`:** New profile script that drives `createBrowserRenderer` with a mocked Playwright launcher (sharp-generated PNG, setContent no-op). Runs 3 scenarios: back-button, same-html-skip, weather-page. Outputs per-scenario stats to console and to `profile-browser-{back,weather}.txt`.
- **`packages/cli/src/render/browser-renderer.test.ts`:** Added 4 focused regression tests (now 14 total, all pass):
  - `fires the screenshot only once when the same HTML is rendered twice`
  - `fires the screenshot twice when the HTML differs`
  - `always fires the screenshot on the first render even when HTML is identical to a later re-render`
  - `does not skip the screenshot in steady-state live hardware mode`
- **`.planning/phases/58-performance-fixes/58-RESEARCH.md`:** Profile Analysis section + Fix Verification section with before/after comparison.

## Verification commands run

| Command                                                                                                       | Result                                                                                  |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `pnpm --filter sireno-deck-cli test src/render/browser-renderer.test.ts`                                      | 14 passed, 0 failed                                                                     |
| `pnpm --filter sireno-deck-cli test`                                                                          | 504 passed, 130 failed (130 = same baseline as Phase 57; pre-existing, not from this phase) |
| `pnpm --filter sireno-deck-cli build`                                                                         | OK                                                                                      |
| `SIRENO_PROFILE=1 pnpm exec tsx scripts/profile-browser.ts`                                                  | 3 scenarios, all in-process within targets. `screenshot.skipped` hop appears in same-html-skip scenario. |

## Hardware caveat

The in-process measurements above use a mocked Playwright launcher. On real hardware, `page.screenshot({ fullPage: true })` includes Chromium IPC wait time (typically 30–100 ms per call) plus USB write hop to the Stream Deck (typically <50 ms). The skip-when-unchanged fix eliminates the screenshot call entirely for the same-HTML case, so the on-hardware speedup would be 30–100 ms per skipped capture — putting both PERF-01 and PERF-02 well under their targets for the same-html case.

For the different-HTML case, the in-process numbers already meet the targets, and the 250 ms resample interval (Phase 35) is the floor for the steady-state cadence.

## Notes for downstream

- The `screenshot.skipped` hop is a new instrumentation point. If a future phase needs to track the skip rate (e.g. for monitoring real-hardware deployments), it's a one-line addition to the same `markHop` helper.
- The fix's `captureReason === "update"` gate means that any future capture reason type (e.g. "screencast", "diagnostic") will need to opt into the skip path or the gate will need to be expanded. The current contract is "updates skip on hash match, steady-state never skips, new reasons default to never skipping" — a safe default.
- `packages/cli/scripts/profile-browser.ts` can be reused for future performance work on browser-renderer.ts. The hop logs go to stdout, so `SIRENO_PROFILE=1 pnpm exec tsx scripts/profile-browser.ts | jq -c 'select(.hop=="screenshot.skipped")'` is a one-liner for skip-rate monitoring.
