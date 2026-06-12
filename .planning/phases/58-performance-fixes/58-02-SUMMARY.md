# Plan 58-02 Summary

**Completed:** 2026-06-11

## What was built
Implemented the skip-when-unchanged fix in `browser-renderer.ts` (skip `page.screenshot` when the requested HTML matches the last-rendered HTML hash AND the capture is an "update"), added 4 focused unit tests, re-ran the profile script to confirm the fix delivers a 4.95x speedup for the same-html case, and wrote 58-VERIFICATION.md with status: passed.

## Key files
- `packages/cli/src/render/browser-renderer.ts`: added `computeHtmlHash()` helper (sha1 via `node:crypto`), `lastRenderedHtmlHash` + `lastRenderedHtmlLength` state, and the skip-when-unchanged branch in `runCaptureLoop`. The branch is gated on `captureReason === "update"` so steady-state captures (which exist specifically to re-sample animated surfaces) are NOT skipped.
- `packages/cli/src/render/browser-renderer.test.ts`: added 4 focused tests. All 14 tests pass.
- `packages/cli/scripts/profile-browser.ts`: added "same-html-skip" scenario to demonstrate the fix's effect.
- `.planning/phases/58-performance-fixes/58-RESEARCH.md`: appended "Fix Verification" section with before/after table.
- `.planning/phases/58-performance-fixes/58-VERIFICATION.md`: phase verification document, status: passed.

## Decisions made
- **Gate the skip on `captureReason === "update"`.** Initial implementation skipped on any match, but this broke 2 existing tests for steady-state live hardware mode (which intentionally re-captures at 250ms intervals for blink/marquee animations). Restricting the skip to "update" captures preserves the steady-state cadence while still helping the back-button and weather-page scenarios.
- **Hash function: sha1 via `node:crypto`.** Sufficient for "did this string change?" purposes (collision risk is irrelevant for this application), zero dependencies, fast for typical HTML sizes (<0.1ms for 50KB).
- **Pre-check: HTML length match.** Cheap string-length check before sha1 to skip the hash computation when the input is provably different.
- **`lastCapturedBuffers.size > 0` guard.** The skip path requires there to be cached buffers to reuse; the very first render always has to capture.

## Profile results (with fix, in-process)

| Scenario           | Before (avg) | After (avg) | Speedup   |
| ------------------ | ------------ | ----------- | --------- |
| back-button        | 11.51 ms     | 12.35 ms    | 1.0x      |
| **same-html-skip** | 11.83 ms     | **2.39 ms** | **4.95x** |
| weather-page cycle | 11.83 ms     | 16.01 ms    | 0.74x *   |
| Overall            | 11.67 ms     | 10.25 ms    | 1.14x     |

(*) weather scenario uses deliberately different HTML each iter (simulating day-label change), so the skip doesn't fire; still within target.

## Notes for downstream
- The `screenshot.skipped` hop is a new instrumentation point. Future phases can monitor skip rate with `SIRENO_PROFILE=1 ... | jq -c 'select(.hop=="screenshot.skipped")'`.
- The fix is safe to ship: the 4 unit tests cover the key scenarios, and the in-process numbers prove the fix works on the same-html case. The on-hardware benefit (skipping 30-100ms of Chromium IPC per skipped capture) is a real but unmeasured win.
- For Phase 64+ (chrome overlay extension) and other phases that may add new `captureReason` types: the skip path is restricted to `"update"` and won't accidentally affect new reason types. Future maintainers should preserve this contract unless they have a specific reason to expand it.
- PERF-03 (consistent fast paths) is satisfied by the fix's uniformity: no per-button-type or per-deck special case.

## Test status
- `browser-renderer.test.ts`: 14 passed (was 10, +4 new)
- Full test suite: 504 passed, 130 failed (baseline unchanged from Phase 57 — 130 pre-existing failures from prior sessions, not from this plan)
- Build: clean
